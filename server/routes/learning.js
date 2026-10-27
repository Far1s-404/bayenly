
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

// GET /api/learning/:packageId
// Return lesson videos only to students who have paid

router.get(
    "/:packageId",
    authenticateToken,
    requireRole("student"),
    async (req, res) => {
        try {
            const accessResult = await pool.query(
                `SELECT lp.id, lp.title
                 FROM purchases p
                 JOIN lesson_packages lp ON lp.id = p.package_id
                 WHERE p.student_id = $1
                   AND p.package_id = $2
                   AND p.status = 'paid'
                   AND lp.status = 'published'`,
                [req.user.id, req.params.packageId]
            );

            if (accessResult.rows.length === 0) {
                return res.status(403).json({
                    message: "You must purchase this lesson package to access its videos.",
                });
            }

            const videosResult = await pool.query(
                `SELECT id, title, video_url, duration_seconds, position
                 FROM lesson_videos
                 WHERE package_id = $1
                 ORDER BY position ASC`,
                [req.params.packageId]
            );

            res.json({
                package_id: accessResult.rows[0].id,
                package_title: accessResult.rows[0].title,
                videos: videosResult.rows,
            });
        } catch (error) {
            console.error("Learning access error:", error.message);
            res.status(500).json({
                message: "Unable to retrieve lesson videos.",
            });
        }
    }
);


module.exports = router;
