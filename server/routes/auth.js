
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const router = express.Router();

const { authenticateToken } = require("../middleware/auth");

// Register a new student
router.post("/register", async (req, res) => {
    try {
        const { name, email, password, phone = "" } = req.body;

        if (
            typeof name !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string" ||
            typeof phone !== "string"
        ) {
            return res.status(400).json({
                message: "Name, email, and password are required; phone must be a string.",
            });
        }

        const cleanName = name.trim();
        const cleanEmail = email.trim().toLowerCase();
        const cleanPhone = phone.trim();

        if (cleanName.length < 2 || cleanName.length > 100) {
            return res.status(400).json({
                message: "Name must be between 2 and 100 characters.",
            });
        }

        if (
            cleanEmail.length > 255 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
        ) {
            return res.status(400).json({
                message: "Please provide a valid email address.",
            });
        }

        if (cleanPhone.length > 32) {
            return res.status(400).json({
                message: "Phone number must be 32 characters or fewer.",
            });
        }

        // bcrypt has a 72-byte password limit.
        const passwordBytes = Buffer.byteLength(password, "utf8");

        if (passwordBytes < 8 || passwordBytes > 72) {
            return res.status(400).json({
                message: "Password must be at least 8 characters and at most 72 bytes.",
            });
        }

        const existingUser = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [cleanEmail]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                message: "An account with this email already exists.",
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const result = await pool.query(
            `INSERT INTO users (name, email, phone, password_hash, role)
             VALUES ($1, $2, $3, $4, 'student')
             RETURNING id, name, email, phone, role, created_at`,
            [cleanName, cleanEmail, cleanPhone || null, passwordHash]
        );

        return res.status(201).json({
            message: "Account created successfully.",
            user: result.rows[0],
        });
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                message: "An account with this email already exists.",
            });
        }

        console.error("Registration error:", error.message);

        return res.status(500).json({
            message: "Unable to create your account.",
        });
    }
});

// Log in
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            !email.trim() ||
            !password ||
            Buffer.byteLength(password, "utf8") > 72
        ) {
            return res.status(400).json({
                message: "A valid email and password are required.",
            });
        }

        const cleanEmail = email.trim().toLowerCase();

        const result = await pool.query(
            `SELECT id, name, email, phone, password_hash, role
             FROM users
             WHERE email = $1`,
            [cleanEmail]
        );

        const user = result.rows[0];

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({
                message: "Invalid email or password.",
            });
        }

        const token = jwt.sign(
            { sub: String(user.id), role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        return res.json({
            message: "Login successful.",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
            },
        });
    } catch (error) {
        console.error("Login error:", error.message);

        return res.status(500).json({
            message: "Unable to log in.",
        });
    }
});

router.get("/me", authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, name, email, phone, role, created_at
             FROM users
             WHERE id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                message: "User no longer exists.",
            });
        }

        res.json({ user: result.rows[0] });
    } catch (error) {
        console.error("Profile lookup error:", error.message);
        res.status(500).json({
            message: "Unable to retrieve profile.",
        });
    }
});

router.patch("/me", authenticateToken, async (req, res) => {
    try {
        const { name, email, phone } = req.body;

        if (
            typeof name !== "string" ||
            typeof email !== "string" ||
            typeof phone !== "string"
        ) {
            return res.status(400).json({
                message: "Name, email, and phone must be strings.",
            });
        }

        const cleanName = name.trim();
        const cleanEmail = email.trim().toLowerCase();
        const cleanPhone = phone.trim();

        if (cleanName.length < 2 || cleanName.length > 100) {
            return res.status(400).json({
                message: "Name must be between 2 and 100 characters.",
            });
        }

        if (
            cleanEmail.length > 255 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
        ) {
            return res.status(400).json({
                message: "Please provide a valid email address.",
            });
        }

        if (cleanPhone.length > 32) {
            return res.status(400).json({
                message: "Phone number must be 32 characters or fewer.",
            });
        }

        const result = await pool.query(
            `UPDATE users
             SET name = $1, email = $2, phone = $3
             WHERE id = $4
             RETURNING id, name, email, phone, role`,
            [cleanName, cleanEmail, cleanPhone || null, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "User no longer exists.",
            });
        }

        return res.json({ user: result.rows[0] });
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                message: "An account with this email already exists.",
            });
        }

        console.error("Profile update error:", error.message);
        return res.status(500).json({
            message: "Unable to update profile.",
        });
    }
});

module.exports = router;
