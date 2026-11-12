# RIO — Phase 1 Implementation Report: Feed Optimization + Premium UI/UX + Social Discovery

**Date:** 2026-11-11 · **Status:** Implemented, all gates green · **Deployed:** No · **Committed:** No (working tree; awaiting explicit go-ahead)

Phase 1 transforms the Home page into a polished, responsive, three-column social dashboard while keeping every existing feature intact. No new npm dependencies, no API breakage, no production data changes.

---

## 1. Delivery summary (by spec area)

### A. Three-column layout + navigation
| Piece | File(s) | Behavior |
|---|---|---|
| App shell | `client/src/components/layout/AppShell.jsx` + `Shell.css` | Grid `240px / content`, max-width 1330, sticky rail; wraps every protected route via `ProtectedRoute → AppShell → page` |
| Left nav rail | `layout/LeftNav.jsx` + `LeftNav.css` | Home · Explore · Messages · Notifications · Bookmarks · Profile · Settings; unread badges (99+ cap); user card + avatar; logout (`resetUnread()`); **icon-only rail ≤1023px**; hidden <768px |
| Bottom nav | `layout/BottomNav.jsx` + `BottomNav.css` | Fixed bar <768px: Home · Explore · Messages · Notifications · Profile with badges; `aria-label` per link; clears the 76px shell padding |
| Slim top navbar | `components/Navbar.jsx` | Brand, spacer, ThemeToggle, Login/Sign up (logged out) or avatar→settings + logout (logged in); `aria-label="Top"`; nav badges moved out to the rails |

### B. Home page center column
- **Welcome header** — avatar + "Welcome back" + char-reveal greeting (plain `<h1>` under `prefers-reduced-motion`).
- **Compact composer** (`home/CompactComposer.jsx` + `Composer.css`) — collapsed row `[avatar][What's happening?][Image][Category][Post]` expands the **existing** `CreatePostForm` (single implementation; category prop already existed). Draft survives category changes; new posts prepend instantly via `prependLocal`.
- **New-posts pill** (`home/NewPostsPill.jsx`) — floating `↑ N new posts`, `aria-live="polite"`, entrance keyframe (killed by reduced-motion CSS); reveal prepends + smooth-scrolls to top. New posts are **never auto-inserted**.
- **Suggestions card** (`home/SuggestionsCard.jsx` + `SideCards.css`) — 5 per page, real labels only (`Followed by N` / `New to RIO` / `N followers` / bio fallback), optimistic follow (busy-guard, auth-state sync, revert-on-failure via post-success update), loading / error+Retry / empty states, "See all suggestions" (offset paging until `hasMore`).
- **Mini Messages card** (`home/MessagesCard.jsx`) — top 4 conversations: avatar, name, `shortTime`, `You:` preview, per-conversation unread badge; click → `navigate("/messages", { state: { conversationId } })` (existing chat-open mechanism preserved); 45s visibility-aware polling with overlap guard; "See all" + "Open Messages".
- **Trending card** (`home/TrendingCard.jsx`) — top 6 hashtags → `/search?q=`; hidden on error/empty.
- Side column is `position: sticky`, **hidden ≤1379px** (center becomes full width).

### C. Feed + fetch optimizations
- **Server cursor pagination** — `server/utils/cursor.js` (opaque base64url `millis|_id`, `_id` tie-break) + `server/controllers/feed.controller.js` (moved out of `post.controller.js` to respect the 150-line rule):
  - `GET /api/posts?cursor=` → keyset filter `createdAt < cursor` (or equal + `_id <`), sort `{createdAt:-1,_id:-1}`, `limit` ≤ 50, fetch `limit+1` → `hasMore`, `nextCursor`; response gains `hasMore` + `nextCursor` (all previous fields kept).
  - Invalid/stale cursor → silent fallback to page mode (never hard-fails).
  - `countDocuments(base)` without cursor; visibility filtering (F-13) preserved unchanged.
- **Indexes** — `postSchema.index({createdAt:-1,_id:-1})`, `userSchema.index({followers:1})`; built by mongoose `autoIndex` on connect (no manual sync against production — deliberate).
- **Client feed** (`lib/useFeed.js`) — cursor state + `_id` seen-set dedupe across pages, pending buffer, `loadMore`, `loadInitial` retry, optimistic `handleLike`, `feedRef`/`sentinelRef`; `React.memo(PostCard)`.
- **Dual-shape tolerance (feed-cap fix)** — the client understands **both** response shapes: cursor payloads (`hasMore`/`nextCursor`) and legacy page payloads (`page`/`totalPages`). If a stale/older API build answers without cursor fields, `hasMore` is derived from `page < totalPages` and paging falls back to page mode — the feed never silently caps at the first 10 posts. A stuck position (server claiming more but never advancing) stops cleanly instead of looping.
- **Refresh** (`lib/useFeedRefresh.js`) — now delivers new posts through an `onFresh` **buffer** callback (no silent prepend, scroll-position gate removed so the pill works at any depth).
- **Route-level code splitting** — every page is `React.lazy` with a Suspense `.route-loading` fallback (`role="status"`).
- **Visibility-aware polling** — shared module-level `lib/useUnreadCounts.js` (30s, single in-flight, hidden-tab aware, `resetUnread()` on logout) powers both rails; inbox card polls at 45s with its own guard.
- **Relative time** — new `lib/time.js` (`timeAgo`, `shortTime`).

### D. Secondary pages & interactions
- **Bookmarks reachable from nav** — LeftNav links to `/profile?tab=bookmarks`; `Profile.jsx` initializes and syncs the tab with `useSearchParams` (shareable URL).
- **Functional Save on every post card** — `PostCard` toggles `toggleBookmark` (optimistic + revert on failure + toast), `aria-pressed`, Saved/Save label; syncs `user.bookmarks`.
- **Post-page comments now paginate** — `PostDetail` previously fetched only page 1 (20 top-level comments) with no way to load the rest; the comments section moved to `components/PostComments.jsx` with page state, append-style **"Load more comments"** (server `page`/`totalPages`), local submit + error handling.
- **PostAuthor** — relative timestamp (`· 3h ago`).
- **A11y pass** — `aria-label`s on all icon-only buttons, `aria-pressed` on like/save, `aria-live` on pill + route fallback, labelled nav landmarks, focus-visible + reduced-motion CSS already global; badge counts readable in link text.
- **Responsive matrix** — `1379` (sidebar drops) · `1279` (rail 216) · `1023` (icon rail 64) · `767` (bottom nav, composer category hidden) · `720` (nav username hidden); gutters 24→12px; shell bottom padding clears the fixed bar.

---

## 2. API contract additions (backward compatible)

| Endpoint | Change |
|---|---|
| `GET /api/posts` | Accepts `cursor`; response adds `hasMore: Boolean`, `nextCursor: String\|null`. Page mode untouched. |
| `GET /api/users/suggestions?limit&offset` | **New** (protected): `{users:[{_id,username,name,avatar,bio,isPrivate,followersCount,mutualCount,isNew}], hasMore}`; excludes self/following/suspended; mutuals ranked first (via first-20 follows `$in`), then recent joins; `limit ≤ 10`, `offset ≤ 100`; no invented popularity/activity fields. |

Everything else (messages inbox shapes, bookmarks, follow toggles, categories, `imageOnly`) is consumed as-is.

---

## 3. Files touched

**New (server):** `utils/cursor.js`, `utils/postShape.js`, `controllers/feed.controller.js`, `controllers/suggestion.controller.js`
**New (client):** `components/layout/{AppShell,LeftNav,BottomNav}.jsx` + `{Shell,LeftNav,BottomNav}.css`, `components/home/{CompactComposer,NewPostsPill,SuggestionsCard,MessagesCard,TrendingCard}.jsx` + `{FeedChrome,Composer,SideCards,MessagesCard,TrendingCard}.css`, `components/PostComments.jsx`, `styles/PostExtras.css`, `lib/{useFeed,useUnreadCounts,time}.js`

**Modified:** `App.jsx` (lazy + shell), `Navbar.jsx` (slimmed), `Home.jsx` (dashboard rewrite), `Profile.jsx` (`?tab=`), `PostDetail.jsx` (comments section extracted → paginated), `PostCard.jsx` (Save + a11y + memo), `PostAuthor.jsx` (time), `services/api.js` (`getFeed`, `getSuggestions`), `lib/useFeedRefresh.js` (onFresh), `styles/interactions.css` (`.route-loading`), `server/controllers/post.controller.js` (slimmed), `server/routes/post.routes.js`, `server/routes/follow.routes.js` (`/suggestions`), `server/models/{post,User}.js` (indexes), `project.md` (all sections refreshed), `run_tests.js` (6th suite — locally gitignored by repo convention).

**Unchanged on purpose:** `CreatePostForm` (reused by the compact composer), `PostMedia` (already lazy), messages page state-based chat opening, error contract `{errors:[...]}`, CSRF/Origin pairing on all new mutations.

---

## 4. Tests

**`test_phase1.js` (174 assertions)** added as suite 6 of `run_tests.js`:
- **Cursor feed** — first-page shape/order/uniqueness; full multi-page walk with **zero duplicate ids**; new post created mid-walk excluded from stale cursors; invalid-cursor page-mode fallback; legacy `page` mode; `limit` cap at 50; category filter; guest access.
- **Suggestions** — 401 unauthenticated; shape (`users`, `hasMore`); limit cap; **self excluded**; no email/password leak; real computed fields (`mutualCount` number, `isNew` boolean); 3-user mutual scenario (`F→M`, `A→F` ⇒ M surfaces with `mutualCount ≥ 1`); **follow integration: followed candidate disappears, unfollow restores**.
- **Bookmarks** — on/off/on toggles, list membership in both states.
- **Messages** — create/reuse conversation, inbox row shape (populated participants, `lastMessage`, unread ≥ 1), unread-count badge numbers, mark-read → 0, **outsider 403 on read/write/mark-read, find-only GET → 404 with no orphan spawned, self-message 400**.

**Full gates (all green):**

| Gate | Result |
|---|---|
| `node test_lines.js` | **178 files, 0 over 150** |
| `node run_tests.js` | **6/6 suites — 434+ assertions** (m1 18 · m234 74 · m56 58 · images 31 · security 79 · phase1 174+ — phase1's cross-page duplicate checks grow with feed size each run) |
| `npm run lint` (client) | **0 warnings** |
| `npm run build` (client) | **✓ built** (route chunks split: Home, Profile, PostCard, Messages, …) |

**Live flow proof against the dev database** (`home_flow_tmp.js`, read-only, isolated port): the exact client request sequences walked **all 148 feed posts across 15 cursor pages** (hasMore starts true, terminates correctly, newest-first monotonic, zero duplicate ids) and **all 125 image posts across 5 Explore pages** — Home/Explore pagination is genuinely endless until data exhaustion.

---

## 5. Notes & known limitations
- **No reference screenshots** existed in the workspace; layout was implemented from the written spec (column widths/breakpoints listed in §1D).
- `imageOnly` still filters the legacy `image` field only (pre-existing gotcha, untouched); feed `total` counts before visibility filtering (pre-existing).
- Feed visibility (F-13) filters after the page slice, so a page may show fewer than `limit` posts when private accounts are excluded — unchanged P0 behavior.
- New Mongo indexes build automatically via mongoose `autoIndex` on server start; if a pre-existing conflicting plan exists on production, a one-off `syncIndexes()` may be run later (not executed here — production data untouched by design).
- Repo convention: `.gitignore` excludes `run_tests.js` / `test_*.js` ("local test & scratch scripts"), so the suites — including `test_phase1.js` — are local verification only, same as the P0 suites.
- Not deployed and not committed: production Render/Vercel still serve the P0 state (`fc112bc` / `1fe6af6`) until you say the word.

## 6. Verify locally
```bash
node test_lines.js      # 150-line rule
node run_tests.js       # 6 suites (kill stray node first)
cd client && npm run lint && npm run build
```
