
const jwt = require("jsonwebtoken");

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

        req.user = {
            id: payload.sub,
            role: payload.role,
        };

        next();
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
