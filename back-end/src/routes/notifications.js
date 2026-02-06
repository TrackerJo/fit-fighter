const express = require("express");
const { authMiddleware } = require("../middleware/auth");
const { subscribeUser } = require("../events");

const router = express.Router();

router.use(authMiddleware);

// ─── User-level SSE notification stream ─────────────────────────────────────
router.get("/stream", (req, res) => {
    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
    });

    res.write("event: connected\ndata: {}\n\n");

    subscribeUser(req.userId, res);

    const heartbeat = setInterval(() => {
        try { res.write(": heartbeat\n\n"); }
        catch { clearInterval(heartbeat); }
    }, 30000);

    req.on("close", () => clearInterval(heartbeat));
});

module.exports = router;
