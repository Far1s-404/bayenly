const express = require("express");
const pool = require("../db");
const { authenticateToken, requireRole } = require("../middleware/auth");

const router = express.Router();

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
