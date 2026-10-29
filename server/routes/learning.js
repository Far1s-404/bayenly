
const express = require("express");
const pool = require("../db");
const {
    authenticateToken,
    requireRole
} = require("../middleware/auth");

const router = express.Router();

router.param("packageId", (req, res, next, packageId) => {
    if (
        !/^[1-9]\d*$/.test(packageId) ||
        !Number.isSafeInteger(Number(packageId))
    ) {
        return res.status(400).json({
            message: "A valid package ID is required.",
        });
    }

    next();
});

router.param("videoId", (req, res, next, videoId) => {
    if (
        !/^[1-9]\d*$/.test(videoId) ||
        !Number.isSafeInteger(Number(videoId))
    ) {
        return res.status(400).json({
            message: "A valid video ID is required.",
        });
    }

    next();
});

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
                    lv.position,
                    progress.completed_at
                 FROM purchases p
                 JOIN lesson_packages lp ON lp.id = p.package_id
                 LEFT JOIN lesson_videos lv ON lv.package_id = lp.id
                 LEFT JOIN lesson_progress progress
                    ON progress.student_id = p.student_id
                   AND progress.video_id = lv.id
                 WHERE p.student_id = $1
                   AND p.package_id = $2
                   AND p.status = 'paid'
                   AND lp.status = 'published'`,
                [req.user.id, req.params.packageId]
            );

            if (result.rows.length === 0) {
                return res.status(403).json({
                    message: "You must purchase this lesson package to access its videos.",
                });
            }

            res.json({
                package_id: result.rows[0].package_id,
                package_title: result.rows[0].package_title,
                videos: result.rows
                    .filter((row) => row.video_id !== null)
                    .map((row) => ({
                        id: row.video_id,
                        title: row.video_title,
                        video_url: row.video_url,
                        duration_seconds: row.duration_seconds,
                        position: row.position,
                        completed_at: row.completed_at,
                    }))
                    .sort((a, b) => a.position - b.position),
            });
        } catch (error) {
            console.error("Learning access error:", error.message);
            res.status(500).json({
                message: "Unable to retrieve lesson videos.",
            });
        }
    }
);

router.post(
    "/:packageId/videos/:videoId/complete",
    authenticateToken,
    requireRole("student"),
    async (req, res) => {
        try {
            const result = await pool.query(
                `INSERT INTO lesson_progress (student_id, video_id)
                 SELECT p.student_id, lv.id
                 FROM purchases p
                 JOIN lesson_packages lp ON lp.id = p.package_id
                 JOIN lesson_videos lv ON lv.package_id = lp.id
                 WHERE p.student_id = $1
                   AND p.package_id = $2
                   AND lv.id = $3
                   AND p.status = 'paid'
                   AND lp.status = 'published'
                 ON CONFLICT (student_id, video_id)
                 DO UPDATE SET updated_at = NOW()
                 RETURNING student_id, video_id, completed_at, updated_at`,
                [req.user.id, req.params.packageId, req.params.videoId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    message: "Paid lesson video not found.",
                });
            }

            return res.json({
                message: "Lesson progress saved.",
                progress: result.rows[0],
            });
        } catch (error) {
            console.error("Save learning progress error:", error.message);
            return res.status(500).json({
                message: "Unable to save learning progress.",
            });
        }
    }
);

module.exports = router;
