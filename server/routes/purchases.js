
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

// POST /api/purchases
// Create a pending purchase; payment is NOT confirmed here
router.post(
    "/",
    authenticateToken,
    requireRole("student"),
    async (req, res) => {
        try {
            const { package_id } = req.body;

            if (
                !Number.isSafeInteger(package_id) ||
                package_id < 1
            ) {
                return res.status(400).json({
                    message: "A valid package_id is required."
                });
            }

            const packageResult = await pool.query(
                `SELECT id, teacher_id, price
                 FROM lesson_packages
                 WHERE id = $1
                   AND status = 'published'`,
                [package_id]
            );

            if (packageResult.rows.length === 0) {
                return res.status(404).json({
                    message: "Published lesson package not found."
                });
            }

            if (String(packageResult.rows[0].teacher_id) === String(req.user.id)) {
                return res.status(400).json({
                    message: "You cannot purchase your own lesson package."
                });
            }

            const existingPurchase = await pool.query(
                `SELECT id, status
                 FROM purchases
                 WHERE student_id = $1 AND package_id = $2`,
                [req.user.id, package_id]
            );

            if (existingPurchase.rows.length > 0) {
                const existing = existingPurchase.rows[0];

                if (existing.status === "paid") {
                    return res.status(409).json({
                        message: "You already own this lesson package."
                    });
                }

                if (existing.status === "pending") {
                    return res.status(409).json({
                        message: "A purchase for this package is already pending."
                    });
                }
            }

            const result = await pool.query(
                `INSERT INTO purchases
                    (student_id, package_id, amount, status)
                 VALUES ($1, $2, $3, 'pending')
                 ON CONFLICT (student_id, package_id) DO NOTHING
                 RETURNING id, student_id, package_id, amount, status, created_at`,
                [
                    req.user.id,
                    package_id,
                    packageResult.rows[0].price
                ]
            );

            if (result.rows.length === 0) {
                return res.status(409).json({
                    message: "A purchase record already exists for this package."
                });
            }

            res.status(201).json({
                message: "Pending purchase created. Complete payment to gain access.",
                purchase: result.rows[0]
            });
        } catch (error) {
            console.error("Create purchase error:", error.message);
            res.status(500).json({
                message: "Unable to create purchase."
            });
        }
    }
);

module.exports = router;
