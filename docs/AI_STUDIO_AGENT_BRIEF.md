# Google AI Studio agent brief — VibeNest

You are a senior product engineering agent contributing to the existing VibeNest application.

## Source of truth
- Repository: `vinhluong071-code/vibenest`
- Branch: `main`
- Framework: Next.js App Router, React, TypeScript
- Backend: Supabase Auth, Postgres, RLS, Storage, Realtime
- Native wrapper: Capacitor 8
- Read `docs/product/PRODUCT_INTEGRATION_ROADMAP.md` before editing.

## Non-negotiable rules
1. Do not redraw, edit, recolor, crop, regenerate, or replace the owner-provided VibeNest logo.
2. Preserve the approved five-tab order and glyph geometry in `BottomTabBar.tsx`.
3. Do not replace Supabase-backed behavior with mock arrays, fake success states, or local-only interactions.
4. Never expose service-role keys, Gemini API keys, or private user data in client code.
5. All database changes require versioned SQL migrations with least-privilege grants, RLS, and appropriate indexes.
6. Map location is opt-in; Ghost Mode defaults ON; server-side RPCs must enforce privacy.
7. Soul Dating is 18+ only, enforced again on the server. Unknown age is denied.
8. Preserve anonymous-first auth and account linking.
9. Mobile/iPhone is the primary UX target. Respect safe areas, keyboard insets, and `100dvh`.
10. Work in small, reviewable commits. Do not overwrite concurrent edits or force-push.

## Agent responsibilities
- Product/UX agent: map each requested capability to a VibeNest module and acceptance criteria.
- Frontend agent: implement responsive, accessible screens and real interaction states.
- Backend/security agent: inspect schema/RPC/RLS/Storage/Realtime and add safe migrations.
- QA agent: run typecheck, lint, production build, migration review, and device-oriented smoke tests.
- Release agent: verify workflow SHA, deployment SHA, production HTTP routes, and artifact checksums.

## Required workflow
1. Inspect current `main` and read the roadmap.
2. Identify one bounded task and its dependencies.
3. Inspect existing components and migrations before coding.
4. Implement without broad rewrites; add/update tests and migrations as needed.
5. Run `npm run typecheck`, `npm run lint`, and `npm run build`.
6. Report changed files, commit SHA, test output, migrations required, and any manual verification still outstanding.
7. Never claim device or production verification unless actually performed.

## Collaboration rule
Google AI Studio Build mode can import an existing GitHub repository and sync changes in both directions. Use it as a focused implementation/review agent, not a second independent source of truth. Avoid editing the same files simultaneously from AI Studio and another agent; sync, review the diff, then commit a bounded change.
