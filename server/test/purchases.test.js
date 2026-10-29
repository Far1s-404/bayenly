const assert = require("node:assert/strict");
const test = require("node:test");
const express = require("express");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const purchasesRoutes = require("../routes/purchases");

const secret = "purchase-route-tests-use-a-long-secret";
process.env.JWT_SECRET = secret;

test("purchase retrieval reports the required migration when lesson_progress is missing", async () => {
    const originalQuery = pool.query;
    let queryText;
    pool.query = async (text) => {
        queryText = text;
        const error = new Error('relation "lesson_progress" does not exist');
        error.code = "42P01";
        throw error;
    };

    const app = express();
    app.locals.lookupAuthenticatedUser = async (id) => ({
        id,
        role: "student",
        suspended_at: null,
    });
    app.use("/api/purchases", purchasesRoutes);
    const server = app.listen(0);

    try {
        const token = jwt.sign({ sub: "42", role: "student" }, secret);
        const response = await fetch(
            `http://127.0.0.1:${server.address().port}/api/purchases/my`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        const body = await response.json();

        assert.equal(response.status, 500);
        assert.match(body.message, /lesson progress migration is missing/);
        assert.match(body.message, /npm run db:migrate/);
        assert.match(queryText, /lesson_progress/);
        assert.equal(Object.hasOwn(body, "purchases"), false);
    } finally {
        pool.query = originalQuery;
        await new Promise((resolve, reject) => {
            server.close((error) => error ? reject(error) : resolve());
        });
    }
});

test("checkout refuses to create purchases before payment integration", async () => {
    const originalQuery = pool.query;
    let writeAttempted = false;
    pool.query = async (text) => {
        if (/INSERT|UPDATE|DELETE/i.test(text)) writeAttempted = true;
        return { rows: [] };
    };
    const app = express();
    app.locals.lookupAuthenticatedUser = async (id) => ({
        id,
        role: "student",
        suspended_at: null,
    });
    app.use(express.json());
    app.use("/api/purchases", purchasesRoutes);
    const server = app.listen(0);

    try {
        const token = jwt.sign({ sub: "42", role: "student" }, secret);
        const response = await fetch(
            `http://127.0.0.1:${server.address().port}/api/purchases`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ package_id: 7 }),
            }
        );
        const body = await response.json();
        assert.equal(response.status, 503);
        assert.match(body.message, /payment provider/i);
        assert.equal(writeAttempted, false);
    } finally {
        pool.query = originalQuery;
        await new Promise((resolve, reject) => {
            server.close((error) => error ? reject(error) : resolve());
        });
    }
});
