const express = require("express");
const { v4: uuidv4 } = require("uuid");
const db = require("../database");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

// All friend routes require authentication
router.use(authMiddleware);

// ─── Search users by name ────────────────────────────────────────────────────
router.get("/search", (req, res) => {
    const { name } = req.query;

    if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: "name query parameter is required" });
    }

    const query = name.toLowerCase();
    const results = db
        .findMany("users", (u) => u.name.toLowerCase().includes(query) && u.id !== req.userId)
        .map((u) => ({ id: u.id, name: u.name }));

    return res.json({ users: results });
});

// ─── Send friend request ────────────────────────────────────────────────────
router.post("/request", (req, res) => {
    const { friendId } = req.body;

    if (!friendId) {
        return res.status(400).json({ error: "friendId is required" });
    }

    if (friendId === req.userId) {
        return res.status(400).json({ error: "Cannot send a friend request to yourself" });
    }

    // Check target user exists
    const target = db.findOne("users", (u) => u.id === friendId);
    if (!target) {
        return res.status(404).json({ error: "User not found" });
    }

    // Check if already friends
    const alreadyFriends = db.findOne(
        "friendships",
        (f) =>
            (f.userA === req.userId && f.userB === friendId) ||
            (f.userA === friendId && f.userB === req.userId)
    );
    if (alreadyFriends) {
        return res.status(409).json({ error: "Already friends with this user" });
    }

    // Check for duplicate pending request
    const existingRequest = db.findOne(
        "friendRequests",
        (r) =>
            r.status === "pending" &&
            ((r.from === req.userId && r.to === friendId) ||
                (r.from === friendId && r.to === req.userId))
    );
    if (existingRequest) {
        return res.status(409).json({ error: "A pending friend request already exists" });
    }

    const friendRequest = {
        id: uuidv4(),
        from: req.userId,
        to: friendId,
        status: "pending",
        createdAt: new Date().toISOString(),
    };

    db.insertOne("friendRequests", friendRequest);

    return res.status(201).json({ message: "Friend request sent", request: friendRequest });
});

// ─── Get incoming friend requests ───────────────────────────────────────────
router.get("/requests/incoming", (req, res) => {
    const requests = db.findMany(
        "friendRequests",
        (r) => r.to === req.userId && r.status === "pending"
    );

    // Enrich with sender name
    const enriched = requests.map((r) => {
        const sender = db.findOne("users", (u) => u.id === r.from);
        return { ...r, fromName: sender ? sender.name : "Unknown" };
    });

    return res.json({ requests: enriched });
});

// ─── Get outgoing friend requests ───────────────────────────────────────────
router.get("/requests/outgoing", (req, res) => {
    const requests = db.findMany(
        "friendRequests",
        (r) => r.from === req.userId && r.status === "pending"
    );

    const enriched = requests.map((r) => {
        const recipient = db.findOne("users", (u) => u.id === r.to);
        return { ...r, toName: recipient ? recipient.name : "Unknown" };
    });

    return res.json({ requests: enriched });
});

// ─── Accept friend request ──────────────────────────────────────────────────
router.post("/request/:requestId/accept", (req, res) => {
    const { requestId } = req.params;

    const friendReq = db.findOne(
        "friendRequests",
        (r) => r.id === requestId && r.to === req.userId && r.status === "pending"
    );
    if (!friendReq) {
        return res.status(404).json({ error: "Friend request not found" });
    }

    // Mark the request as accepted
    db.updateMany("friendRequests", (r) => r.id === requestId, (r) => ({ ...r, status: "accepted" }));

    // Create a friendship record
    const friendship = {
        id: uuidv4(),
        userA: friendReq.from,
        userB: friendReq.to,
        createdAt: new Date().toISOString(),
    };
    db.insertOne("friendships", friendship);

    return res.json({ message: "Friend request accepted", friendship });
});

// ─── Decline friend request ─────────────────────────────────────────────────
router.post("/request/:requestId/decline", (req, res) => {
    const { requestId } = req.params;

    const friendReq = db.findOne(
        "friendRequests",
        (r) => r.id === requestId && r.to === req.userId && r.status === "pending"
    );
    if (!friendReq) {
        return res.status(404).json({ error: "Friend request not found" });
    }

    db.updateMany("friendRequests", (r) => r.id === requestId, (r) => ({ ...r, status: "declined" }));

    return res.json({ message: "Friend request declined" });
});

// ─── List friends ───────────────────────────────────────────────────────────
router.get("/", (req, res) => {
    const friendships = db.findMany(
        "friendships",
        (f) => f.userA === req.userId || f.userB === req.userId
    );

    const friends = friendships.map((f) => {
        const friendId = f.userA === req.userId ? f.userB : f.userA;
        const user = db.findOne("users", (u) => u.id === friendId);
        return {
            friendshipId: f.id,
            id: friendId,
            name: user ? user.name : "Unknown",
            since: f.createdAt,
        };
    });

    return res.json({ friends });
});

// ─── Remove friend ──────────────────────────────────────────────────────────
router.delete("/:friendId", (req, res) => {
    const { friendId } = req.params;

    const removed = db.removeMany(
        "friendships",
        (f) =>
            (f.userA === req.userId && f.userB === friendId) ||
            (f.userA === friendId && f.userB === req.userId)
    );

    if (removed === 0) {
        return res.status(404).json({ error: "Friendship not found" });
    }

    return res.json({ message: "Friend removed" });
});

module.exports = router;
