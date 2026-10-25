# Turso deployment

The app uses Prisma's libSQL adapter for both hosted Turso and local SQLite. Its existing schema, authentication, admin approval, and consent rules stay in place. Photos are processed as JPEGs and stored privately in the database, so no filesystem uploads or second storage service is required. Photos count against the database storage allowance.

## Required once

1. Create a Turso account and database at https://turso.tech. Obtain its `libsql://...` URL and an authentication token with read/write access. No database credentials belong in source code or Git.
2. Fill the two blank entries in your local `.env`:

   ```ini
   DATABASE_URL="file:./dev.db"
   TURSO_DATABASE_URL="libsql://your-database-host"
   TURSO_AUTH_TOKEN="your-private-token"
   ```

   Turso takes precedence when its URL is set. With both Turso entries empty, local development continues using `DATABASE_URL`.
3. Add `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` to the Vercel project's **Production** environment. The token must use **Secret** and must never have a `NEXT_PUBLIC_` prefix. Use a separate database/token for Preview if preview deployments need database access.
4. Keep your real `ADMIN_EMAIL` and `ADMIN_PASSWORD` in Vercel, and set `NEXT_PUBLIC_SITE_URL=https://gsuit.in`. The admin account is created on first sign-in only when it doesn't already exist. Changing the environment password does not change an existing account's stored password.
5. Push the changes to the production branch and redeploy. The build validates the connection configuration, generates Prisma Client, initializes missing tables without deleting existing records, and builds Next.js. A deployment with missing Turso credentials fails the build rather than silently using a temporary local database.
6. Test `/admin/login`, member registration, admin approval, and private photo sharing. Demo logins are allowed in development. Production can explicitly opt in with `ENABLE_DEMO_ACCOUNTS=true`; changing it to `false` and redeploying also blocks existing demo sessions. Shared demo administrators have full access to member data, so this setting is intended for a demonstration site. Login-page demo buttons remain development-only.

After this one-time connection setup, normal code deployments do not require re-entering the credentials. Nothing is stored in localStorage or sessionStorage; only the session cookie is stored in the browser.

## Preserve existing local records instead of starting empty

Do this **before filling the local Turso entries**, while the app still points to `file:./dev.db`:

```powershell
npm run db:backup
```

This creates a consistent SQLite snapshot in the ignored `backups/` directory without interrupting the running server. It includes any legacy local photos that are present. Treat this file as confidential: it contains account and profile records. The source database is preserved.

Install the Turso CLI using https://docs.turso.tech/cli/installation, then import the snapshot into a **new** database:

```powershell
turso auth login
turso db create gsuit --from-file "C:\full\path\to\backups\sukoon-TIMESTAMP.db"
turso db show gsuit --url
turso db tokens create gsuit
```

Use that imported database's URL/token in the setup steps above. The import includes all existing records; review development/sample accounts before using that data for a public production launch. Existing local uploads that were missing at backup time cannot be recovered from the database and must be re-uploaded.

## Useful commands

```powershell
npm run db:setup   # Initialize missing tables; preserve existing rows
npm run db:check   # Verify connection and required tables
npm test          # Configuration and real libSQL schema tests
npm run typecheck
npm run build
```

The generated `prisma/schema.sql` is the bootstrap schema. After changing `prisma/schema.prisma`, regenerate Prisma Client and that SQL file. Future changes to existing columns need a reviewed migration; the bootstrap command intentionally does not drop or rebuild existing tables.

```powershell
npx prisma generate
npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script --output prisma/schema.sql
```

## Deployment diagnostics

- **Missing Turso configuration:** fill both hosted variables in the Vercel environment being deployed and redeploy.
- **Authentication failure:** verify that the token belongs to this database and hasn't expired or been revoked.
- **Missing tables:** run `npm run db:setup` with the hosted variables configured. The updated build also does this automatically.
- **GET `/api/admin/auth` returns 405:** expected; sign in from `/admin/login`, which submits POST.
- `SESSION_SECRET` is not used by this app and is no longer in the environment template. `UPLOAD_DIR` is only read when migrating legacy photos into a backup; deployed photo storage no longer uses it.

Hosted connectivity cannot be verified until a real Turso URL and token have been supplied. Free-plan quotas and availability are governed by Turso's current terms: https://turso.tech/pricing.
