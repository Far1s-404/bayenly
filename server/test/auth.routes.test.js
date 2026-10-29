const assert = require("node:assert/strict");
const test = require("node:test");
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const pool = require("../db");
const authRoutes = require("../routes/auth");

const secret = "auth-route-tests-use-a-long-secret-value";
process.env.JWT_SECRET = secret;

async function request(path, { method = "POST", body, token } = {}) {
    const app = express();
    app.use(express.json());
    app.use("/api/auth", authRoutes);
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
        return { status: response.status, body: await response.json() };
    } finally {
        await new Promise((resolve, reject) => {
            server.close((error) => error ? reject(error) : resolve());
        });
    }
}

test("registration stores a normalized account with a hashed password and student role, then login verifies it", async () => {
    const originalQuery = pool.query;
    let storedUser = null;
    pool.query = async (text, values) => {
        if (text.includes("SELECT id FROM users")) {
            assert.match(text, /lower\(email\) = \$1/);
            return { rows: storedUser ? [{ id: storedUser.id }] : [] };
        }

        if (text.includes("INSERT INTO users")) {
            assert.match(text, /'student'/);
            assert.doesNotMatch(text, /role\s*=\s*\$|VALUES[^]*\$5/);
            storedUser = {
                id: "501",
                name: values[0],
                email: values[1],
                phone: values[2],
                password_hash: values[3],
                role: "student",
                created_at: new Date().toISOString(),
            };
            return { rows: [{ ...storedUser, password_hash: undefined }] };
        }

        if (text.includes("password_hash")) {
            return { rows: storedUser ? [storedUser] : [] };
        }

        assert.fail(`Unexpected SQL query: ${text}`);
    };

    try {
        const registered = await request("/api/auth/register", {
            body: {
                name: "New Student",
                email: "  Student@Example.test ",
                phone: "",
                password: "A secure password 123",
                role: "admin",
            },
        });

        assert.equal(registered.status, 201);
        assert.equal(storedUser.email, "student@example.test");
        assert.equal(storedUser.role, "student");
        assert.notEqual(storedUser.password_hash, "A secure password 123");
        assert.equal(await bcrypt.compare("A secure password 123", storedUser.password_hash), true);
        assert.equal("password_hash" in registered.body.user, false);

        const loggedIn = await request("/api/auth/login", {
            body: { email: " STUDENT@example.test ", password: "A secure password 123" },
        });

        assert.equal(loggedIn.status, 200);
        assert.equal(loggedIn.body.user.id, storedUser.id);
        assert.equal(loggedIn.body.user.role, "student");
        assert.deepEqual(
            jwt.verify(loggedIn.body.token, secret, { algorithms: ["HS256"] }),
            { sub: storedUser.id, role: "student", iat: jwt.decode(loggedIn.body.token).iat, exp: jwt.decode(loggedIn.body.token).exp }
        );
    } finally {
        pool.query = originalQuery;
    }
});

test("duplicate registration and incorrect login do not reveal account credentials", async () => {
    const originalQuery = pool.query;
    const passwordHash = await bcrypt.hash("correct password 123", 4);
    const storedUser = {
        id: "601",
        name: "Existing Student",
        email: "existing@example.test",
        phone: null,
        password_hash: passwordHash,
        role: "student",
        created_at: new Date().toISOString(),
    };
    pool.query = async (text, values) => {
        if (text.includes("SELECT id FROM users")) return { rows: [{ id: storedUser.id }] };
        if (text.includes("password_hash")) {
            return { rows: values[0] === storedUser.email ? [storedUser] : [] };
        }
        assert.fail(`Unexpected SQL query: ${text}`);
    };

    try {
        const duplicate = await request("/api/auth/register", {
            body: {
                name: "Existing Student",
                email: "EXISTING@example.test",
                password: "correct password 123",
            },
        });

        test("suspended accounts cannot start a login session", async () => {
            const originalQuery = pool.query;
            const passwordHash = await bcrypt.hash("correct password 123", 4);
            pool.query = async () => ({
                rows: [{
                    id: "602",
                    name: "Suspended Student",
                    email: "suspended@example.test",
                    phone: null,
                    password_hash: passwordHash,
                    role: "student",
                    suspended_at: "2026-10-29T00:00:00.000Z",
                }],
            });

            try {
                const result = await request("/api/auth/login", {
                    body: { email: "suspended@example.test", password: "correct password 123" },
                });
                assert.equal(result.status, 403);
                assert.match(result.body.message, /account is suspended/i);
                assert.equal(result.body.token, undefined);
            } finally {
                pool.query = originalQuery;
            }
        });
        const incorrect = await request("/api/auth/login", {
            body: { email: "existing@example.test", password: "wrong password 123" },
        });
        const unknown = await request("/api/auth/login", {
            body: { email: "unknown@example.test", password: "wrong password 123" },
        });

        assert.equal(duplicate.status, 409);
        assert.equal(incorrect.status, 401);
        assert.deepEqual(incorrect.body, unknown.body);
    } finally {
        pool.query = originalQuery;
    }
});
