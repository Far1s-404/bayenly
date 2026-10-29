const assert = require("node:assert/strict");
const test = require("node:test");
const express = require("express");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const teacherApplications = require("../routes/teacherApplications");
const lessons = require("../routes/lessons");

const secret = "teacher-application-tests-use-a-long-secret";
process.env.JWT_SECRET = secret;

async function request(routes, path, { method = "GET", body, role = "student" } = {}) {
    const app = express();
    app.use(express.json());
    for (const [prefix, router] of routes) app.use(prefix, router);
    const server = app.listen(0);

    try {
        const token = jwt.sign({ sub: "42", role }, secret);
        const response = await fetch(
            `http://127.0.0.1:${server.address().port}${path}`,
            {
                method,
                headers: {
                    Authorization: `Bearer ${token}`,
                    ...(body ? { "Content-Type": "application/json" } : {}),
                },
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

async function requestWithoutAuthentication(routes, path) {
    const app = express();
    app.use(express.json());
    for (const [prefix, router] of routes) app.use(prefix, router);
    const server = app.listen(0);

    try {
        const response = await fetch(
            `http://127.0.0.1:${server.address().port}${path}`
        );
        return { status: response.status, body: await response.json() };
    } finally {
        await new Promise((resolve, reject) => {
            server.close((error) => error ? reject(error) : resolve());
        });
    }
}

test("student retrieves their application using the authenticated user ID", async () => {
    const originalQuery = pool.query;
    let queryText;
    let queryValues;
    pool.query = async (text, values) => {
        queryText = text;
        queryValues = values;
        return {
            rows: [{
                id: "5",
                specialization: "Mathematics",
                bio: "I have taught mathematics for five years.",
                status: "pending",
                created_at: "2026-10-28T00:00:00.000Z",
            }],
        };
    };

    try {
        const result = await request(
            [["/api/teacher-applications", teacherApplications]],
            "/api/teacher-applications/my?userId=99"
        );

        assert.equal(result.status, 200);
        assert.equal(result.body.application.status, "pending");
        assert.match(queryText, /FROM teacher_applications\s+WHERE user_id = \$1/);
        assert.deepEqual(queryValues, ["42"]);
    } finally {
        pool.query = originalQuery;
    }
});

test("student without an application receives a null application", async () => {
    const originalQuery = pool.query;
    pool.query = async () => ({ rows: [] });

    try {
        const result = await request(
            [["/api/teacher-applications", teacherApplications]],
            "/api/teacher-applications/my"
        );

        assert.equal(result.status, 200);
        assert.deepEqual(result.body, { application: null });
    } finally {
        pool.query = originalQuery;
    }
});

test("teacher application retrieval rejects unauthenticated and non-student users", async () => {
    const originalQuery = pool.query;
    let queryCalled = false;
    pool.query = async () => {
        queryCalled = true;
        return { rows: [] };
    };

    try {
        const routes = [["/api/teacher-applications", teacherApplications]];
        const unauthenticated = await requestWithoutAuthentication(
            routes,
            "/api/teacher-applications/my"
        );
        const unauthorized = await request(
            routes,
            "/api/teacher-applications/my",
            { role: "teacher" }
        );

        assert.equal(unauthenticated.status, 401);
        assert.equal(unauthorized.status, 403);
        assert.equal(queryCalled, false);
    } finally {
        pool.query = originalQuery;
    }
});

test("missing teacher application migration remains a server error with guidance", async () => {
    const originalQuery = pool.query;
    pool.query = async () => {
        const error = new Error('relation "teacher_applications" does not exist');
        error.code = "42P01";
        throw error;
    };

    try {
        const result = await request(
            [["/api/teacher-applications", teacherApplications]],
            "/api/teacher-applications/my"
        );

        assert.equal(result.status, 500);
        assert.match(result.body.message, /teacher applications migration is missing/);
        assert.match(result.body.message, /npm run db:migrate/);
    } finally {
        pool.query = originalQuery;
    }
});

test("student teacher application is stored as pending without changing account role", async () => {
    const originalQuery = pool.query;
    let queryText;
    let queryValues;
    pool.query = async (text, values) => {
        queryText = text;
        queryValues = values;
        return {
            rows: [{
                id: "5",
                specialization: "Mathematics",
                bio: "I have taught mathematics for five years.",
                status: "pending",
            }],
        };
    };

    try {
        const result = await request(
            [["/api/teacher-applications", teacherApplications]],
            "/api/teacher-applications",
            {
                method: "POST",
                body: {
                    specialization: " Mathematics ",
                    bio: " I have taught mathematics for five years. ",
                    role: "teacher",
                },
            }
        );

        assert.equal(result.status, 201);
        assert.equal(result.body.application.status, "pending");
        assert.match(queryText, /INSERT INTO teacher_applications/);
        assert.doesNotMatch(queryText, /UPDATE users|SET role/);
        assert.deepEqual(queryValues, [
            "42",
            "Mathematics",
            "I have taught mathematics for five years.",
        ]);
    } finally {
        pool.query = originalQuery;
    }
});

test("student cannot access teacher package APIs by navigating to their route", async () => {
    const originalQuery = pool.query;
    let queryCalled = false;
    pool.query = async () => {
        queryCalled = true;
        return { rows: [] };
    };

    try {
        const result = await request(
            [["/api/lessons", lessons]],
            "/api/lessons/my"
        );

        assert.equal(result.status, 403);
        assert.equal(queryCalled, false);
    } finally {
        pool.query = originalQuery;
    }
});

test("teacher application validates applicant fields before writing", async () => {
    const originalQuery = pool.query;
    let queryCalled = false;
    pool.query = async () => {
        queryCalled = true;
        return { rows: [] };
    };

    try {
        const result = await request(
            [["/api/teacher-applications", teacherApplications]],
            "/api/teacher-applications",
            {
                method: "POST",
                body: { specialization: "X", bio: "short" },
            }
        );

        assert.equal(result.status, 400);
        assert.equal(queryCalled, false);
    } finally {
        pool.query = originalQuery;
    }
});
