require("dotenv").config();

const fs = require("node:fs/promises");
const path = require("node:path");
const pool = require("./db");

const migrationsDirectory = path.join(__dirname, "migrations");
const advisoryLockId = 731904221;

async function migrate() {
    const client = await pool.connect();
    let lockAcquired = false;

    try {
        await client.query("SELECT pg_advisory_lock($1)", [advisoryLockId]);
        lockAcquired = true;

        await client.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                name TEXT PRIMARY KEY,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);

        const files = (await fs.readdir(migrationsDirectory))
            .filter((name) => /^\d+_[a-z0-9_]+\.sql$/.test(name))
            .sort();

        for (const name of files) {
            const existing = await client.query(
                "SELECT 1 FROM schema_migrations WHERE name = $1",
                [name]
            );

            if (existing.rows.length > 0) {
                console.log(`Already applied: ${name}`);
                continue;
            }

            const migration = await fs.readFile(
                path.join(migrationsDirectory, name),
                "utf8"
            );

            await client.query("BEGIN");

            try {
                await client.query(migration);
                await client.query(
                    "INSERT INTO schema_migrations (name) VALUES ($1)",
                    [name]
                );
                await client.query("COMMIT");
                console.log(`Applied: ${name}`);
            } catch (error) {
                await client.query("ROLLBACK");
                throw error;
            }
        }
    } finally {
        if (lockAcquired) {
            await client.query("SELECT pg_advisory_unlock($1)", [advisoryLockId]);
        }

        client.release();
        await pool.end();
    }
}

migrate().catch((error) => {
    console.error("Database migration failed:", error.message);
    process.exitCode = 1;
});
