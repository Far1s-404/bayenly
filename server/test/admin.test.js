const assert = require("node:assert/strict");
const test = require("node:test");
const express = require("express");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const adminRoutes = require("../routes/admin");

const secret = "admin-route-tests-use-a-long-secret-value";
process.env.JWT_SECRET = secret;

async function request(path, { method = "GET", body, role = "admin", authenticated = true } = {}) {
    const app = express();
    app.use(express.json());
    app.use("/api/admin", adminRoutes);
    const server = app.listen(0);

    try {
        const headers = {};
        if (authenticated) {
            headers.Authorization = `Bearer ${jwt.sign({ sub: "7", role }, secret)}`;
        }
        if (body) headers["Content-Type"] = "application/json";
        const response = await fetch(
            `http://127.0.0.1:${server.address().port}${path}`,
            {
                method,
                headers,
                ...(body ? { body: JSON.stringify(body) } : {}),
            }
        );
        return { status: response.status, body: await response.json() };
    } finally {
        await new Promise((resolve, reject) => {
            server.close((error) => error ? reject(error) : resolve());
        });
    }
}

test("teacher application review requires an authenticated admin", async () => {
    const originalQuery = pool.query;
    let queryCalled = false;
    pool.query = async () => {
        queryCalled = true;
        return { rows: [] };
    };

    try {
        const unauthenticated = await request(
            "/api/admin/teacher-applications",
            { authenticated: false }
        );
        const student = await request(
            "/api/admin/teacher-applications",
            { role: "student" }
        );

        assert.equal(unauthenticated.status, 401);
        assert.equal(student.status, 403);
        assert.equal(queryCalled, false);
    } finally {
        pool.query = originalQuery;
    }
});

test("admin approval atomically records approval and grants teacher role", async () => {
    const originalConnect = pool.connect;
    const statements = [];
    pool.connect = async () => ({
        async query(text, values) {
            statements.push({ text, values });
            if (text.includes("SELECT id, user_id, status")) {
                return { rows: [{ id: "19", user_id: "42", status: "pending" }] };
            }
            if (text.includes("UPDATE teacher_applications")) {
                return {
                    rows: [{
                        id: "19",
                        specialization: "Mathematics",
                        bio: "Experienced teacher.",
                        status: values[0],
                    }],
                };
            }
            return { rows: [] };
        },
        release() {},
    });

    try {
        const result = await request(
            "/api/admin/teacher-applications/19",
            { method: "PATCH", body: { status: "approved", user_id: "999" } }
        );

        assert.equal(result.status, 200);
        assert.equal(result.body.application.status, "approved");
        assert.equal(statements[0].text, "BEGIN");
        const roleUpdate = statements.find(({ text }) => text.includes("UPDATE users"));
        assert.match(roleUpdate.text, /SET role = 'teacher'/);
        assert.deepEqual(roleUpdate.values, ["42"]);
        assert.ok(statements.some(({ text }) => text === "COMMIT"));
        assert.ok(statements.some(({ text, values }) =>
            text.includes("UPDATE teacher_applications") && values[0] === "approved"
        ));
    } finally {
        pool.connect = originalConnect;
    }
});

test("reviewing an already processed application does not grant a role", async () => {
    const originalConnect = pool.connect;
    const statements = [];
    pool.connect = async () => ({
        async query(text) {
            statements.push(text);
            if (text.includes("SELECT id, user_id, status")) {
                return { rows: [{ id: "19", user_id: "42", status: "rejected" }] };
            }
            return { rows: [] };
        },
        release() {},
    });

    try {
        const result = await request(
            "/api/admin/teacher-applications/19",
            { method: "PATCH", body: { status: "approved" } }
        );

        assert.equal(result.status, 409);
        assert.ok(statements.includes("ROLLBACK"));
        assert.equal(statements.some((text) => text.includes("UPDATE users")), false);
    } finally {
        pool.connect = originalConnect;
    }
});
