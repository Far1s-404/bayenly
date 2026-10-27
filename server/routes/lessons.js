
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


module.exports = router;
