# Bayenly

Bayenly is a React/Vite frontend with an Express API and PostgreSQL database.
PostgreSQL is the source of truth for accounts, lesson packages, purchases,
payments, and lesson completion.

## Requirements

- Node.js with npm
- PostgreSQL

## Local setup

1. Install frontend dependencies from the repository root:

   ```sh
   npm install
   ```

2. Install backend dependencies:

   ```sh
   cd server
   npm install
   ```

3. Create a PostgreSQL database and copy `server/.env.example` to
   `server/.env`. Set the database credentials and replace `JWT_SECRET` with
   a private random secret of at least 32 bytes. Never commit `.env` files.

4. Apply the checked-in migrations from the `server` directory:

   ```sh
   npm run db:migrate
   ```

   Migrations are additive and tracked in `schema_migrations`. They do not
   insert sample accounts or delete existing data. The migrations create the
   core tables, add persisted lesson completion and teacher applications, and
   enforce case-insensitive email uniqueness. The email migration stops without
   changing data if it finds existing addresses that differ only by case;
   resolve any reported duplicates manually before rerunning migrations.
   Migration `005_admin_moderation.sql` adds reversible account suspension,
   video archiving, and an admin action audit log. Apply all pending migrations
   manually before deploying the updated API; the application does not run
   migrations automatically.

Public registration always creates a student account. Teacher access is granted
only when an authenticated admin approves a pending application. There is no
public admin-registration flow.

The admin workspace provides database-backed overview metrics, teacher
application review, account suspension/restoration, package and video
archiving/restoration, read-only purchase history, and an audit log. Admin
actions are restricted by the authenticated database role. Administrator
accounts cannot be suspended from this workspace, and records are archived or
suspended rather than permanently deleted. Suspending a teacher archives their
currently published packages; restoring the account returns those packages as
drafts, and they must be published again.

Checkout and purchase creation remain disabled until a real payment provider is
configured. Existing pending purchases are preserved and are not marked paid.

5. Start the API and frontend in separate terminals:

   ```sh
   # Terminal 1, from server/
   npm run dev
   ```

   ```sh
   # Terminal 2, from the repository root
   npm run dev
   ```

The Vite development server proxies `/api` requests to `http://localhost:3000`.

## Checks and production build

Run backend tests and syntax checks from `server/`:

```sh
npm test
```

Build the frontend from the repository root:

```sh
npm run build
```

Start the backend with `npm start` from `server/`. The API listens on the
hosting platform's `PORT` value (default `3000`). `/api/health` checks API and
database connectivity.

## Deployment configuration

Configure these values in the hosting services rather than committing secrets:

- Backend: `NODE_ENV=production`, `PORT`, `JWT_SECRET` (at least 32 bytes),
  `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`.
- Backend CORS: set `CORS_ORIGINS` to the exact public frontend origin(s),
  comma-separated. Production startup fails when this is missing.
- Frontend build: set `VITE_API_BASE` to the deployed API base URL, including
  `/api` (for example `https://api.example.com/api`) when frontend and backend
  use different origins. The frontend defaults to `/api`.
- Payments: checkout remains unavailable until a real payment provider and
  verified payment callbacks are configured. Do not enable simulation in
  production.

Apply database migrations with `npm run db:migrate` from `server/` before
starting the backend. For an existing database, take an appropriate backup
before migration and review the SQL; the migration runner does not reset user
data, but database changes should still be scheduled and monitored.

Configure the frontend host to serve `index.html` as the fallback for nested
client-side routes. Deployment, database provisioning, domain configuration,
and payment-provider setup remain manual.
