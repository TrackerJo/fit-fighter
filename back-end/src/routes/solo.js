const express = require("express");
const { v4: uuidv4 } = require("uuid");
const db = require("../database");
const { authMiddleware } = require("../middleware/auth");
const { calculateSetScore, calculateTotalScore } = require("../scoring");

const router = express.Router();

// All solo routes require authentication
router.use(authMiddleware);

// ─── Start a new solo session ───────────────────────────────────────────────
router.post("/sessions", (req, res) => {
    const { name } = req.body;

    const session = {
        id: uuidv4(),
        userId: req.userId,
        name: name || "Solo Workout",
        status: "active",
        score: 0,
        startedAt: new Date().toISOString(),
        endedAt: null,
    };

    db.insertOne("soloSessions", session);

    return res.status(201).json({ message: "Solo session started", session });
});

// ─── Get active solo sessions ───────────────────────────────────────────────
router.get("/sessions/active", (req, res) => {
    const sessions = db.findMany(
        "soloSessions",
        (s) => s.userId === req.userId && s.status === "active"
    );
    return res.json({ sessions });
});

// ─── Get solo session history ───────────────────────────────────────────────
router.get("/sessions/history", (req, res) => {
    const sessions = db.findMany(
        "soloSessions",
        (s) => s.userId === req.userId && s.status === "completed"
    );
    // Sort newest first
    sessions.sort((a, b) => new Date(b.endedAt) - new Date(a.endedAt));
    return res.json({ sessions });
});

// ─── Get personal records (best set per exercise & best session) ────────────
router.get("/records", (req, res) => {
    const allSets = db.findMany("soloSets", (s) => s.userId === req.userId);
    const allSessions = db.findMany("soloSessions", (s) => s.userId === req.userId && s.status === "completed");

    // Best set per exercise
    const bestByExercise = {};
    for (const s of allSets) {
        if (!bestByExercise[s.exercise] || s.score > bestByExercise[s.exercise].score) {
            bestByExercise[s.exercise] = s;
        }
    }

    // Best session by total score
    let bestSession = null;
    for (const sess of allSessions) {
        if (!bestSession || sess.score > bestSession.score) {
            bestSession = sess;
        }
    }

    // All-time total
    const allTimeScore = allSets.reduce((sum, s) => sum + s.score, 0);
    const totalSets = allSets.length;
    const totalSessions = allSessions.length;

    return res.json({
        personalRecords: Object.values(bestByExercise),
        bestSession,
        allTimeScore: Math.round(allTimeScore * 100) / 100,
        totalSets,
        totalSessions,
    });
});

// ─── Get solo session detail ────────────────────────────────────────────────
router.get("/sessions/:sessionId", (req, res) => {
    const { sessionId } = req.params;

    const session = db.findOne(
        "soloSessions",
        (s) => s.id === sessionId && s.userId === req.userId
    );
    if (!session) {
        return res.status(404).json({ error: "Solo session not found" });
    }

    const sets = db.findMany(
        "soloSets",
        (s) => s.sessionId === sessionId
    );
    sets.sort((a, b) => new Date(b.loggedAt) - new Date(a.loggedAt));

    const totalScore = calculateTotalScore(sets);

    return res.json({ session, sets, totalScore });
});

// ─── End a solo session ─────────────────────────────────────────────────────
router.post("/sessions/:sessionId/end", (req, res) => {
    const { sessionId } = req.params;

    const session = db.findOne(
        "soloSessions",
        (s) => s.id === sessionId && s.userId === req.userId && s.status === "active"
    );
    if (!session) {
        return res.status(404).json({ error: "Active solo session not found" });
    }

    const sets = db.findMany("soloSets", (s) => s.sessionId === sessionId);
    const totalScore = calculateTotalScore(sets);

    db.updateMany(
        "soloSessions",
        (s) => s.id === sessionId,
        (s) => ({
            ...s,
            status: "completed",
            score: Math.round(totalScore * 100) / 100,
            endedAt: new Date().toISOString(),
        })
    );

    const updated = db.findOne("soloSessions", (s) => s.id === sessionId);

    return res.json({ message: "Session completed!", session: updated });
});

// ─── Log a set in a solo session ────────────────────────────────────────────
router.post("/sets", (req, res) => {
    const { sessionId, exercise, weight, reps } = req.body;

    if (!sessionId || !exercise || weight == null || reps == null) {
        return res
            .status(400)
            .json({ error: "sessionId, exercise, weight, and reps are required" });
    }

    if (typeof weight !== "number" || typeof reps !== "number" || weight <= 0 || reps <= 0) {
        return res.status(400).json({ error: "weight and reps must be positive numbers" });
    }

    const session = db.findOne(
        "soloSessions",
        (s) => s.id === sessionId && s.userId === req.userId && s.status === "active"
    );
    if (!session) {
        return res.status(404).json({ error: "Active solo session not found" });
    }

    const setScore = calculateSetScore(weight, reps);

    const soloSet = {
        id: uuidv4(),
        userId: req.userId,
        sessionId,
        exercise,
        weight,
        reps,
        score: setScore,
        loggedAt: new Date().toISOString(),
    };

    db.insertOne("soloSets", soloSet);

    // Update running session score
    const allSets = db.findMany("soloSets", (s) => s.sessionId === sessionId);
    const totalScore = calculateTotalScore(allSets);
    db.updateMany(
        "soloSessions",
        (s) => s.id === sessionId,
        (s) => ({ ...s, score: Math.round(totalScore * 100) / 100 })
    );

    return res.status(201).json({ message: "Set logged", set: soloSet });
});

// ─── Delete a solo set ──────────────────────────────────────────────────────
router.delete("/sets/:setId", (req, res) => {
    const { setId } = req.params;

    const existing = db.findOne(
        "soloSets",
        (s) => s.id === setId && s.userId === req.userId
    );
    if (!existing) {
        return res.status(404).json({ error: "Set not found or not yours" });
    }

    const session = db.findOne(
        "soloSessions",
        (s) => s.id === existing.sessionId && s.status === "active"
    );
    if (!session) {
        return res.status(403).json({ error: "Cannot delete sets from a completed session" });
    }

    db.removeMany("soloSets", (s) => s.id === setId);

    // Recalculate session score
    const remainingSets = db.findMany("soloSets", (s) => s.sessionId === existing.sessionId);
    const totalScore = calculateTotalScore(remainingSets);
    db.updateMany(
        "soloSessions",
        (s) => s.id === existing.sessionId,
        (s) => ({ ...s, score: Math.round(totalScore * 100) / 100 })
    );

    return res.json({ message: "Set deleted" });
});

module.exports = router;
