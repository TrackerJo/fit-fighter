const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "fit-fighter-secret-key";

/**
 * Express middleware that verifies the Bearer token on incoming requests.
 * Attaches `req.userId` on success.
 */
function authMiddleware(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Missing or invalid authorization header" });
    }

    const token = header.split(" ")[1];
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.userId = payload.userId;
        next();
    } catch {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
}

/**
 * Create a signed JWT for a given userId.
 */
function signToken(userId) {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}

module.exports = { authMiddleware, signToken, JWT_SECRET };
