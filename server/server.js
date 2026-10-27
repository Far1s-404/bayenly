require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

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

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await pool.query(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT"
        );

        app.listen(PORT, () => {
            console.log(`Bayenly API running at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Database schema initialization failed:", error.message);
        process.exitCode = 1;
    }
}

startServer();