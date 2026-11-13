# VibeNest product integration roadmap

Last audited: 2026-11-13
Repository: `vinhluong071-code/vibenest`
Target branch: `main`
Current audited HEAD: `20cf3f2b4c40e385b09713ee642fb11a2c817cfc`

## Product direction

Build one coherent, mobile-first social product, not a collection of copied app screens. Borrow interaction patterns and capabilities where they complement VibeNest's anonymous-first emotional connection, creative expression, social discovery, and location-aware friendships. Do not copy third-party trademarks, proprietary assets, or exact screen designs.

## Brand invariants

- The owner-provided VibeNest wave-and-smile logo is immutable: do not redraw, recolor, crop, trace, regenerate, or replace it.
- Do not silently swap in `src/components/brand/VibeNestLogo.tsx` or `public/vibenest-logo.svg` as the canonical artwork. These are separately authored SVG variants and must be reconciled with the owner-approved source asset before brand rollout.
- Preserve the approved five-tab order and icon geometry in `src/components/navigation/BottomTabBar.tsx`: Map/GPS, Chat, Camera, Home/Friends, Profile/Spotlight. Do not introduce a house glyph or labels without approval.
- Mobile/iPhone layout is the primary acceptance target. Respect safe areas, `100dvh`, keyboard insets, scroll locking, and a single visible primary surface at a time.

## Reference-app capability map

| Reference apps | Patterns worth integrating | VibeNest destination |
|---|---|---|
| Facebook, Instagram, X | Following/For You feeds, reactions, threaded comments, repost/quote, notifications, creator profiles | Home Feed, post detail, notification center |
| Pinterest, Lemon8 | Visual discovery, topic boards, editorial cards, save/collections, rich media metadata | Explore, collections, topic discovery |
| Lemo, Litmatch | Anonymous-first conversations, mood-based matching, voice rooms, low-pressure connection | Mood matching, Voice Lounge, anonymous chat |
| TikTok, Douyin, Snapchat | Full-screen vertical video, camera-first capture, Stories, short-form creator loops, ephemeral sharing | Reels, Stories, Camera |
| CapCut, Hypic, Meitu, Wink, Canva | Trim/crop, filters, retouching, text/stickers, templates, cover design, export presets | VibeBooth / Creator Studio |
| Tinder | Explicit mutual matching, consent-based swipe actions, age-gated dating | Soul Dating (18+) |
| Zalo, Telegram, Discord, Reddit | Direct/group messaging, media/file sharing, communities, channels, moderation, threaded discussion | Messenger, Community Spaces |
| Hago, WePlay | Lightweight social games, party rooms, shared activities | Social games / Voice Lounge extensions |
| Bump, Zenly, Jagat, VietnamOi | Opt-in friend location, place discovery, check-ins, local context, map layers | Vibe Radar / Map |

## Product modules and acceptance criteria

### 1. Home Feed
- Unified Following, For You, Nearby (coarse and consent-based), and topic filters.
- Real post data, media previews, pagination/infinite loading, pull-to-refresh, optimistic interactions with rollback.
- Persist likes, comments, saves, shares/reposts, and report/block actions; never present local-only state as saved server data.
- Clear loading, empty, offline, and retry states.

### 2. Stories
- Native image/video upload to owner-scoped Supabase Storage; no URL-prompt publishing flow.
- 24-hour expiry enforced in database queries and cleanup strategy.
- Q&A and two-option polls use existing story tables and privacy-safe aggregate reads.
- Viewer progress, pause/resume, tap navigation, accessibility controls, and owner-only question inbox.

### 3. Reels
- Vertical 9:16 player with intersection-based autoplay, pause when off-screen, mute control, captions, audio attribution, and reduced data mode.
- Add an explicit, RLS-protected Reels schema and media upload path before relying on `vibenest_reels`.
- Persist likes and comments; implement share/report/save and moderation. Do not show a working-looking control that only changes local component state.

### 4. Messenger and communities
- Realtime 1:1 and group messaging, unread counts, delivery/read states, reactions, attachments, reply/thread, block/report, and notification preferences.
- Keep private channels scoped to authorized participants; never expose sender IDs in anonymous Q&A views.
- Community roles, rules, moderation, mute/leave, and discovery controls.

### 5. Camera and Creator Studio
- Camera-first capture with permission education and graceful fallback when browser/native camera APIs are unavailable.
- Non-destructive editing: crop, rotate, exposure/color presets, stickers, text, music/audio selection, cover frames, and export.
- Keep the original VibeNest brand asset out of AI retouch/filter pipelines.

### 6. Map / Vibe Radar
- Friend location sharing is opt-in, revocable, and scoped per friend/list. Ghost Mode defaults ON until the user explicitly shares.
- Server-side privacy transformation and access checks are mandatory; never trust a client-supplied ghost flag or render precise coordinates to unauthorized users.
- Implement real check-in/place data before enabling Kỷ niệm, Nhiều người ghé thăm nhất, or Thịnh hành filters. Until then label them unavailable, not live.
- Provide location retention limits, pause sharing, per-friend controls, and clear last-updated timestamps.

### 7. Soul Dating (18+)
- Keep the feature inaccessible unless server-verified age is at least 18.
- Server-side matching and chat-room RPCs must independently validate age, consent, block lists, and match state.
- Add report, unmatch, block, rate limits, and abuse review before launch.
- Unknown birth date is not proof of adulthood.

### 8. AI Search / Aura
- Search only public profiles and content unless the user has granted explicit access.
- Add Vietnamese query understanding, typo tolerance, safe filters, rate limits, abuse prevention, and clear source attribution.
- Keep Gemini keys server-side; never ship provider secrets to the browser or mobile bundle.

## Current audit findings (verified from main source)

- `src/components/feed/HomeFeedView.tsx` queries `vibenest_reels`; no migration creating that table was found in the current migration tree.
- Reels comments currently display a notice saying the comments endpoint is not connected; Reels likes are component-local state.
- Story creation currently uses browser prompts and an HTTPS URL rather than a native file-upload flow. The canonical Stories schema found is `public.vibe_stories`; duplicate fallback table names should be removed after compatibility is confirmed.
- Map discovery filter handlers currently display explanatory placeholder messages instead of querying check-in/place datasets.
- The client calls `get_friends_map_locations` and `update_my_location`; matching RPC definitions were not found in the checked migration set. Verify deployed SQL before enabling real location sharing.
- Soul Dating calls `swipe_match` and `start_dating_chat`; matching RPC definitions were not found in the checked migration set. Verify deployed SQL and server-side age enforcement before launch.
- `VibeNestLogo.tsx` and `public/vibenest-logo.svg` contain separately authored SVG artwork. They are not interchangeable with the owner-provided immutable logo.

## Delivery order

1. Brand/source-of-truth and mobile shell audit; remove duplicate/competing logo usage without altering the approved artwork.
2. Backend contract audit: migrations, RPC existence, RLS, Storage buckets, Realtime publication, and actual deployed schema.
3. Feed + Stories publishing and persistence.
4. Reels schema, upload, persistent interactions, and moderation.
5. Messenger and community reliability.
6. Camera/Creator Studio.
7. Map privacy and real check-in discovery.
8. Soul Dating 18+ server enforcement.
9. AI Search and Aura integrations.
10. iPhone/Android end-to-end smoke tests and production HTTP verification.

## Release truth labels

Report each feature as one of: `Implemented`, `CI passed`, `Deployed`, `Backend verified`, `Device tested`. These labels are not interchangeable. Never claim a feature works on a real device solely because TypeScript, lint, build, or APK packaging succeeded.
