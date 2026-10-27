require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();

const isProduction = process.env.NODE_ENV === "production";
const allowedOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(cors({
    origin(origin, callback) {
        if (!origin || !isProduction) {
            return callback(null, true);
        }

        return callback(null, allowedOrigins.includes(origin));
    },
}));
app.use(express.json({ limit: "100kb" }));

app.use("/api/auth", require("./routes/auth"));
app.use("/api/lessons", require("./routes/lessons"));
app.use("/api/purchases", require("./routes/purchases"));
app.use("/api/learning", require("./routes/learning"));
app.use("/api/payments", require("./routes/payments"));

app.get("/", (req, res) => {
    res.json({ message: "Bayenly API is running!" });
});

app.get("/api/health", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW() AS database_time");

        res.json({
            status: "ok",
            database: "connected",
            time: result.rows[0].database_time,
        });
    } catch (error) {
        console.error("Database connection failed:", error.message);
        res.status(500).json({
            status: "error",
            database: "disconnected",
        });
    }
});

app.use((req, res) => {
    res.status(404).json({
        message: "Route not found.",
    });
});

app.use((error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }

    const status = Number.isInteger(error.status) ? error.status : 500;
    const clientError = status >= 400 && status < 500;

    if (!clientError) {
        console.error("Request failed:", error.message);
    }

    return res.status(status).json({
        message: clientError
            ? status === 400
                ? "Invalid request."
                : error.message
            : "Internal server error.",
    });
});

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET must be configured.");
        }

        if (
            isProduction &&
            Buffer.byteLength(process.env.JWT_SECRET, "utf8") < 32
        ) {
            throw new Error(
                "JWT_SECRET must be at least 32 bytes in production."
            );
        }

        if (isProduction && allowedOrigins.length === 0) {
            throw new Error(
                "CORS_ORIGINS must contain the production frontend origin."
            );
        }

        await pool.query(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT"
        );

        app.listen(PORT, () => {
            console.log(`Bayenly API running at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Server startup failed:", error.message);
        process.exitCode = 1;
    }
}

startServer();