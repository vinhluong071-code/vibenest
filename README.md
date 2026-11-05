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
- Email verification and recovery links are handled by `/auth/callback`.
- Configure the project's Supabase Auth email provider/SMTP for user verification and magic-link delivery. Primitive is an AI-agent mailbox API; it is not an SMTP replacement for Supabase Auth.

Anonymous Auth users cannot recover the same identity after clearing their session unless they linked and verified an email first. Do not sign out of an anonymous session before linking if the user wants to preserve that identity.

## Primitive agent email and notifications

The private `/api/agent-mail/inbox` route exposes a server-side bridge to the Primitive v1 REST API:

- `GET /api/agent-mail/inbox?limit=25` lists inbound messages; optional `cursor` and `status` query parameters are supported.
- `POST /api/agent-mail/inbox` sends an agent email through Primitive. Require an `Idempotency-Key` header to make retries safe. JSON body: `{ "to": "person@example.com", "subject": "Subject", "body_text": "Message" }` (or `body_html`).
- Every request must include `x-vibenest-agent-secret`. The route uses timing-safe comparison and never returns the Primitive API key.
- Email notifications are opt-in per account. The server queue only targets verified email identities and rechecks preferences before dispatch.
- Vercel Cron runs `/api/cron/email-dispatch` daily at 09:00 UTC (16:00 Vietnam time).
- Configure `PRIMITIVE_API_KEY`, `PRIMITIVE_FROM_EMAIL`, `PRIMITIVE_DOMAIN_ID`, `VIBENEST_AGENT_API_SECRET`, `CRON_SECRET`, and `SUPABASE_SERVICE_ROLE_KEY` as server-only environment variables. Never prefix them with `NEXT_PUBLIC_`.
- The VibeNest Preview uses the existing managed sender `agent@rust-mule.primitive.email`. Keep its domain ID scoped to this managed inbox; do not point VibeNest at a domain owned by another project.

The Primitive bridge and notification dispatcher are separate from end-user authentication. They do not send Supabase verification or magic-link emails.

## Supabase setup and data access

1. Enable **Anonymous Sign-Ins** in Supabase Authentication settings.
2. Enable email provider and email verification for account linking/recovery.
3. Enable manual identity linking if Google OAuth should convert an anonymous identity instead of starting a new account.
4. Apply the migrations in `supabase/migrations` to the intended project.
5. Confirm the Data API exposes the `public` schema and the required tables.

Public feed rows are readable by design. Private chat rooms/messages are restricted to their two participants; notifications are restricted to their recipient. Email preferences are restricted to their owner, while the email queue is service-role/trigger-only. Anonymous Auth sessions use the Postgres `authenticated` role, so private-data policies must continue to bind rows to `auth.uid()` rather than treating the role alone as proof of a non-anonymous account.

The app does not claim end-to-end encryption.

## Scripts

- `npm run dev`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
