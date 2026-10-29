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
    app.locals.lookupAuthenticatedUser = async (id) => ({
        id,
        role,
        suspended_at: null,
    });
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

test("student accounts cannot read admin account or video controls", async () => {
    const originalQuery = pool.query;
    let queryCalled = false;
    pool.query = async () => {
        queryCalled = true;
        return { rows: [] };
    };

    try {
        const users = await request("/api/admin/users", { role: "student" });
        const videos = await request("/api/admin/videos", { role: "student" });
        assert.equal(users.status, 403);
        assert.equal(videos.status, 403);
        assert.equal(queryCalled, false);
    } finally {
        pool.query = originalQuery;
    }
});

test("admin can suspend and restore a non-admin account with an audit record", async () => {
    const originalConnect = pool.connect;
    const statements = [];
    pool.connect = async () => ({
        async query(text, values) {
            statements.push({ text, values });
            if (text.includes("UPDATE users")) {
                return {
                    rows: [{
                        id: "42",
                        name: "Student",
                        email: "student@example.test",
                        role: "student",
                        suspended_at: "2026-10-29T00:00:00.000Z",
                    }],
                };
            }
            return { rows: [] };
        },
        release() {},
    });

    try {
        const result = await request(
            "/api/admin/users/42/status",
            { method: "PATCH", body: { suspended: true, role: "admin" } }
        );
        assert.equal(result.status, 200);
        assert.equal(result.body.user.suspended_at, "2026-10-29T00:00:00.000Z");
        const update = statements.find(({ text }) => text.includes("UPDATE users"));
        assert.match(update.text, /WHERE id = \$2 AND role <> 'admin'/);
        assert.deepEqual(update.values, [true, "42"]);
        assert.ok(statements.some(({ text, values }) =>
            text.includes("INSERT INTO admin_action_audit") && values[1] === "suspend_user"
        ));
        assert.ok(statements.some(({ text }) => text === "COMMIT"));
    } finally {
        pool.connect = originalConnect;
    }
});

test("admin cannot suspend their own account", async () => {
    const originalConnect = pool.connect;
    let connectCalled = false;
    pool.connect = async () => {
        connectCalled = true;
        throw new Error("Should not connect");
    };

    try {
        const result = await request(
            "/api/admin/users/7/status",
            { method: "PATCH", body: { suspended: true } }
        );
        assert.equal(result.status, 400);
        assert.equal(connectCalled, false);
    } finally {
        pool.connect = originalConnect;
    }
});

test("admin can archive and restore videos without deleting their records", async () => {
    const originalConnect = pool.connect;
    const statements = [];
    pool.connect = async () => ({
        async query(text, values) {
            statements.push({ text, values });
            if (text.includes("UPDATE lesson_videos")) {
                return { rows: [{ id: "23", title: "Video", archived_at: new Date().toISOString() }] };
            }
            return { rows: [] };
        },
        release() {},
    });

    try {
        const result = await request(
            "/api/admin/videos/23/archive",
            { method: "PATCH", body: { archived: true } }
        );
        assert.equal(result.status, 200);
        assert.match(statements.find(({ text }) => text.includes("UPDATE lesson_videos")).text, /SET archived_at/);
        assert.ok(statements.some(({ text }) => text.includes("INSERT INTO admin_action_audit")));
        assert.ok(statements.some(({ text }) => text === "COMMIT"));
    } finally {
        pool.connect = originalConnect;
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
