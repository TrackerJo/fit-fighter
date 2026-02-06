const express = require("express");
const { v4: uuidv4 } = require("uuid");
const db = require("../database");
const { authMiddleware } = require("../middleware/auth");
const { calculateTotalScore } = require("../scoring");
const { subscribe, emit } = require("../events");

const router = express.Router();

// All competition routes require authentication
router.use(authMiddleware);

// ─── Helper: verify two users are friends ───────────────────────────────────
function areFriends(userA, userB) {
    return !!db.findOne(
        "friendships",
        (f) =>
            (f.userA === userA && f.userB === userB) ||
            (f.userA === userB && f.userB === userA)
    );
}

// ─── Send competition request ───────────────────────────────────────────────
router.post("/request", (req, res) => {
    const { friendId } = req.body;

    if (!friendId) {
        return res.status(400).json({ error: "friendId is required" });
    }

    if (friendId === req.userId) {
        return res.status(400).json({ error: "Cannot challenge yourself" });
    }

    if (!areFriends(req.userId, friendId)) {
        return res.status(403).json({ error: "You can only challenge friends" });
    }

    // Prevent duplicate pending requests between the same pair
    const existing = db.findOne(
        "competitionRequests",
        (r) =>
            r.status === "pending" &&
            ((r.from === req.userId && r.to === friendId) ||
                (r.from === friendId && r.to === req.userId))
    );
    if (existing) {
        return res.status(409).json({ error: "A pending competition request already exists" });
    }

    // Prevent if they already have an active competition together
    const activeComp = db.findOne(
        "competitions",
        (c) =>
            c.status === "active" &&
            ((c.userA === req.userId && c.userB === friendId) ||
                (c.userA === friendId && c.userB === req.userId))
    );
    if (activeComp) {
        return res.status(409).json({ error: "An active competition already exists between you two" });
    }

    const compRequest = {
        id: uuidv4(),
        from: req.userId,
        to: friendId,
        status: "pending",
        createdAt: new Date().toISOString(),
    };

    db.insertOne("competitionRequests", compRequest);

    return res
        .status(201)
        .json({ message: "Competition request sent", request: compRequest });
});

// ─── Get incoming competition requests ──────────────────────────────────────
router.get("/requests/incoming", (req, res) => {
    const requests = db.findMany(
        "competitionRequests",
        (r) => r.to === req.userId && r.status === "pending"
    );

    const enriched = requests.map((r) => {
        const sender = db.findOne("users", (u) => u.id === r.from);
        return { ...r, fromName: sender ? sender.name : "Unknown" };
    });

    return res.json({ requests: enriched });
});

// ─── Get outgoing competition requests ──────────────────────────────────────
router.get("/requests/outgoing", (req, res) => {
    const requests = db.findMany(
        "competitionRequests",
        (r) => r.from === req.userId && r.status === "pending"
    );

    const enriched = requests.map((r) => {
        const recipient = db.findOne("users", (u) => u.id === r.to);
        return { ...r, toName: recipient ? recipient.name : "Unknown" };
    });

    return res.json({ requests: enriched });
});

// ─── Accept competition request → create competition ────────────────────────
router.post("/request/:requestId/accept", (req, res) => {
    const { requestId } = req.params;

    const compReq = db.findOne(
        "competitionRequests",
        (r) => r.id === requestId && r.to === req.userId && r.status === "pending"
    );
    if (!compReq) {
        return res.status(404).json({ error: "Competition request not found" });
    }

    // Mark request accepted
    db.updateMany(
        "competitionRequests",
        (r) => r.id === requestId,
        (r) => ({ ...r, status: "accepted" })
    );

    // Create competition
    const competition = {
        id: uuidv4(),
        userA: compReq.from,
        userB: compReq.to,
        status: "active",
        startedAt: new Date().toISOString(),
        endedAt: null,
        winnerId: null,
        scoreA: 0,
        scoreB: 0,
    };

    db.insertOne("competitions", competition);

    return res.json({ message: "Competition started!", competition });
});

// ─── Decline competition request ────────────────────────────────────────────
router.post("/request/:requestId/decline", (req, res) => {
    const { requestId } = req.params;

    const compReq = db.findOne(
        "competitionRequests",
        (r) => r.id === requestId && r.to === req.userId && r.status === "pending"
    );
    if (!compReq) {
        return res.status(404).json({ error: "Competition request not found" });
    }

    db.updateMany(
        "competitionRequests",
        (r) => r.id === requestId,
        (r) => ({ ...r, status: "declined" })
    );

    return res.json({ message: "Competition request declined" });
});

// ─── List my active competitions ────────────────────────────────────────────
router.get("/active", (req, res) => {
    const competitions = db.findMany(
        "competitions",
        (c) =>
            c.status === "active" &&
            (c.userA === req.userId || c.userB === req.userId)
    );

    const enriched = competitions.map((c) => {
        const opponentId = c.userA === req.userId ? c.userB : c.userA;
        const opponent = db.findOne("users", (u) => u.id === opponentId);

        // Calculate live scores from workout sets
        const setsA = db.findMany(
            "workoutSets",
            (s) => s.competitionId === c.id && s.userId === c.userA
        );
        const setsB = db.findMany(
            "workoutSets",
            (s) => s.competitionId === c.id && s.userId === c.userB
        );

        return {
            ...c,
            scoreA: calculateTotalScore(setsA),
            scoreB: calculateTotalScore(setsB),
            opponentName: opponent ? opponent.name : "Unknown",
        };
    });

    return res.json({ competitions: enriched });
});

// ─── List my past (completed) competitions ──────────────────────────────────
router.get("/history", (req, res) => {
    const competitions = db.findMany(
        "competitions",
        (c) =>
            c.status === "completed" &&
            (c.userA === req.userId || c.userB === req.userId)
    );

    const enriched = competitions.map((c) => {
        const opponentId = c.userA === req.userId ? c.userB : c.userA;
        const opponent = db.findOne("users", (u) => u.id === opponentId);
        return {
            ...c,
            opponentName: opponent ? opponent.name : "Unknown",
        };
    });

    return res.json({ competitions: enriched });
});

// ─── Get competition details + both users' workout sets ─────────────────────
router.get("/:competitionId", (req, res) => {
    const { competitionId } = req.params;

    const comp = db.findOne("competitions", (c) => c.id === competitionId);
    if (!comp) {
        return res.status(404).json({ error: "Competition not found" });
    }

    // Ensure the requesting user is a participant
    if (comp.userA !== req.userId && comp.userB !== req.userId) {
        return res.status(403).json({ error: "You are not part of this competition" });
    }

    // Fetch sets for both users in this competition
    const setsA = db.findMany(
        "workoutSets",
        (s) => s.competitionId === competitionId && s.userId === comp.userA
    );
    const setsB = db.findMany(
        "workoutSets",
        (s) => s.competitionId === competitionId && s.userId === comp.userB
    );

    const userA = db.findOne("users", (u) => u.id === comp.userA);
    const userB = db.findOne("users", (u) => u.id === comp.userB);

    const scoreA = calculateTotalScore(setsA);
    const scoreB = calculateTotalScore(setsB);

    return res.json({
        competition: {
            ...comp,
            scoreA,
            scoreB,
        },
        participants: {
            userA: {
                id: comp.userA,
                name: userA ? userA.name : "Unknown",
                sets: setsA,
                score: scoreA,
            },
            userB: {
                id: comp.userB,
                name: userB ? userB.name : "Unknown",
                sets: setsB,
                score: scoreB,
            },
        },
    });
});

// ─── Real-time SSE stream for a competition ────────────────────────────────
router.get("/:competitionId/stream", (req, res) => {
    const { competitionId } = req.params;

    const comp = db.findOne("competitions", (c) => c.id === competitionId);
    if (!comp) {
        return res.status(404).json({ error: "Competition not found" });
    }
    if (comp.userA !== req.userId && comp.userB !== req.userId) {
        return res.status(403).json({ error: "You are not part of this competition" });
    }

    // Set up SSE headers
    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
    });

    // Send an initial heartbeat so the client knows the connection is live
    res.write("event: connected\ndata: {}\n\n");

    // Register this response for future events
    subscribe(competitionId, res);

    // Keep-alive every 30 seconds
    const heartbeat = setInterval(() => {
        try { res.write(": heartbeat\n\n"); } catch { clearInterval(heartbeat); }
    }, 30000);

    req.on("close", () => clearInterval(heartbeat));
});

// ─── End competition ────────────────────────────────────────────────────────
router.post("/:competitionId/end", (req, res) => {
    const { competitionId } = req.params;

    const comp = db.findOne(
        "competitions",
        (c) => c.id === competitionId && c.status === "active"
    );
    if (!comp) {
        return res.status(404).json({ error: "Active competition not found" });
    }

    // Either participant can end
    if (comp.userA !== req.userId && comp.userB !== req.userId) {
        return res.status(403).json({ error: "You are not part of this competition" });
    }

    // Calculate final scores
    const setsA = db.findMany(
        "workoutSets",
        (s) => s.competitionId === competitionId && s.userId === comp.userA
    );
    const setsB = db.findMany(
        "workoutSets",
        (s) => s.competitionId === competitionId && s.userId === comp.userB
    );

    const scoreA = calculateTotalScore(setsA);
    const scoreB = calculateTotalScore(setsB);

    let winnerId = null;
    if (scoreA > scoreB) winnerId = comp.userA;
    else if (scoreB > scoreA) winnerId = comp.userB;
    // null means tie

    db.updateMany(
        "competitions",
        (c) => c.id === competitionId,
        (c) => ({
            ...c,
            status: "completed",
            endedAt: new Date().toISOString(),
            scoreA,
            scoreB,
            winnerId,
        })
    );

    const userA = db.findOne("users", (u) => u.id === comp.userA);
    const userB = db.findOne("users", (u) => u.id === comp.userB);
    const winner = winnerId ? db.findOne("users", (u) => u.id === winnerId) : null;

    const result = {
        competitionId,
        scoreA,
        scoreB,
        userA: { id: comp.userA, name: userA ? userA.name : "Unknown" },
        userB: { id: comp.userB, name: userB ? userB.name : "Unknown" },
        winner: winner ? { id: winner.id, name: winner.name } : "Tie",
    };

    // Notify connected clients
    emit(competitionId, "competition-ended", result);

    return res.json({ message: "Competition ended!", result });
});

module.exports = router;
