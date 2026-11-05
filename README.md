# VibeNest

Anonymous-first emotional sharing platform.

## Stack
- Next.js App Router + TypeScript
- Supabase Auth / PostgreSQL / Realtime (integration scaffold)
- Original Google AI Studio interface preserved at `public/vibenest-legacy.html`

## Local setup
1. Copy `.env.example` to `.env.local`.
2. Add the Supabase project URL and publishable key.
3. Run `npm install`.
4. Run `npm run dev`.

## Important migration note
The original HTML interface is preserved intact and rendered by the Next.js route through an iframe as a compatibility bridge. This avoids breaking its existing DOM-driven interactions during the first migration step. It is not yet a full JSX/component rewrite, and existing demo/localStorage data flows are not yet connected to Supabase tables. Migrate each feature to React + Supabase in separately tested steps.

Never commit `.env.local`, Supabase secret keys, or service-role keys.
