# VibeNest

VibeNest is an anonymous emotional-connection social app built with Next.js App Router and Supabase.

## Local development

1. Use Node.js 22.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
5. Run `npm run dev`.

## Authentication and account recovery

- The app starts a Silent Anonymous Session on first visit. A shared Promise lock reuses an in-flight sign-in and prevents duplicate anonymous users from concurrent actions.
- A visitor can link an email to the current anonymous identity. Supabase keeps the same Auth user ID, so records owned by that ID remain attached to the account.
- After verifying the email, the user can set a password or use a passwordless email sign-in link on another device.
- Google OAuth can be linked to the current anonymous identity when Supabase manual identity linking is enabled.
- Email verification and recovery links are handled by `/auth/callback`, which accepts both PKCE codes and Supabase `token_hash` links.
- Supabase requires the Email provider to be enabled. Manual identity linking must be enabled for the anonymous-to-email conversion flow.

Anonymous Auth users cannot recover the same identity after clearing their session unless they linked and verified an email first. Do not sign out of an anonymous session before linking if the user wants to preserve that identity.

## Primitive agent email and Supabase Auth delivery

VibeNest uses Primitive's REST API for agent inbox and outbound email. It can also deliver Supabase Auth emails through Supabase's HTTP **Send Email Auth Hook**; Primitive is not an SMTP server.

- `GET /api/agent-mail/inbox?limit=25` lists inbound messages; optional `cursor` and `status` query parameters are supported.
- `POST /api/agent-mail/inbox` sends an agent email through Primitive. Require an `Idempotency-Key` header to make retries safe. JSON body: `{ "to": "person@example.com", "subject": "Subject", "body_text": "Message" }` (or `body_html`).
- `POST /api/agent-mail/reply` replies to an inbound email ID and lets Primitive derive the original thread headers and subject.
- `GET /api/agent-mail/status` returns Primitive inbound readiness, domain and route status.
- `POST /api/webhooks/primitive` verifies the exact raw-body HMAC signature (`Primitive-Signature`, 5-minute replay window), then idempotently queues email events in Supabase.
- `GET /api/agent-mail/events?limit=25` returns pending verified inbound events to the private Agent worker; `POST /api/agent-mail/events` acknowledges an event only after processing.
- Every agent bridge request must include `x-vibenest-agent-secret`. The route uses timing-safe comparison and never returns the Primitive API key.
- `POST /api/auth/send-email` verifies Supabase Standard Webhooks signatures separately from Primitive signatures, maps Supabase email action types to VibeNest callback links, handles both OTP/hash pairs when secure email change is enabled, and sends through the shared Primitive client. The callback route verifies the resulting `token_hash`.
- To activate Auth email delivery, open Supabase Dashboard → Authentication → Hooks → Send Email, choose HTTP, and set the endpoint to the project's public custom domain at `/api/auth/send-email`. Generate a hook secret there, then add the exact `v1,whsec_...` value as the server-only Vercel environment variable `SEND_EMAIL_HOOK_SECRET`. Enable the Email provider as well. With the hook enabled, Supabase sends Auth emails through the hook instead of SMTP.
- Use the configured public custom domain for the Auth Hook endpoint, not a protected Vercel Preview URL. Vercel Preview deployments are SSO-protected in this project; the configured custom domain is the public entry point.
- Email notifications are opt-in per account. The server queue only targets verified email identities and rechecks preferences before dispatch.
- The Vercel Cron schedule is daily at 09:00 UTC (16:00 Vietnam time), but Vercel invokes Cron only on Production deployments—not Preview deployments. The current feature branch therefore builds a Preview without activating the scheduled worker.
- Configure `PRIMITIVE_API_KEY`, `PRIMITIVE_FROM_EMAIL`, `PRIMITIVE_DOMAIN_ID`, `PRIMITIVE_WEBHOOK_SECRET`, `SEND_EMAIL_HOOK_SECRET`, `VIBENEST_AGENT_API_SECRET`, `CRON_SECRET`, and `SUPABASE_SERVICE_ROLE_KEY` as server-only environment variables. Never prefix them with `NEXT_PUBLIC_`.
- Configure Primitive's inbound endpoint to `https://vibenest-vinhluong071-code.vercel.app/api/webhooks/primitive` and copy the account webhook signing secret to `PRIMITIVE_WEBHOOK_SECRET`. The event queue migration is `20261106071219_vibenest_primitive_inbound_events.sql`; apply it to the intended Supabase project before enabling webhook delivery.
- The VibeNest Preview/Production sender is `agent@rust-mule.primitive.email`, with the managed inbox domain ID stored in `PRIMITIVE_DOMAIN_ID`. Primitive's current outbound policy is restricted to approved recipients; it does not allow arbitrary external recipients yet, so verify sendability before relying on it for public signup OTP delivery.
- Run the Vercel Production variable audit with `VERCEL_TOKEN=... node scripts/check-vercel-production-env.mjs`. It reports missing variable names only and does not decrypt or print secrets.

## Supabase setup and data access

1. Enable **Anonymous Sign-Ins** in Supabase Authentication settings.
2. Enable the Email provider and email verification for account linking/recovery.
3. Enable **Allow manual linking** if Google OAuth should convert an anonymous identity instead of starting a new account.
4. Configure the Send Email Auth Hook as described above; if it is not enabled, configure custom SMTP instead.
5. Apply the migrations in `supabase/migrations` to the intended project.
6. Confirm the Data API exposes the `public` schema and the required tables.

Public feed rows are readable by design. Private chat rooms/messages are restricted to their two participants; notifications are restricted to their recipient. Email preferences are restricted to their owner, while the email queue is service-role/trigger-only. Anonymous Auth sessions use the Postgres `authenticated` role, so private-data policies must continue to bind rows to `auth.uid()` rather than treating the role alone as proof of a non-anonymous account.

The app does not claim end-to-end encryption.

## Scripts

- `npm run dev`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run check:vercel-env`

The GitHub Actions workflow `.github/workflows/vibenest-quality.yml` generates `package-lock.json` with Node.js 22/npm, runs `npm ci`, TypeScript, ESLint and Next.js build, then commits the lockfile to the feature branch only after every check passes. It also supports manual dispatch from the Actions tab.
