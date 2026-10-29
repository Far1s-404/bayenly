const express = require("express");
const pool = require("../db");
const { authenticateToken, requireRole } = require("../middleware/auth");

const router = express.Router();

function validId(id) {
    return /^[1-9]\d{0,18}$/.test(id) &&
        BigInt(id) <= 9223372036854775807n;
}

async function rollback(client) {
    try {
        await client.query("ROLLBACK");
    } catch (error) {
        console.error("Admin action rollback failed:", error.message);
    }
}

router.get(
    "/overview",
    authenticateToken,
    requireRole("admin"),
    async (req, res) => {
        try {
            const result = await pool.query(`
                SELECT
                    (SELECT COUNT(*) FROM users)::int AS users,
                    (SELECT COUNT(*) FROM users WHERE suspended_at IS NOT NULL)::int AS suspended_users,
                    (SELECT COUNT(*) FROM lesson_packages WHERE status = 'published')::int AS published_packages,
                    (SELECT COUNT(*)
                     FROM lesson_videos video
                     JOIN lesson_packages package ON package.id = video.package_id
                     WHERE video.archived_at IS NULL AND package.status = 'published')::int AS active_videos,
                    (SELECT COUNT(*) FROM purchases WHERE status = 'pending')::int AS pending_purchases,
                    (SELECT COUNT(*) FROM purchases WHERE status = 'paid')::int AS paid_purchases,
                    (SELECT COUNT(*) FROM teacher_applications WHERE status = 'pending')::int AS pending_applications
            `);
            return res.json({ metrics: result.rows[0] });
        } catch (error) {
            console.error("Fetch admin overview failed:", error.message);
            return res.status(500).json({ message: "Unable to retrieve admin overview." });
        }
    }
);

router.get(
    "/users",
    authenticateToken,
    requireRole("admin"),
    async (req, res) => {
        try {
            const result = await pool.query(
                `SELECT id, name, email, role, created_at, suspended_at
                 FROM users
                 ORDER BY created_at DESC
                 LIMIT 500`
            );
            return res.json({ users: result.rows });
        } catch (error) {
            console.error("Fetch admin users failed:", error.message);
            return res.status(500).json({ message: "Unable to retrieve users." });
        }
    }
);

router.patch(
    "/users/:id/status",
    authenticateToken,
    requireRole("admin"),
    async (req, res) => {
        const { id } = req.params;
        const { suspended } = req.body;
        if (!validId(id) || typeof suspended !== "boolean") {
            return res.status(400).json({
                message: "A valid user ID and suspended boolean are required.",
            });
        }
        if (String(req.user.id) === id) {
            return res.status(400).json({ message: "You cannot suspend your own account." });
        }

        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            const result = await client.query(
                `UPDATE users
                 SET suspended_at = CASE WHEN $1 THEN COALESCE(suspended_at, NOW()) ELSE NULL END
                 WHERE id = $2 AND role <> 'admin'
                 RETURNING id, name, email, role, created_at, suspended_at`,
                [suspended, id]
            );
            if (result.rows.length === 0) {
                await client.query("ROLLBACK");
                return res.status(404).json({
                    message: "User not found or administrator accounts cannot be suspended here.",
                });
            }
            await client.query(
                `INSERT INTO admin_action_audit (admin_id, action, target_type, target_id)
                 VALUES ($1, $2, 'user', $3)`,
                [req.user.id, suspended ? "suspend_user" : "restore_user", id]
            );
            await client.query("COMMIT");
            return res.json({ user: result.rows[0] });
        } catch (error) {
            await rollback(client);
            console.error("Update user suspension failed:", error.message);
            return res.status(500).json({ message: "Unable to update account status." });
        } finally {
            client.release();
        }
    }
);

router.get(
    "/packages",
    authenticateToken,
    requireRole("admin"),
    async (req, res) => {
        try {
            const result = await pool.query(
                `SELECT lp.id, lp.title, lp.subject, lp.status, lp.price,
                        lp.created_at, u.name AS teacher_name,
                        COUNT(lv.id) FILTER (WHERE lv.archived_at IS NULL)::int AS active_video_count,
                        COUNT(lv.id) FILTER (WHERE lv.archived_at IS NOT NULL)::int AS archived_video_count
                 FROM lesson_packages lp
                 JOIN users u ON u.id = lp.teacher_id
                 LEFT JOIN lesson_videos lv ON lv.package_id = lp.id
                 GROUP BY lp.id, u.name
                 ORDER BY lp.created_at DESC
                 LIMIT 500`
            );
            return res.json({ packages: result.rows });
        } catch (error) {
            console.error("Fetch admin packages failed:", error.message);
            return res.status(500).json({ message: "Unable to retrieve packages." });
        }
    }
);

router.patch(
    "/packages/:id/archive",
    authenticateToken,
    requireRole("admin"),
    async (req, res) => {
        const { id } = req.params;
        const { archived } = req.body;
        if (!validId(id) || typeof archived !== "boolean") {
            return res.status(400).json({
                message: "A valid package ID and archived boolean are required.",
            });
        }

        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            const result = await client.query(
                `UPDATE lesson_packages
                 SET status = CASE WHEN $1 THEN 'archived' ELSE 'draft' END,
                     updated_at = NOW()
                 WHERE id = $2
                   AND (($1 AND status <> 'archived') OR (NOT $1 AND status = 'archived'))
                 RETURNING id, title, subject, status`,
                [archived, id]
            );
            if (result.rows.length === 0) {
                await client.query("ROLLBACK");
                return res.status(404).json({
                    message: "Package not found or it is not in a state that can be changed.",
                });
            }
            await client.query(
                `INSERT INTO admin_action_audit (admin_id, action, target_type, target_id)
                 VALUES ($1, $2, 'package', $3)`,
                [req.user.id, archived ? "archive_package" : "restore_package", id]
            );
            await client.query("COMMIT");
            return res.json({ package: result.rows[0] });
        } catch (error) {
            await rollback(client);
            console.error("Update package moderation failed:", error.message);
            return res.status(500).json({ message: "Unable to update package status." });
        } finally {
            client.release();
        }
    }
);

router.get(
    "/videos",
    authenticateToken,
    requireRole("admin"),
    async (req, res) => {
        try {
            const result = await pool.query(
                `SELECT lv.id, lv.title, lv.package_id, lv.position, lv.archived_at,
                        lp.title AS package_title, u.name AS teacher_name
                 FROM lesson_videos lv
                 JOIN lesson_packages lp ON lp.id = lv.package_id
                 JOIN users u ON u.id = lp.teacher_id
                 ORDER BY lv.created_at DESC
                 LIMIT 500`
            );
            return res.json({ videos: result.rows });
        } catch (error) {
            console.error("Fetch admin videos failed:", error.message);
            return res.status(500).json({ message: "Unable to retrieve videos." });
        }
    }
);

router.patch(
    "/videos/:id/archive",
    authenticateToken,
    requireRole("admin"),
    async (req, res) => {
        const { id } = req.params;
        const { archived } = req.body;
        if (!validId(id) || typeof archived !== "boolean") {
            return res.status(400).json({
                message: "A valid video ID and archived boolean are required.",
            });
        }

        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            const result = await client.query(
                `UPDATE lesson_videos
                 SET archived_at = CASE WHEN $1 THEN COALESCE(archived_at, NOW()) ELSE NULL END
                 WHERE id = $2
                 RETURNING id, title, package_id, position, archived_at`,
                [archived, id]
            );
            if (result.rows.length === 0) {
                await client.query("ROLLBACK");
                return res.status(404).json({ message: "Video not found." });
            }
            await client.query(
                `INSERT INTO admin_action_audit (admin_id, action, target_type, target_id)
                 VALUES ($1, $2, 'video', $3)`,
                [req.user.id, archived ? "archive_video" : "restore_video", id]
            );
            await client.query("COMMIT");
            return res.json({ video: result.rows[0] });
        } catch (error) {
            await rollback(client);
            console.error("Update video moderation failed:", error.message);
            return res.status(500).json({ message: "Unable to update video status." });
        } finally {
            client.release();
        }
    }
);

router.get(
    "/orders",
    authenticateToken,
    requireRole("admin"),
    async (req, res) => {
        try {
            const result = await pool.query(
                `SELECT p.id, p.amount, p.status, p.created_at,
                        student.name AS student_name,
                        package.title AS package_title
                 FROM purchases p
                 JOIN users student ON student.id = p.student_id
                 JOIN lesson_packages package ON package.id = p.package_id
                 ORDER BY p.created_at DESC
                 LIMIT 500`
            );
            return res.json({ orders: result.rows });
        } catch (error) {
            console.error("Fetch admin purchases failed:", error.message);
            return res.status(500).json({ message: "Unable to retrieve purchases." });
        }
    }
);

router.get(
    "/audit",
    authenticateToken,
    requireRole("admin"),
    async (req, res) => {
        try {
            const result = await pool.query(
                `SELECT audit.id, audit.action, audit.target_type,
                        audit.target_id, audit.created_at, admin.name AS admin_name
                 FROM admin_action_audit audit
                 JOIN users admin ON admin.id = audit.admin_id
                 ORDER BY audit.created_at DESC
                 LIMIT 100`
            );
            return res.json({ entries: result.rows });
        } catch (error) {
            console.error("Fetch admin audit log failed:", error.message);
            return res.status(500).json({ message: "Unable to retrieve audit log." });
        }
    }
);

router.get(
    "/teacher-applications",
    authenticateToken,
    requireRole("admin"),
    async (req, res) => {
        try {
            const result = await pool.query(
                `SELECT application.id, application.specialization, application.bio,
                        application.status, application.created_at,
                        users.name, users.email
                 FROM teacher_applications AS application
                 JOIN users ON users.id = application.user_id
                 ORDER BY application.created_at DESC`
            );

            return res.json({ applications: result.rows });
        } catch (error) {
            console.error("Fetch teacher applications for review failed:", error.message);
            return res.status(500).json({
                message: "Unable to retrieve teacher applications.",
            });
        }
    }
);

router.patch(
    "/teacher-applications/:id",
    authenticateToken,
    requireRole("admin"),
    async (req, res) => {
        const { id } = req.params;
        const { status } = req.body;

        if (
            !/^[1-9]\d{0,18}$/.test(id) ||
            BigInt(id) > 9223372036854775807n ||
            !["approved", "rejected"].includes(status)
        ) {
            return res.status(400).json({
                message: "A valid application ID and approved or rejected status are required.",
            });
        }

        let client;
        let transactionStarted = false;

        try {
            client = await pool.connect();
            await client.query("BEGIN");
            transactionStarted = true;

            const existing = await client.query(
                `SELECT id, user_id, status
                 FROM teacher_applications
                 WHERE id = $1
                 FOR UPDATE`,
                [id]
            );

            if (existing.rows.length === 0) {
                await client.query("ROLLBACK");
                transactionStarted = false;
                return res.status(404).json({
                    message: "Teacher application not found.",
                });
            }

            if (existing.rows[0].status !== "pending") {
                await client.query("ROLLBACK");
                transactionStarted = false;
                return res.status(409).json({
                    message: "This teacher application has already been reviewed.",
                });
            }

            if (status === "approved") {
                await client.query(
                    "UPDATE users SET role = 'teacher' WHERE id = $1",
                    [existing.rows[0].user_id]
                );
            }

            const updated = await client.query(
                `UPDATE teacher_applications
                 SET status = $1, updated_at = NOW()
                 WHERE id = $2 AND status = 'pending'
                 RETURNING id, specialization, bio, status, created_at`,
                [status, id]
            );

            await client.query(
                `INSERT INTO admin_action_audit (admin_id, action, target_type, target_id, details)
                 VALUES ($1, $2, 'teacher_application', $3, $4::jsonb)`,
                [
                    req.user.id,
                    status === "approved" ? "approve_teacher_application" : "reject_teacher_application",
                    id,
                    JSON.stringify({ applicant_id: existing.rows[0].user_id }),
                ]
            );

            await client.query("COMMIT");
            transactionStarted = false;

            return res.json({ application: updated.rows[0] });
        } catch (error) {
            if (transactionStarted) {
                try {
                    await client.query("ROLLBACK");
                } catch (rollbackError) {
                    console.error("Teacher application rollback failed:", rollbackError.message);
                }
            }
            console.error("Review teacher application failed:", error.message);
            return res.status(500).json({
                message: "Unable to review teacher application.",
            });
        } finally {
            client?.release();
        }
    }
);

module.exports = router;
