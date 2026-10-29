const assert = require("node:assert/strict");
const test = require("node:test");
const jwt = require("jsonwebtoken");
const { authenticateToken, requireRole } = require("../middleware/auth");

const testSecret = "test-secret-with-at-least-32-bytes-long";

function invokeMiddleware(middleware, authorization, lookupAuthenticatedUser) {
    const response = {
        statusCode: 200,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        },
    };
    const request = {
        headers: authorization ? { authorization } : {},
        app: {
            locals: {
                lookupAuthenticatedUser: lookupAuthenticatedUser ||
                    (async (id) => ({
                        id,
                        role: id === "12" ? "admin" : "student",
                        suspended_at: null,
                    })),
            },
        },
    };
    let nextCalled = false;

    middleware(request, response, () => {
        nextCalled = true;
    });

    return new Promise((resolve) => {
        setImmediate(() => resolve({ request, response, nextCalled }));
    });
}

test("authentication rejects requests without a bearer token", async () => {
    const { response, nextCalled } = await invokeMiddleware(authenticateToken);

    assert.equal(response.statusCode, 401);
    assert.equal(nextCalled, false);
});

test("authentication reports missing server configuration", async () => {
    const originalSecret = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;

    try {
        const { response, nextCalled } = await invokeMiddleware(
            authenticateToken,
            "Bearer token"
        );

        assert.equal(response.statusCode, 503);
        assert.equal(nextCalled, false);
    } finally {
        if (originalSecret !== undefined) {
            process.env.JWT_SECRET = originalSecret;
        }
    }
});

test("authentication rejects tokens signed with an unexpected algorithm", async () => {
    const token = jwt.sign(
        { sub: "12", role: "student" },
        testSecret,
        { algorithm: "HS384" }
    );
    const originalSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = testSecret;

    try {
        const { response, nextCalled } = await invokeMiddleware(
            authenticateToken,
            `Bearer ${token}`
        );

        assert.equal(response.statusCode, 401);
        assert.equal(nextCalled, false);
    } finally {
        if (originalSecret === undefined) {
            delete process.env.JWT_SECRET;
        } else {
            process.env.JWT_SECRET = originalSecret;
        }
    }
});

test("authentication rejects unknown role claims", async () => {
    const token = jwt.sign(
        { sub: "12", role: "superuser" },
        testSecret
    );
    const originalSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = testSecret;

    try {
        const { response, nextCalled } = await invokeMiddleware(
            authenticateToken,
            `Bearer ${token}`
        );

        assert.equal(response.statusCode, 401);
        assert.equal(nextCalled, false);
    } finally {
        if (originalSecret === undefined) {
            delete process.env.JWT_SECRET;
        } else {
            process.env.JWT_SECRET = originalSecret;
        }
    }
});

test("authentication uses the current database role rather than the token role", async () => {
    const token = jwt.sign(
        { sub: "12", role: "student", email: "private@example.test" },
        testSecret
    );
    const originalSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = testSecret;

    try {
        const { request, nextCalled } = await invokeMiddleware(
            authenticateToken,
            `Bearer ${token}`
        );

        assert.equal(nextCalled, true);
        assert.deepEqual(request.user, { id: "12", role: "admin" });
    } finally {
        if (originalSecret === undefined) {
            delete process.env.JWT_SECRET;
        } else {
            process.env.JWT_SECRET = originalSecret;
        }
    }
});

test("authentication rejects tokens without a string subject", async () => {
    const token = jwt.sign(
        { role: "student" },
        testSecret
    );
    const originalSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = testSecret;

    try {
        const { response, nextCalled } = await invokeMiddleware(
            authenticateToken,
            `Bearer ${token}`
        );

        assert.equal(response.statusCode, 401);
        assert.equal(nextCalled, false);
    } finally {
        if (originalSecret === undefined) {
            delete process.env.JWT_SECRET;
        } else {
            process.env.JWT_SECRET = originalSecret;
        }
    }
});

test("authentication blocks suspended accounts", async () => {
    const token = jwt.sign({ sub: "12", role: "student" }, testSecret);
    const originalSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = testSecret;
    try {
        const { response, nextCalled } = await invokeMiddleware(
            authenticateToken,
            `Bearer ${token}`,
            async (id) => ({
                id,
                role: "student",
                suspended_at: "2026-10-29T00:00:00.000Z",
            })
        );
        assert.equal(response.statusCode, 403);
        assert.equal(nextCalled, false);
    } finally {
        if (originalSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = originalSecret;
    }
});

test("role checks deny users without an allowed role", () => {
    const denied = {
        statusCode: 200,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        },
    };

    requireRole("teacher")({ user: { id: "12", role: "student" } }, denied, () => {
        assert.fail("next should not be called for a disallowed role");
    });

    assert.equal(denied.statusCode, 403);
});
