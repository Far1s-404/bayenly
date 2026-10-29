const express = require("express");
const pool = require("../db");
const { authenticateToken, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get(
    "/my",
    authenticateToken,
    requireRole("student"),
    async (req, res) => {
        try {
            const result = await pool.query(
                `SELECT id, specialization, bio, status, created_at
                 FROM teacher_applications
                 WHERE user_id = $1`,
                [req.user.id]
            );

            return res.json({ application: result.rows[0] || null });
        } catch (error) {
            console.error("Fetch teacher application error:", error.message);
            if (
                error.code === "42P01" &&
                error.message.includes("teacher_applications")
            ) {
                return res.status(500).json({
                    message: "The teacher applications migration is missing. Run npm run db:migrate from the server directory.",
                });
            }

            return res.status(500).json({
                message: "Unable to retrieve teacher application.",
            });
        }
    }
);

router.post(
    "/",
    authenticateToken,
    requireRole("student"),
    async (req, res) => {
        const { specialization, bio } = req.body;

        if (
            typeof specialization !== "string" ||
            typeof bio !== "string" ||
            specialization.trim().length < 2 ||
            specialization.trim().length > 150 ||
            bio.trim().length < 20 ||
            bio.trim().length > 5000
        ) {
            return res.status(400).json({
                message: "Specialization must be 2–150 characters and biography 20–5000 characters.",
            });
        }

        try {
            const result = await pool.query(
                `INSERT INTO teacher_applications (user_id, specialization, bio)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (user_id) DO NOTHING
                 RETURNING id, specialization, bio, status, created_at`,
                [req.user.id, specialization.trim(), bio.trim()]
            );

            if (result.rows.length === 0) {
                return res.status(409).json({
                    message: "A teacher application has already been submitted for this account.",
                });
            }

            return res.status(201).json({
                message: "Teacher application submitted for review.",
                application: result.rows[0],
            });
        } catch (error) {
            console.error("Submit teacher application error:", error.message);
            return res.status(500).json({
                message: "Unable to submit teacher application.",
            });
        }
    }
);

module.exports = router;
