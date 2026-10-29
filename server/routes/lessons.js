
const express = require("express");
const pool = require("../db");
const { authenticateToken, requireRole } = require("../middleware/auth");

const router = express.Router();

function isValidPrice(price) {
    return (
        typeof price === "number" &&
        Number.isFinite(price) &&
        price > 0 &&
        price <= 99999999.99 &&
        Number(price.toFixed(2)) === price
    );
}

function validateIdParam(req, res, next, value) {
    if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) {
        return res.status(400).json({
            message: "A valid ID is required.",
        });
    }

    next();
}

router.param("id", validateIdParam);
router.param("videoId", validateIdParam);

// Get the logged-in teacher's lesson packages
router.get(
"/my",
authenticateToken,
requireRole("teacher", "admin"),
async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT lp.id, lp.title, lp.description, lp.subject, lp.price,
                    lp.language, lp.status, lp.created_at, lp.updated_at,
                    COUNT(lv.id) FILTER (WHERE lv.archived_at IS NULL)::int AS video_count
             FROM lesson_packages lp
             LEFT JOIN lesson_videos lv ON lv.package_id = lp.id
             WHERE lp.teacher_id = $1
             GROUP BY lp.id
             ORDER BY lp.created_at DESC`,
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
            !isValidPrice(price)
        ) {
            return res.status(400).json({
                message: "Price must be positive, fit the supported range, and have at most two decimal places.",
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
            !isValidPrice(price)
        ) {
            return res.status(400).json({
                message: "Price must be positive, fit the supported range, and have at most two decimal places.",
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
        const result = await pool.query(
            `UPDATE lesson_packages
                SET status = 'published',
                    updated_at = NOW()
                WHERE id = $1
                AND teacher_id = $2
                AND status = 'draft'
                AND EXISTS (
                    SELECT 1
                    FROM lesson_videos
                    WHERE package_id = lesson_packages.id
                      AND archived_at IS NULL
                )
                RETURNING id, title, subject, price, language, status`,
            [req.params.id, req.user.id]
        );

        if (result.rows.length === 0) {
            const ownedDraft = await pool.query(
                `SELECT id
                 FROM lesson_packages
                 WHERE id = $1
                   AND teacher_id = $2
                   AND status = 'draft'`,
                [req.params.id, req.user.id]
            );

            if (ownedDraft.rows.length > 0) {
                return res.status(400).json({
                    message: "Add at least one video before publishing.",
                });
            }

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

        let parsedVideoUrl;

        try {
            parsedVideoUrl = new URL(video_url.trim());
        } catch {
            return res.status(400).json({
                message: "Video URL must be an absolute HTTP or HTTPS URL.",
            });
        }

        if (
            !["http:", "https:"].includes(parsedVideoUrl.protocol) ||
            parsedVideoUrl.username ||
            parsedVideoUrl.password
        ) {
            return res.status(400).json({
                message: "Video URL must be an absolute HTTP or HTTPS URL.",
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

        const result = await pool.query(
            `INSERT INTO lesson_videos
                (package_id, title, video_url, duration_seconds, position)
             SELECT lp.id, $2, $3, $4, $5
             FROM lesson_packages lp
             WHERE lp.id = $1
               AND lp.teacher_id = $6
               AND lp.status = 'draft'
             RETURNING id, package_id, title, video_url,
                       duration_seconds, position, created_at`,
            [
                req.params.id,
                title.trim(),
                video_url.trim(),
                duration_seconds ?? null,
                position,
                req.user.id,
            ]
        );

        if (result.rows.length === 0) {
            const packageResult = await pool.query(
                `SELECT status
                 FROM lesson_packages
                 WHERE id = $1 AND teacher_id = $2`,
                [req.params.id, req.user.id]
            );

            if (packageResult.rows.length === 0) {
                return res.status(404).json({
                    message: "Lesson package not found.",
                });
            }

            return res.status(400).json({
                message: "Only draft packages can be edited.",
            });
        }

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

router.put(
"/:id/videos/:videoId",
authenticateToken,
requireRole("teacher", "admin"),
async (req, res) => {
    try {
        const { title, video_url, duration_seconds } = req.body;

        if (
            typeof title !== "string" ||
            !title.trim() ||
            title.trim().length > 200 ||
            typeof video_url !== "string" ||
            !video_url.trim() ||
            video_url.trim().length > 2048
        ) {
            return res.status(400).json({
                message: "A valid video title and URL are required.",
            });
        }

        let parsedVideoUrl;
        try {
            parsedVideoUrl = new URL(video_url.trim());
        } catch {
            return res.status(400).json({
                message: "Video URL must be an absolute HTTP or HTTPS URL.",
            });
        }

        if (
            !["http:", "https:"].includes(parsedVideoUrl.protocol) ||
            parsedVideoUrl.username ||
            parsedVideoUrl.password
        ) {
            return res.status(400).json({
                message: "Video URL must be an absolute HTTP or HTTPS URL.",
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

        const result = await pool.query(
            `UPDATE lesson_videos lv
             SET title = $3,
                 video_url = $4,
                 duration_seconds = $5
             FROM lesson_packages lp
             WHERE lv.id = $1
               AND lv.package_id = $2
               AND lp.id = lv.package_id
               AND lp.teacher_id = $6
               AND lp.status = 'draft'
             RETURNING lv.id, lv.package_id, lv.title, lv.video_url,
                       lv.duration_seconds, lv.position, lv.created_at`,
            [
                req.params.videoId,
                req.params.id,
                title.trim(),
                video_url.trim(),
                duration_seconds ?? null,
                req.user.id,
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Video not found in your draft package.",
            });
        }

        return res.json({
            message: "Video updated successfully.",
            video: result.rows[0],
        });
    } catch (error) {
        console.error("Update video error:", error.message);
        return res.status(500).json({
            message: "Unable to update video.",
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
                WHERE package_id = $1 AND archived_at IS NULL
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


// GET /api/lessons
// Publicly list published lesson packages
router.get("/", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                lp.id,
                lp.title,
                lp.description,
                lp.subject,
                lp.price,
                lp.language,
                lp.created_at,
                u.name AS teacher_name,
                tp.specialization AS teacher_specialization,
                COUNT(lv.id)::int AS video_count
             FROM lesson_packages lp
             JOIN users u ON u.id = lp.teacher_id
             LEFT JOIN teacher_profiles tp ON tp.user_id = u.id
             LEFT JOIN lesson_videos lv
                ON lv.package_id = lp.id AND lv.archived_at IS NULL
             WHERE lp.status = 'published'
             GROUP BY
                lp.id,
                u.name,
                tp.specialization
             ORDER BY lp.created_at DESC`
        );

        res.json({ packages: result.rows });
    } catch (error) {
        console.error("Browse lessons error:", error.message);

        res.status(500).json({
            message: "Unable to retrieve published lessons."
        });
    }
});


// GET /api/lessons/:id
// Public details for one published lesson package
router.get("/:id", async (req, res) => {
    try {
        const packageResult = await pool.query(
            `SELECT
                lp.id,
                lp.title,
                lp.description,
                lp.subject,
                lp.price,
                lp.language,
                lp.created_at,
                u.name AS teacher_name,
                tp.specialization AS teacher_specialization,
                COUNT(lv.id)::int AS video_count
             FROM lesson_packages lp
             JOIN users u ON u.id = lp.teacher_id
             LEFT JOIN teacher_profiles tp ON tp.user_id = u.id
             LEFT JOIN lesson_videos lv
                ON lv.package_id = lp.id AND lv.archived_at IS NULL
             WHERE lp.id = $1
               AND lp.status = 'published'
             GROUP BY lp.id, u.name, tp.specialization`,
            [req.params.id]
        );

        if (packageResult.rows.length === 0) {
            return res.status(404).json({
                message: "Published lesson package not found."
            });
        }

        const videosResult = await pool.query(
            `SELECT id, title, duration_seconds, position
             FROM lesson_videos
             WHERE package_id = $1 AND archived_at IS NULL
             ORDER BY position ASC`,
            [req.params.id]
        );

        res.json({
            package: packageResult.rows[0],
            videos: videosResult.rows
        });
    } catch (error) {
        console.error("Fetch lesson details error:", error.message);

        res.status(500).json({
            message: "Unable to retrieve lesson details."
        });
    }
});


module.exports = router;
