
const express = require("express");
const pool = require("../db");
const { authenticateToken, requireRole } = require("../middleware/auth");

const router = express.Router();

// Get the logged-in teacher's lesson packages
router.get(
"/my",
authenticateToken,
requireRole("teacher", "admin"),
async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, title, description, subject, price,
                    language, status, created_at, updated_at
                FROM lesson_packages
                WHERE teacher_id = $1
                ORDER BY created_at DESC`,
            [req.user.id]
        );

        res.json({ packages: result.rows });
    } catch (error) {
        console.error("Fetch packages error:", error.message);
        res.status(500).json({
            message: "Unable to retrieve lesson packages.",
        });
    }
}
);

// Create a lesson package
router.post(
"/",
authenticateToken,
requireRole("teacher", "admin"),
async (req, res) => {
    try {
        const { title, description, subject, price, language } = req.body;

        if (
            typeof title !== "string" ||
            typeof description !== "string" ||
            typeof subject !== "string" ||
            !title.trim() ||
            !description.trim() ||
            !subject.trim()
        ) {
            return res.status(400).json({
                message: "Title, description, and subject are required.",
            });
        }

        if (
            title.trim().length > 200 ||
            description.trim().length > 10000 ||
            subject.trim().length > 100
        ) {
            return res.status(400).json({
                message: "One or more fields exceed the allowed length.",
            });
        }

        if (
            typeof price !== "number" ||
            !Number.isFinite(price) ||
            price <= 0
        ) {
            return res.status(400).json({
                message: "Price must be a number greater than zero.",
            });
        }

        if (!["ar", "en"].includes(language)) {
            return res.status(400).json({
                message: "Language must be 'ar' or 'en'.",
            });
        }

        const result = await pool.query(
            `INSERT INTO lesson_packages
                (teacher_id, title, description, subject, price, language, status)
                VALUES ($1, $2, $3, $4, $5, $6, 'draft')
                RETURNING id, teacher_id, title, description, subject,
                        price, language, status, created_at, updated_at`,
            [
                req.user.id,
                title.trim(),
                description.trim(),
                subject.trim(),
                price,
                language,
            ]
        );

        res.status(201).json({
            message: "Lesson package created as a draft.",
            package: result.rows[0],
        });
    } catch (error) {
        console.error("Create package error:", error.message);
        res.status(500).json({
            message: "Unable to create lesson package.",
        });
    }
}
);


router.put(
"/:id",
authenticateToken,
requireRole("teacher", "admin"),
async (req, res) => {
    try {
        const { title, description, subject, price, language } = req.body;

        if (
            typeof title !== "string" ||
            typeof description !== "string" ||
            typeof subject !== "string" ||
            !title.trim() ||
            !description.trim() ||
            !subject.trim() ||
            title.trim().length > 200 ||
            description.trim().length > 10000 ||
            subject.trim().length > 100
        ) {
            return res.status(400).json({
                message: "Please provide valid title, description, and subject.",
            });
        }

        if (
            typeof price !== "number" ||
            !Number.isFinite(price) ||
            price <= 0
        ) {
            return res.status(400).json({
                message: "Price must be a number greater than zero.",
            });
        }

        if (!["ar", "en"].includes(language)) {
            return res.status(400).json({
                message: "Language must be 'ar' or 'en'.",
            });
        }

        const result = await pool.query(
            `UPDATE lesson_packages
                SET title = $1,
                    description = $2,
                    subject = $3,
                    price = $4,
                    language = $5,
                    updated_at = NOW()
                WHERE id = $6 AND teacher_id = $7
                RETURNING id, title, description, subject, price,
                        language, status, updated_at`,
            [
                title.trim(),
                description.trim(),
                subject.trim(),
                price,
                language,
                req.params.id,
                req.user.id,
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Lesson package not found.",
            });
        }

        res.json({
            message: "Lesson package updated successfully.",
            package: result.rows[0],
        });
    } catch (error) {
        console.error("Update package error:", error.message);
        res.status(500).json({
            message: "Unable to update lesson package.",
        });
    }
}
);

// Publish a lesson package
router.patch(
"/:id/publish",
authenticateToken,
requireRole("teacher", "admin"),
async (req, res) => {
    try {
        const videoCheck = await pool.query(
    `SELECT COUNT(*) AS video_count
     FROM lesson_videos
     WHERE package_id = $1`,
    [req.params.id]
);

if (Number(videoCheck.rows[0].video_count) === 0) {
    return res.status(400).json({
        message: "Add at least one video before publishing."
    });
}
        const result = await pool.query(
            `UPDATE lesson_packages
                SET status = 'published',
                    updated_at = NOW()
                WHERE id = $1
                AND teacher_id = $2
                AND status = 'draft'
                RETURNING id, title, subject, price, language, status`,
            [req.params.id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Draft package not found.",
            });
        }

        res.json({
            message: "Lesson package published successfully.",
            package: result.rows[0],
        });
    } catch (error) {
        console.error("Publish package error:", error.message);
        res.status(500).json({
            message: "Unable to publish lesson package.",
        });
    }
}
);


// POST /api/lessons/:id/videos
router.post(
"/:id/videos",
authenticateToken,
requireRole("teacher", "admin"),
async (req, res) => {
    try {
        const { title, video_url, duration_seconds, position } = req.body;

        if (
            typeof title !== "string" ||
            !title.trim() ||
            title.trim().length > 200
        ) {
            return res.status(400).json({
                message: "A valid video title is required.",
            });
        }

        if (
            typeof video_url !== "string" ||
            !video_url.trim() ||
            video_url.trim().length > 2048
        ) {
            return res.status(400).json({
                message: "A valid video URL is required.",
            });
        }

        if (
            duration_seconds !== undefined &&
            duration_seconds !== null &&
            (!Number.isInteger(duration_seconds) || duration_seconds < 0)
        ) {
            return res.status(400).json({
                message: "Duration must be a non-negative integer.",
            });
        }

        if (!Number.isInteger(position) || position < 1) {
            return res.status(400).json({
                message: "Position must be a positive integer.",
            });
        }

        const packageResult = await pool.query(
            `SELECT id, status
                FROM lesson_packages
                WHERE id = $1 AND teacher_id = $2`,
            [req.params.id, req.user.id]
        );

        if (packageResult.rows.length === 0) {
            return res.status(404).json({
                message: "Lesson package not found.",
            });
        }

        if (packageResult.rows[0].status !== "draft") {
            return res.status(400).json({
                message: "Only draft packages can be edited.",
            });
        }

        const result = await pool.query(
            `INSERT INTO lesson_videos
                (package_id, title, video_url, duration_seconds, position)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id, package_id, title, video_url,
                        duration_seconds, position, created_at`,
            [
                req.params.id,
                title.trim(),
                video_url.trim(),
                duration_seconds ?? null,
                position,
            ]
        );

        res.status(201).json({
            message: "Video added successfully.",
            video: result.rows[0],
        });
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                message: "That video position is already in use.",
            });
        }

        if (error.code === "23503") {
            return res.status(400).json({
                message: "Invalid lesson package.",
            });
        }

        console.error("Add video error:", error.message);
        res.status(500).json({
            message: "Unable to add video.",
        });
    }
}
);

// GET /api/lessons/:id/videos
router.get(
"/:id/videos",
authenticateToken,
requireRole("teacher", "admin"),
async (req, res) => {
    try {
        const packageResult = await pool.query(
            `SELECT id
                FROM lesson_packages
                WHERE id = $1 AND teacher_id = $2`,
            [req.params.id, req.user.id]
        );

        if (packageResult.rows.length === 0) {
            return res.status(404).json({
                message: "Lesson package not found.",
            });
        }

        const result = await pool.query(
            `SELECT id, package_id, title, video_url,
                    duration_seconds, position, created_at
                FROM lesson_videos
                WHERE package_id = $1
                ORDER BY position ASC`,
            [req.params.id]
        );

        res.json({ videos: result.rows });
    } catch (error) {
        console.error("Fetch videos error:", error.message);
        res.status(500).json({
            message: "Unable to retrieve videos.",
        });
    }
}
);

// DELETE /api/lessons/:id/videos/:videoId
router.delete(
"/:id/videos/:videoId",
authenticateToken,
requireRole("teacher", "admin"),
async (req, res) => {
    try {
        const result = await pool.query(
            `DELETE FROM lesson_videos
                WHERE id = $1
                AND package_id = $2
                AND package_id IN (
                    SELECT id
                    FROM lesson_packages
                    WHERE teacher_id = $3
                        AND status = 'draft'
                )
                RETURNING id`,
            [req.params.videoId, req.params.id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Video not found in your draft package.",
            });
        }

        res.json({ message: "Video deleted successfully." });
    } catch (error) {
        console.error("Delete video error:", error.message);
        res.status(500).json({
            message: "Unable to delete video.",
        });
    }
}
);


module.exports = router;
