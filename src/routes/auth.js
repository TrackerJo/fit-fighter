const express = require("express");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const db = require("../database");
const { signToken } = require("../middleware/auth");

const router = express.Router();

// ─── Register ────────────────────────────────────────────────────────────────
router.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: "name, email, and password are required" });
        }

        // Check for duplicate email
        const existing = db.findOne("users", (u) => u.email === email);
        if (existing) {
            return res.status(409).json({ error: "Email already in use" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = {
            id: uuidv4(),
            name,
            email,
            password: hashedPassword,
            createdAt: new Date().toISOString(),
        };

        db.insertOne("users", user);

        const token = signToken(user.id);

        return res.status(201).json({
            message: "Account created",
            token,
            user: { id: user.id, name: user.name, email: user.email },
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// ─── Login ───────────────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "email and password are required" });
        }

        const user = db.findOne("users", (u) => u.email === email);
        if (!user) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const token = signToken(user.id);

        return res.json({
            message: "Logged in",
            token,
            user: { id: user.id, name: user.name, email: user.email },
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// ─── Get current user profile ────────────────────────────────────────────────
const { authMiddleware } = require("../middleware/auth");

router.get("/me", authMiddleware, (req, res) => {
    const user = db.findOne("users", (u) => u.id === req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json({ id: user.id, name: user.name, email: user.email });
});

module.exports = router;
