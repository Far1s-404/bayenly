
const express = require("express");
const pool = require("../db");
const { authenticateToken, requireRole } = require("../middleware/auth");

const router = express.Router();

// GET /api/purchases/my
// Retrieve the logged-in student's purchases
router.get(
    "/my",
    authenticateToken,
    requireRole("student"),
    async (req, res) => {
        try {
            const result = await pool.query(
                `SELECT
                    p.id AS purchase_id,
                    p.amount,
                    p.status,
                    p.purchased_at,
                    lp.id AS package_id,
                    lp.title,
                    lp.description,
                    lp.subject,
                    lp.language,
                    u.name AS teacher_name,
                    progress.video_count,
                    progress.completed_count,
                    CASE
                        WHEN progress.video_count = 0 THEN 0
                        ELSE ROUND(
                            progress.completed_count * 100.0
                            / progress.video_count
                        )::int
                    END AS progress_percent
                 FROM purchases p
                 JOIN lesson_packages lp ON lp.id = p.package_id
                 JOIN users u ON u.id = lp.teacher_id
                 LEFT JOIN LATERAL (
                    SELECT
                        COUNT(lv.id)::int AS video_count,
                        COUNT(progress.video_id)::int AS completed_count
                    FROM lesson_videos lv
                    LEFT JOIN lesson_progress progress
                        ON progress.video_id = lv.id
                       AND progress.student_id = p.student_id
                    WHERE lv.package_id = p.package_id
                      AND lv.archived_at IS NULL
                 ) progress ON TRUE
                 WHERE p.student_id = $1
                 ORDER BY p.created_at DESC`,
                [req.user.id]
            );

            res.json({ purchases: result.rows });
        } catch (error) {
            console.error("Fetch purchases error:", error.message);
            if (
                error.code === "42P01" &&
                error.message.includes("lesson_progress")
            ) {
                return res.status(500).json({
                    message: "The lesson progress migration is missing. Run npm run db:migrate from the server directory.",
                });
            }

            res.status(500).json({
                message: "Unable to retrieve purchases."
            });
        }
    }
);

// Checkout remains unavailable until a real payment provider is integrated.
router.post(
    "/",
    authenticateToken,
    requireRole("student"),
    (req, res) => res.status(503).json({
        message: "Checkout is unavailable until a real payment provider is configured. No purchase was created.",
    })
);

module.exports = router;
