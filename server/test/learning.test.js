const assert = require("node:assert/strict");
const test = require("node:test");
const express = require("express");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const learningRoutes = require("../routes/learning");
const lessonRoutes = require("../routes/lessons");

const secret = "learning-route-tests-use-a-long-secret";
process.env.JWT_SECRET = secret;

async function requestWithRoutes(routes, path, { method = "GET", body, token } = {}) {
    const app = express();
    app.use(express.json());

    for (const [prefix, router] of routes) {
        app.use(prefix, router);
    }

    const server = app.listen(0);

    try {
        const response = await fetch(
            `http://127.0.0.1:${server.address().port}${path}`,
            {
                method,
                headers: {
                    ...(body ? { "Content-Type": "application/json" } : {}),
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                ...(body ? { body: JSON.stringify(body) } : {}),
            }
        );

        return {
            status: response.status,
            body: await response.json(),
        };
    } finally {
        await new Promise((resolve, reject) => {
            server.close((error) => error ? reject(error) : resolve());
        });
    }
}

function studentToken(id = "42") {
    return jwt.sign({ sub: id, role: "student" }, secret);
}

test("learning content requires a paid purchase owned by the authenticated student", async () => {
    const originalQuery = pool.query;
    let queryText;
    let queryValues;
    pool.query = async (text, values) => {
        queryText = text;
        queryValues = values;
        return { rows: [] };
    };

    try {
        const result = await requestWithRoutes(
            [["/api/learning", learningRoutes]],
            "/api/learning/7",
            { token: studentToken("42") }
        );

        assert.equal(result.status, 403);
        assert.match(queryText, /p\.student_id = \$1/);
        assert.match(queryText, /p\.status = 'paid'/);
        assert.deepEqual(queryValues, ["42", "7"]);
    } finally {
        pool.query = originalQuery;
    }
});

test("progress completion is scoped to the signed-in student and paid package video", async () => {
    const originalQuery = pool.query;
    let queryText;
    let queryValues;
    pool.query = async (text, values) => {
        queryText = text;
        queryValues = values;
        return {
            rows: [{
                student_id: "42",
                video_id: "9",
                completed_at: "2026-10-28T00:00:00.000Z",
            }],
        };
    };

    try {
        const result = await requestWithRoutes(
            [["/api/learning", learningRoutes]],
            "/api/learning/7/videos/9/complete",
            { method: "POST", token: studentToken("42") }
        );

        assert.equal(result.status, 200);
        assert.match(queryText, /p\.student_id = \$1/);
        assert.match(queryText, /p\.status = 'paid'/);
        assert.match(queryText, /lv\.id = \$3/);
        assert.deepEqual(queryValues, ["42", "7", "9"]);
    } finally {
        pool.query = originalQuery;
    }
});

test("video insertion cannot race a draft package becoming published", async () => {
    const originalQuery = pool.query;
    const queries = [];
    pool.query = async (text, values) => {
        queries.push({ text, values });
        if (text.includes("INSERT INTO lesson_videos")) {
            return { rows: [] };
        }

        return { rows: [{ status: "published" }] };
    };

    try {
        const result = await requestWithRoutes(
            [["/api/lessons", lessonRoutes]],
            "/api/lessons/7/videos",
            {
                method: "POST",
                token: jwt.sign({ sub: "11", role: "teacher" }, secret),
                body: {
                    title: "Video",
                    video_url: "https://media.example.test/video.mp4",
                    position: 1,
                },
            }
        );

        assert.equal(result.status, 400);
        assert.match(queries[0].text, /INSERT INTO lesson_videos[\s\S]*FROM lesson_packages lp/);
        assert.match(queries[0].text, /lp\.teacher_id = \$6/);
        assert.match(queries[0].text, /lp\.status = 'draft'/);
        assert.deepEqual(queries[0].values, [
            "7",
            "Video",
            "https://media.example.test/video.mp4",
            null,
            1,
            "11",
        ]);
    } finally {
        pool.query = originalQuery;
    }
});

test("teacher package listing is scoped to the authenticated teacher", async () => {
    const originalQuery = pool.query;
    let queryText;
    let queryValues;
    pool.query = async (text, values) => {
        queryText = text;
        queryValues = values;
        return { rows: [] };
    };

    try {
        const result = await requestWithRoutes(
            [["/api/lessons", lessonRoutes]],
            "/api/lessons/my",
            {
                token: jwt.sign({ sub: "11", role: "teacher" }, secret),
            }
        );

        assert.equal(result.status, 200);
        assert.match(queryText, /WHERE lp\.teacher_id = \$1/);
        assert.deepEqual(queryValues, ["11"]);
    } finally {
        pool.query = originalQuery;
    }
});

test("teacher package creation assigns ownership from the verified token", async () => {
    const originalQuery = pool.query;
    let queryText;
    let queryValues;
    pool.query = async (text, values) => {
        queryText = text;
        queryValues = values;
        return {
            rows: [{
                id: "72",
                teacher_id: "11",
                title: "Physics",
                status: "draft",
            }],
        };
    };

    try {
        const result = await requestWithRoutes(
            [["/api/lessons", lessonRoutes]],
            "/api/lessons",
            {
                method: "POST",
                token: jwt.sign({ sub: "11", role: "teacher" }, secret),
                body: {
                    teacher_id: "99",
                    title: "Physics",
                    description: "A physics package",
                    subject: "Physics",
                    price: 90,
                    language: "en",
                },
            }
        );

        assert.equal(result.status, 201);
        assert.match(queryText, /VALUES \(\$1, \$2, \$3, \$4, \$5, \$6, 'draft'\)/);
        assert.deepEqual(queryValues, [
            "11",
            "Physics",
            "A physics package",
            "Physics",
            90,
            "en",
        ]);
    } finally {
        pool.query = originalQuery;
    }
});

test("video updates require ownership of a draft package", async () => {
    const originalQuery = pool.query;
    let queryText;
    let queryValues;
    pool.query = async (text, values) => {
        queryText = text;
        queryValues = values;
        return { rows: [] };
    };

    try {
        const result = await requestWithRoutes(
            [["/api/lessons", lessonRoutes]],
            "/api/lessons/7/videos/9",
            {
                method: "PUT",
                token: jwt.sign({ sub: "11", role: "teacher" }, secret),
                body: {
                    title: "Updated video",
                    video_url: "https://media.example.test/updated.mp4",
                    duration_seconds: 90,
                },
            }
        );

        assert.equal(result.status, 404);
        assert.match(queryText, /lp\.teacher_id = \$6/);
        assert.match(queryText, /lp\.status = 'draft'/);
        assert.deepEqual(queryValues, [
            "9",
            "7",
            "Updated video",
            "https://media.example.test/updated.mp4",
            90,
            "11",
        ]);
    } finally {
        pool.query = originalQuery;
    }
});

test("package prices reject values that exceed the database precision", async () => {
    const originalQuery = pool.query;
    let queries = 0;
    pool.query = async () => {
        queries += 1;
        throw new Error("The database should not be queried for invalid prices.");
    };

    try {
        const result = await requestWithRoutes(
            [["/api/lessons", lessonRoutes]],
            "/api/lessons",
            {
                method: "POST",
                token: jwt.sign({ sub: "11", role: "teacher" }, secret),
                body: {
                    title: "Physics",
                    description: "A physics package",
                    subject: "Physics",
                    price: 100000000,
                    language: "en",
                },
            }
        );

        assert.equal(result.status, 400);
        assert.equal(queries, 0);
    } finally {
        pool.query = originalQuery;
    }
});
