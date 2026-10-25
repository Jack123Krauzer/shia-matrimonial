# Sukoon · Shia Matrimony

## Design and rendering

- Tailwind CSS v4 handles all authored styling. `tailwind.config.ts` defines the shared forest-green, ivory, and gold palette, typography, and shadows. Use semantic utilities such as `bg-primary`, `text-muted`, and `border-border`; `app/globals.css` only imports Tailwind and loads its config. `lib/ui/tailwind.ts` holds member UI recipes. Payment checkout reads the primary token from computed CSS, and the social image uses the same exported palette.
- `/`, `/how-it-works`, and `/privacy` are public server component pages with unique metadata and canonical URLs. `/sitemap.xml`, `/robots.txt`, and `/opengraph-image` support search discovery and sharing.
- `/discover` validates the session on the server and renders the initial account response before hydration. Private discovery, auth, and admin pages use `noindex` metadata and are excluded from the sitemap.
- Set `NEXT_PUBLIC_SITE_URL` to your real HTTPS origin before production deployment. Local development defaults to `http://localhost:3000`. Search rankings also depend on content quality, site performance, and reputation; SSR does not guarantee rankings.
- Public information pages intentionally contain no member data. The homepage is now public; signed-in members reach their workspace at `/discover`.
- The member workspace uses the authenticated account and its saved profile. Accounts without a profile see their account email and a setup prompt; fictional profiles and connections are not substituted. Filter dropdowns support keyboard selection, and navigation becomes an off-canvas drawer at widths of 800px or less.
- New accounts land on `/registration-confirmation`. Submitted profiles remain pending until an administrator reviews the full details and explicitly approves them. Discovery requires both approval and a paid/waived fee; payments and coupons never approve profiles. Editing profile details requires a fresh review, and suspended profiles stay hidden.
- Run `npm run demo:seed` against the already-running development server, or use **Add demo records** in the admin panel, to populate ten labelled fictional profiles in Prisma/SQLite. Three start under review; two have waived fees and one has an outstanding fee. Repeating this never overwrites existing profiles or review decisions. Seeding is admin-only and disabled outside development.
- The admin dashboard uses a responsive sidebar, summary cards, a member table/mobile cards, and a full-details review drawer. Profile filters and member connection tabs default to **All statuses**. Profile, registration, connection, and enquiry statuses use shared labelled badges.
- Administrator sign-in lives at `/admin/login`, with an administrator-only authentication endpoint. Signed-out visits to `/admin` redirect there; admin sign-out also returns there. The member page `/auth` no longer shows the admin demo button or credentials. Member and admin demos remain development-only on their respective pages.
- Confidential data stays in the server database and private photo storage. Authentication uses an HttpOnly cookie; the application does not use localStorage or sessionStorage. Database files, environment files, and uploads are excluded from Git.
- Development integration checks: `node scripts/check-member-ui.mjs` and `node --experimental-sqlite scripts/check-approval-flow.mjs`. The approval check creates and removes its own disposable synthetic account.

A Next.js matrimonial platform designed for intentional Shia matrimonial unions based on the **GSUIT** philosophy (*Ghar · Sukoon · Ulfat · Imaan · Taqwa*).

## Key Architectural Updates

- **Database**: Migrated completely from Supabase to **Prisma with SQLite** (`dev.db`). No external cloud database required. Confidential matrimonial data is stored server-side.
- **Authentication**: Custom cookie-based session management (`sukoon_session` with `httpOnly`, `sameSite: 'lax'`) using PBKDF2 password hashing. No third-party auth dependencies.
- **Private Routing**: Next.js `middleware.ts` enforces private routing. Unauthenticated visitors can read public information pages; member routes redirect to `/auth`.
- **Admin Governance Panel**: Dedicated `/admin` control center for managing member profiles (activate, suspend, delete), issuing fee waiver coupons, reviewing safety concerns, and auditing consent-based connections.
- **Account access**: Everyone uses the same email/password sign-in and account creation flow. In local development, Member demo and Admin demo buttons use `member@example.test` and `admin@example.test` with password `SukoonDemo123!`. These accounts are provisioned on first demo sign-in and blocked outside development, including existing demo sessions. Administrator provisioning uses `ADMIN_EMAIL` and `ADMIN_PASSWORD` when configured.

## Running Locally

```bash
# Install dependencies
npm install

# Run database push (if schema modified)
npx prisma db push

# Start development server
npm run dev
```

## Environment Variables (`.env`)

```ini
DATABASE_URL="file:./dev.db"
ADMIN_EMAIL=admin@sukoon.dev
ADMIN_PASSWORD=admin123
SESSION_SECRET=sukoon-dev-secret-change-in-production-2026
UPLOAD_DIR=./uploads
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
```

## Core Matrimonial Principles

1. **Discovery Privacy**: Full names, account email addresses, and photos remain strictly private during discovery.
2. **Consent-First Matching**: When a connection request is accepted, names and emails are revealed to both participants.
3. **Connection-Specific Photo Sharing**: Uploaded photos are hidden by default and require individual consent per connection.
4. **End-to-End Governance**: Administrators can review community safety flags and issue one-time fee waiver coupons directly from the `/admin` portal.
