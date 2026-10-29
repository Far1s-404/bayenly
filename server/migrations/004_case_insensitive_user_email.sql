DO $$
BEGIN
    IF EXISTS (
        SELECT lower(email)
        FROM users
        GROUP BY lower(email)
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Cannot enforce normalized email uniqueness: duplicate email addresses differ only by case.';
    END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_normalized_unique
    ON users (lower(email));
