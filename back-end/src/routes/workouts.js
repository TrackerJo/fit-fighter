const express = require("express");
const { v4: uuidv4 } = require("uuid");
const db = require("../database");
const { authMiddleware } = require("../middleware/auth");
const { calculateSetScore, calculateTotalScore } = require("../scoring");
const { emit } = require("../events");

const router = express.Router();

// All workout routes require authentication
router.use(authMiddleware);

// ─── Log a workout set for a competition ────────────────────────────────────
router.post("/sets", (req, res) => {
    const { competitionId, exercise, weight, reps } = req.body;

    if (!competitionId || !exercise || weight == null || reps == null) {
        return res
            .status(400)
            .json({ error: "competitionId, exercise, weight, and reps are required" });
    }

    if (typeof weight !== "number" || typeof reps !== "number" || weight <= 0 || reps <= 0) {
        return res.status(400).json({ error: "weight and reps must be positive numbers" });
    }

    // Verify the competition exists and is active
    const comp = db.findOne(
        "competitions",
        (c) => c.id === competitionId && c.status === "active"
    );
    if (!comp) {
        return res.status(404).json({ error: "Active competition not found" });
    }

    // Verify the user is a participant
    if (comp.userA !== req.userId && comp.userB !== req.userId) {
        return res.status(403).json({ error: "You are not part of this competition" });
    }

    const setScore = calculateSetScore(weight, reps);

    const workoutSet = {
        id: uuidv4(),
        userId: req.userId,
        competitionId,
        exercise,
        weight,
        reps,
        score: setScore,
        loggedAt: new Date().toISOString(),
    };

    db.insertOne("workoutSets", workoutSet);

    // Notify real-time subscribers
    const loggedBy = db.findOne("users", (u) => u.id === req.userId);
    emit(competitionId, "set-logged", {
        set: workoutSet,
        userId: req.userId,
        userName: loggedBy ? loggedBy.name : "Unknown",
    });

    return res.status(201).json({
        message: "Set logged",
        set: workoutSet,
    });
});

// ─── Log multiple sets at once (batch) ──────────────────────────────────────
router.post("/sets/batch", (req, res) => {
    const { competitionId, sets } = req.body;

    if (!competitionId || !Array.isArray(sets) || sets.length === 0) {
        return res
            .status(400)
            .json({ error: "competitionId and a non-empty sets array are required" });
    }

    // Verify competition
    const comp = db.findOne(
        "competitions",
        (c) => c.id === competitionId && c.status === "active"
    );
    if (!comp) {
        return res.status(404).json({ error: "Active competition not found" });
    }
    if (comp.userA !== req.userId && comp.userB !== req.userId) {
        return res.status(403).json({ error: "You are not part of this competition" });
    }

    const logged = [];
    for (const s of sets) {
        if (!s.exercise || !s.weight || !s.reps || s.weight <= 0 || s.reps <= 0) {
            continue; // skip invalid entries
        }

        const setScore = calculateSetScore(s.weight, s.reps);

        const workoutSet = {
            id: uuidv4(),
            userId: req.userId,
            competitionId,
            exercise: s.exercise,
            weight: s.weight,
            reps: s.reps,
            score: setScore,
            loggedAt: new Date().toISOString(),
        };

        db.insertOne("workoutSets", workoutSet);
        logged.push(workoutSet);
    }

    // Notify real-time subscribers
    if (logged.length > 0) {
        const loggedBy = db.findOne("users", (u) => u.id === req.userId);
        emit(competitionId, "sets-logged", {
            sets: logged,
            userId: req.userId,
            userName: loggedBy ? loggedBy.name : "Unknown",
            count: logged.length,
        });
    }

    return res.status(201).json({ message: `${logged.length} sets logged`, sets: logged });
});

// ─── Get my sets for a competition ──────────────────────────────────────────
router.get("/sets/:competitionId", (req, res) => {
    const { competitionId } = req.params;

    const comp = db.findOne("competitions", (c) => c.id === competitionId);
    if (!comp) {
        return res.status(404).json({ error: "Competition not found" });
    }
    if (comp.userA !== req.userId && comp.userB !== req.userId) {
        return res.status(403).json({ error: "You are not part of this competition" });
    }

    const mySets = db.findMany(
        "workoutSets",
        (s) => s.competitionId === competitionId && s.userId === req.userId
    );

    const totalScore = calculateTotalScore(mySets);

    return res.json({ sets: mySets, totalScore });
});

// ─── Delete a set (undo a log) ──────────────────────────────────────────────
router.delete("/sets/:setId", (req, res) => {
    const { setId } = req.params;

    const existing = db.findOne(
        "workoutSets",
        (s) => s.id === setId && s.userId === req.userId
    );
    if (!existing) {
        return res.status(404).json({ error: "Set not found or not yours" });
    }

    // Only allow deletion if the competition is still active
    const comp = db.findOne(
        "competitions",
        (c) => c.id === existing.competitionId && c.status === "active"
    );
    if (!comp) {
        return res.status(403).json({ error: "Cannot delete sets from a completed competition" });
    }

    db.removeMany("workoutSets", (s) => s.id === setId);

    // Notify real-time subscribers
    emit(existing.competitionId, "set-deleted", {
        setId,
        userId: req.userId,
    });

    return res.json({ message: "Set deleted" });
});

module.exports = router;
