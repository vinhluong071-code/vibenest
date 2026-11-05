# VibeNest

VibeNest is an anonymous emotional-connection social app built with Next.js App Router and Supabase.

## Local development

1. Use Node.js 22.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
5. Run `npm run dev`.

## Supabase setup

1. Enable **Anonymous Sign-Ins** in Supabase Authentication settings.
2. Apply `supabase/migrations/20261105010000_vibenest_social_core.sql` to the intended project.
3. Confirm the Data API exposes the `public` schema and these tables.
4. Anonymous sessions are created only after the user chooses **Tiếp tục ẩn danh**, or when they attempt to publish, react, save, or reply.

The public feed does not expose internal Auth user UUIDs. The app does not claim end-to-end encryption. Anonymous Auth accounts cannot be recovered after losing their session unless an account-linking/recovery flow is added.

## Scripts

- `npm run dev`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
