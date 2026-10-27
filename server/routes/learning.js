
const express = require("express");
const pool = require("../db");
const {
    authenticateToken,
    requireRole
} = require("../middleware/auth");

const router = express.Router();

// GET /api/learning/:packageId
// Return lesson videos only to students who have paid
router.get(
    "/:packageId",
    authenticateToken,
    requireRole("student"),
    async (req, res) => {
        try {
            const result = await pool.query(
                `SELECT
                    lp.id AS package_id,
                    lp.title AS package_title,
                    lv.id AS video_id,
                    lv.title AS video_title,
                    lv.video_url,
                    lv.duration_seconds,
                    lv.position
                 FROM purchases p
                 JOIN lesson_packages lp ON lp.id = p.package_id
                 JOIN lesson_videos lv ON lv.package_id = lp.id
                 WHERE p.student_id = $1
                   AND p.package_id = $2
                   AND p.status = 'paid'
                   AND lp.status = 'published'
                 ORDER BY lv.position ASC`,
                [req.user.id, req.params.packageId]
            );

            if (result.rows.length === 0) {
                return res.status(403).json({
                    message: "You must purchase this lesson package to access its videos."
                });
            }

            res.json({
                package_id: result.rows[0].package_id,
                package_title: result.rows[0].package_title,
                videos: result.rows.map((row) => ({
                    id: row.video_id,
                    title: row.video_title,
                    video_url: row.video_url,
                    duration_seconds: row.duration_seconds,
                    position: row.position
                }))
            });
        } catch (error) {
            console.error("Learning access error:", error.message);

            res.status(500).json({
                message: "Unable to retrieve lesson videos."
            });
        }
    }
);

module.exports = router;
