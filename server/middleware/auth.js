
const jwt = require("jsonwebtoken");
const pool = require("../db");

const allowedRoles = new Set(["student", "teacher", "admin"]);

function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7)
        : null;

    if (!token) {
        return res.status(401).json({
            message: "Authentication required.",
        });
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
        return res.status(503).json({
            message: "Authentication is not configured.",
        });
    }

    try {
        const payload = jwt.verify(token, secret, {
            algorithms: ["HS256"],
        });

        if (
            typeof payload.sub !== "string" ||
            !payload.sub ||
            typeof payload.role !== "string" ||
            !allowedRoles.has(payload.role)
        ) {
            return res.status(401).json({
                message: "Invalid or expired token.",
            });
        }

        const lookupUser = req.app?.locals?.lookupAuthenticatedUser ||
            ((id) => pool.query(
                "SELECT id, role, suspended_at FROM users WHERE id = $1",
                [id]
            ).then((result) => result.rows[0] || null));

        Promise.resolve(lookupUser(payload.sub)).then((user) => {
            if (!user || !allowedRoles.has(user.role)) {
                return res.status(401).json({
                    message: "Invalid or expired token.",
                });
            }

            if (user.suspended_at) {
                return res.status(403).json({
                    message: "This account is suspended. Contact support for assistance.",
                });
            }

            req.user = {
                id: String(user.id),
                role: user.role,
            };

            return next();
        }).catch((error) => {
            console.error("Authenticated account lookup failed:", error.message);
            return res.status(error.code === "42703" ? 503 : 500).json({
                message: error.code === "42703"
                    ? "The account moderation migration is missing. Run npm run db:migrate from the server directory."
                    : "Unable to verify your account.",
            });
        });
    } catch {
        return res.status(401).json({
            message: "Invalid or expired token.",
        });
    }
}

function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                message: "You do not have permission to access this resource.",
            });
        }

        next();
    };
}

module.exports = { authenticateToken, requireRole, allowedRoles };
