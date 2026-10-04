# Sukoon · Shia Matrimony

A standard Next.js application with Supabase Postgres CRUD, Supabase email/password authentication, and local filesystem image uploads. There are no Cloudflare bindings, R2 buckets, Sites runtime, or ChatGPT authentication dependencies.

The existing Sukoon design, GSUIT sidebar caption and centered footer are preserved. Discovery keeps names and emails private; accepting a request unlocks them for the two participants. Chat requires acceptance. Photos require separate consent per connection.

## Run locally

Use Node.js 22 or newer.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

On Windows, copy `.env.example` to `.env.local` through Explorer or PowerShell. Fill in:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public API key used for login |
| `SUPABASE_SECRET_KEY` | Server-only secret API key for database operations |
| `ADMIN_EMAIL` | Email of the account allowed to manage support and waiver coupons |
| `UPLOAD_DIR` | Local private image folder; defaults to `./uploads` |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Optional registration checkout credentials |

A legacy `SUPABASE_SERVICE_ROLE_KEY` is also supported instead of `SUPABASE_SECRET_KEY`. Never prefix either secret with `NEXT_PUBLIC_`, put it in frontend code, or commit `.env.local`.

The connected **Shia-Matrimonial** Supabase project already has the schema applied. For a fresh project, run `supabase/schema.sql` once in the Supabase SQL Editor. In **Authentication → URL Configuration**, set the Site URL and allow your local and production `/auth/callback` URLs. Enable email/password authentication. Email confirmation is supported through the PKCE callback. For confirmation links that should also work on a different browser/device, configure the confirmation template to use `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`.

## CRUD and application routes

| Method / route | Behavior |
| --- | --- |
| `POST /api/auth` | Create an account or sign in using email/password |
| `POST /auth/signout` | Sign out |
| `GET /api/profiles` | Read your profile |
| `POST /api/profiles` | Create your profile |
| `PATCH /api/profiles` | Update your profile |
| `DELETE /api/profiles` | Delete your profile, connections, conversations, payments and local photo; retain your login account |
| `GET /api/app` | Anonymous discovery projections, your requests and support enquiries |
| `POST /api/app` | Requests, accept/decline, preferences, chat, blocking, enquiries and fee waivers |
| `GET /api/app?chat=…` | Read an accepted connection's messages |
| `POST /api/photo` | Upload/replace your image; revoke previous photo permissions |
| `GET /api/photo?profile=…` | Read your own photo or a photo shared with your accepted connection |
| `DELETE /api/photo` | Delete your photo and its sharing permissions |
| `POST /api/payment` | Optional Razorpay order, verification and payment recovery |

Profiles are limited to adults and require the registration oath. Registration remains ₹100 once, or an administrator-issued, account-bound waiver coupon. Checkout stays disabled unless payment credentials are configured. Preview members are fictional and stored only in browser memory.

## Local images and hosting

Images are decoded, resized and rewritten as JPEG files in `UPLOAD_DIR`, outside `public/`. The server removes image metadata and serves files only through authorized API requests. Uploads are limited to JPEG/PNG and 5 MB. The database stores the filename, not the image bytes. Uploaded images and environment secrets are excluded from Git.

For production with local uploads, run the app on a VPS or another Node.js server with persistent disk:

```bash
npm run build
npm start
```

Mount a persistent directory at `UPLOAD_DIR` and back it up along with the database. Multiple application instances must share that directory.

**Vercel supports the Next.js CRUD app, but does not provide persistent writable local disk for uploaded images.** This implementation explicitly rejects uploads on Vercel rather than pretending to save files that will disappear. Reading images uploaded to another server is also unavailable on Vercel without a shared filesystem. To keep local uploads, host on a server with persistent disk. No external image storage service is configured.

## Access controls

Every private API operation verifies the Supabase user with `auth.getUser()`, then enforces ownership and connection consent on the server. No client-supplied identity headers are trusted. Administrative permissions use the server's `ADMIN_EMAIL`, not editable user metadata.

All seven tables enable RLS and revoke direct access from `anon` and `authenticated`. This is deliberate: the browser does not query member tables directly. Only the server-only secret may access them after route authorization. Transaction functions use invoker privileges, have fixed search paths, and are executable only by `service_role`. Waiver redemption, payments, photo replacement, profile deletion and blocking update related records atomically.

No live Sites user records or photos are imported. The previous Sites deployment is a separate application; this repository targets independent hosting.

## Verification

```bash
npm run typecheck
npm test
npm run build
```

The route tests cover private discovery projections, profile ownership, create/update/delete, acceptance, chat and photo access. Local image tests cover real encoding and filesystem read/delete. The Supabase schema and transaction helpers are verified against the connected Postgres project using temporary records rolled back after the checks.
