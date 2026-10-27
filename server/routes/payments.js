
const express = require("express");
const pool = require("../db");
const {
    authenticateToken,
    requireRole,
} = require("../middleware/auth");

const router = express.Router();

// POST /api/payments/simulate
// DEVELOPMENT ONLY — simulate a successful payment
router.post(
    "/simulate",
    authenticateToken,
    requireRole("student"),
    async (req, res) => {
        if (
            process.env.NODE_ENV === "production" ||
            process.env.PAYMENTS_SIMULATION_ENABLED !== "true"
        ) {
            return res.status(503).json({
                message: "Payments are not configured. No payment was taken.",
            });
        }

        const client = await pool.connect();

        try {
            const { purchase_id } = req.body;

            if (!Number.isSafeInteger(purchase_id) || purchase_id <= 0) {
                return res.status(400).json({
                    message: "A valid purchase_id is required.",
                });
            }

            await client.query("BEGIN");

            const purchaseResult = await client.query(
                `SELECT id, student_id, package_id, amount, status
                 FROM purchases
                 WHERE id = $1 AND student_id = $2
                 FOR UPDATE`,
                [purchase_id, req.user.id]
            );

            if (purchaseResult.rows.length === 0) {
                await client.query("ROLLBACK");
                return res.status(404).json({
                    message: "Purchase not found.",
                });
            }

            const purchase = purchaseResult.rows[0];

            if (purchase.status === "paid") {
                await client.query("ROLLBACK");
                return res.status(409).json({
                    message: "This purchase is already paid.",
                });
            }

            if (purchase.status !== "pending") {
                await client.query("ROLLBACK");
                return res.status(400).json({
                    message: "This purchase cannot be paid.",
                });
            }

            const paymentResult = await client.query(
                `INSERT INTO payments
                    (purchase_id, provider, provider_reference, amount, status)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING id, purchase_id, amount, status, created_at`,
                [
                    purchase.id,
                    "simulation",
                    `SIM-${purchase.id}-${Date.now()}`,
                    purchase.amount,
                    "succeeded",
                ]
            );

            await client.query(
                `UPDATE purchases
                 SET status = 'paid', purchased_at = NOW()
                 WHERE id = $1`,
                [purchase.id]
            );

            await client.query("COMMIT");

            res.json({
                message: "Simulated payment successful. Lesson access unlocked.",
                payment: paymentResult.rows[0],
            });
        } catch (error) {
            await client.query("ROLLBACK");
            console.error("Payment simulation error:", error.message);

            res.status(500).json({
                message: "Unable to process simulated payment.",
            });
        } finally {
            client.release();
        }
    }
);

module.exports = router;
