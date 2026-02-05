const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const friendRoutes = require("./routes/friends");
const competitionRoutes = require("./routes/competitions");
const workoutRoutes = require("./routes/workouts");

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Global Middleware ──────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Health Check ───────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
    res.json({ status: "ok", app: "Fit Fighter API" });
});

// ─── Routes ─────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/competitions", competitionRoutes);
app.use("/api/workouts", workoutRoutes);

// ─── 404 catch-all ──────────────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ error: "Route not found" });
});

// ─── Start ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`Fit Fighter API running on http://localhost:${PORT}`);
});

module.exports = app;
