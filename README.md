# Sukoon · Shia Matrimony

A React matrimonial application for serious marriage intentions. Anonymous discovery leads to consent-based requests and accepted-only messaging.

## Product flow

- Secure sign-in through the Sites ChatGPT identity flow; adult and guardian-consent declarations before profile creation.
- Registration oath reproduces the supplied Quran 2:42 quotation and truthfulness declaration. The submitted oath timestamp and Terms version are saved.
- One-time ₹100 Razorpay registration or an account-bound, single-use waiver coupon. Unpaid profiles remain out of discovery.
- Discovery returns a deliberately limited server projection. Full names, account emails, dates of birth, and photo storage keys are omitted.
- A request implies sender consent; acceptance requires explicit recipient consent. Both names and emails then become visible to the two parties.
- Photo permission is separate and per connection. Photos are private R2 objects served only after authorization. Replacement resets all existing photo permissions. Browser uploads are re-encoded to remove metadata.
- Conversation access is limited to accepted participants. Closing or blocking ends access and photo permission. Previously copied information cannot be recalled.
- Member enquiries are saved. The configured administrator can issue personal coupons and resolve enquiries.
- Fictional preview profiles and actions are explicitly labeled and never enter the member database. Preview state resets on refresh.

## Runtime configuration

The current checkout targets ChatGPT Sites and Cloudflare Workers. Checkout is disabled because payment credentials are absent. ChatGPT Sites does not permit financial transactions; do not enable paid registration on that host. After migrating to an independent host, configure ADMIN_EMAIL, RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET as server-side environment values. Use test keys first and enable automatic capture in Razorpay. The Check payment action recovers captured payments when a browser callback was interrupted. Gateway responses are verified server-side against stored order ownership, HMAC signature, amount ₹100, currency INR, and captured state.

## Development

Run the bundled dependency installer, then use the Sites execution profile and supervised preview. Generate schema deltas with the declared db:generate script. D1 migrations in drizzle are schema-only and must be applied once, in order. The source is persisted in the Site source repository; no generated runtime state, private photos, credentials, or local test records are committed.

## Checks

TypeScript and production Worker build. Isolated SQLite integration checks of the actual API routes cover anonymous access, adult registration, fee gating, request ownership, consent-based disclosure, accepted-only messaging, private photo access, and connection closure. Browser visual testing was unavailable; the supervised preview returned HTTP 502, and the approved control-browser capability is not installed.

## Launch boundaries

The initial site retains owner-only access. Custom-domain DNS must be configured before gsuit.in resolves to this site. Payment credentials are not supplied, so actual charging is disabled. Public registration currently uses ChatGPT sign-in. Production payment tests, operator-approved Terms and Privacy text, and operational moderation arrangements are still required before public onboarding. Profiles are self-declared; neither the oath nor the fee is identity verification. Chat has server access controls, not end-to-end encryption.

## Hosting on Vercel: migration required

This repository is a source import of the current Sites application. It is **not yet deployable on Vercel**. Importing it into Vercel without adapting the backend will not produce a working matrimonial service.

1. Replace the Vinext/Workers build and start scripts with the standard Next.js build and runtime; update the lockfile with those changes.
2. Migrate the D1 schema and queries in `lib/store.ts`, `db/index.ts` and API routes to a database accessible from Vercel. Preserve profile, consent, connection, message, coupon and payment records when migrating existing members.
3. Replace R2 Worker bindings with private object storage accessed through its SDK. Preserve the photo authorization checks and per-connection consent.
4. Replace Sites-managed sign-in with verified server-side authentication. `app/chatgpt-auth.ts` trusts headers injected by the Sites gateway; those headers must never be trusted from public requests on an independent host.
5. Configure secrets in Vercel, apply database migrations, and test registration, fee waivers, request acceptance/decline, private photo visibility and chat before enabling public onboarding.
6. After verification, connect `gsuit.in` to the new deployment using the DNS records supplied by the host.

This import contains source and schema migrations, not the production database, private photos or environment secrets. The current Sites deployment is unaffected by this GitHub import.
