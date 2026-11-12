# RIO — The Social Platform You Own

> **A full-stack social network, built from zero. No page builders, no templates, no shortcuts.**
> This is the complete project document: **Part I — Product** (the pitch: why it exists, what it ships, architecture, roadmap) and **Part II — Engineering Reference** (data models, full API, security, media pipeline, testing, deployment).

---

# PART I — PRODUCT

## 1. Why RIO Exists

Today's social platforms are rented land.

| Problem | Reality on existing platforms |
|---|---|
| No ownership | Your audience and content live inside someone else's rules, bans, and algorithm changes |
| Opaque moderation | Removals and shadow-bans with zero transparency or appeal |
| Black-box ranking | Feeds optimized for ad dwell-time, not for the user |
| Bloat | 500KB+ of JS before a feed renders |
| Lock-in | Export your data... if you're lucky |

RIO is the counter-model: **a social platform that can be run by its operator, understood by its developer, and trusted by its users** — because everything from the auth cookie to the moderation powers is visible, auditable, and configurable in one small codebase.

For a **creator community, campus network, brand tribe, or niche interest group**, RIO is the difference between "posting on someone's platform" and **running your own**.

### Core design principles
1. **Readable over clever** — every source file under 150 lines, one concern per file.
2. **Errors everywhere** — every route has validation + a uniform `{ errors: [...] }` response.
3. **CLI-only verification** — tests, lint, and line-checks run from the terminal; no browser automation.
4. **Security by default** — short-lived JWTs + server-side sessions, CSRF tokens, Argon2id, layered rate limiting, strict CORS, security headers.
5. **Progressive enhancement** — animations and background effects respect `prefers-reduced-motion`.

---

## 2. What RIO Ships Today (Feature Breakdown)

### Identity & Access
- **Register / Login / Logout** — short-lived JWT in an **httpOnly cookie** (not localStorage — immune to XSS token theft) backed by a server-side session; silent refresh on expiry
- **Forgot / Reset password** — single-use, 1-hour opaque token delivered by email only (never returned by the API; local outbox in dev/test)
- **Change password** with old-password verification — revokes every other session
- **Account deletion** (password-confirmed, staged and idempotent — see §15)
- **Argon2id** hashing (OWASP params); legacy bcrypt hashes upgraded transparently on login
- **Admin role** — a privileged account with moderation powers (see §5)

### Posts & Content
- **Text posts** with automatic **hashtag extraction** (`#discipline` → indexed, searchable, clickable)
- **Multi-image posts — up to 8 images per post**, served as a **swipeable carousel** with slide counter, arrows, and dot indicators
- **Click-to-zoom lightbox** on every image — spring-animated expand/shrink, keyboard navigation (←/→/Esc), works for single images and carousel slides alike
- **Post editing** with "Edited" badge
- **Post deletion** (owner — or admin) with full cleanup: comments, bookmarks references, and **images removed from Cloudinary**
- **Category tagging** on posts (`motivation`, `billionaire-mindset`, `f1`, `motorsport`) — one schema field, queryable, ready for any taxonomy
- **Rich composer** — drag-and-drop + file picker sharing one validation path, per-image previews with removable cells, `n/8` counter, near-limit char-count warning, a11y labels
- **Image reordering** — drag-and-drop, keyboard arrows, and ‹ › buttons on preview cells; preview order is the submit order end-to-end (multipart → schema)
- **Image cropping** — pre-publish crop/position editor (Original / 1:1 / 4:5 / 16:9, pan + zoom, 2048px output cap); the cropped canvas bytes ARE the uploaded bytes, so the confirmed preview is pixel-identical to the published image; GIFs are never rasterized
- **Upload progress & retry** — truthful request-level progress bar with Cancel and safe Retry (server only creates the post on a completed body — no duplicate posts/media)
- **Post drafts** — owner-private `Draft` collection (never surfaces in feeds), versioned patches with 409 conflict detection, **debounced autosave** after the first explicit save, publish that moves files without re-upload, DraftsList panel on home
- **Share URLs** — stable `GET /posts/:id` on the API origin renders server-side og/twitter meta for link scrapers + redirects humans into the SPA; visibility-gated with the exact API policy (restricted/deleted → content-free 404), always `Cache-Control: no-store`; share menu targets it, dead links show a friendly "Post unavailable" page

### Feed & Discovery
- **Home — three-column dashboard** — sticky left rail (Home / Explore / Messages / Notifications / Bookmarks / Profile / Settings with unread badges + user card), center feed column, right sidebar; icon-only rail on tablets, fixed bottom nav under 768px, sidebar hides as space runs out
- **Compact composer** — collapsed "What's happening?" row (avatar, trigger, image button, category select, Post) expands the existing full composer — one implementation, draft preserved when switching category; new posts prepend instantly
- **Suggested for You** — real computed suggestions only: mutual connections (shared follows, ranked) then recently-joined accounts; excludes self and everyone you already follow; optimistic follow with auth-state sync; "See all suggestions" pages server-side (`limit ≤ 10`, `offset ≤ 100`, `hasMore`)
- **Mini Messages card** — top 4 conversations with avatar, relative time, `You:` preview and per-conversation unread badge; one click deep-links into the chat; 45s visibility-aware polling with overlap guard
- **Trending sidebar card** — top hashtags → instant search (hidden when empty)
- **"N new posts" pill** — the 45s/focus refresh buffers genuinely new posts and shows a floating `↑ N new posts` pill (aria-live) instead of jumping the feed; reveal prepends and scrolls to top (never auto-inserts)
- **Cursor pagination** — newest-first keyset cursor over `createdAt|_id` (opaque base64url): no page overlap, survives inserts/deletes between pages, invalid/stale cursors fall back to page mode; responses carry `hasMore` + `nextCursor`
- **Auto-load on scroll** — IntersectionObserver sentinel (400px margin) loads the next page before you reach the button, with **staggered scroll-reveal animations** (post cards memoized; GSAP entrance skipped under reduced motion)
- **Explore** — photo-first masonry-style grid of every image post, plus:
  - **People search** with live results
  - **Post & hashtag search**
  - **Trending hashtags** (computed from real usage, not guesses)
  - **Recent searches** (persisted per user, removable)
- **Clickable hashtags anywhere** — post body, comment threads, detail views → instant search

### Social Graph
- **Follow / unfollow** any user, with optimistic UI (button state flips instantly, reverts on failure)
- **Followers / following lists** on every profile
- **Profile pages** — avatar, cover image, bio, counts, post grid
- **Profile editing** — image uploads via drag-to-upload areas, live preview

### Engagement
- **Likes** — toggle, accurate counts, optimistic
- **Comments** — **threaded up to 3 levels deep** (comment → reply → nested reply), with depth enforced at the API and in the schema (`depth` max 3)
- **Comment likes**, comment editing, comment deletion (cascades to children)
- **Bookmarks** — private save, dedicated bookmarks view, bookmark search; **Save toggle on every post card** (optimistic, `aria-pressed`) and a **Bookmarks nav entry** deep-linking to `/profile?tab=bookmarks` (tab synced to the URL)

### Stories (24h ephemeral)
- **Create & view stories** — image stories live 24 hours; `expiresAt` comes from the **server clock** and every read filters on it (expired → 404 regardless of UI), backed by a TTL index **plus** a lazy sweep that deletes expired docs **and their media files**
- **Story tray** above the feed (own "Your story" create entry + one ring per followed author with active stories, session-local seen state) and a **fullscreen viewer** (5s auto-advance with progress bars, tap zones / arrow keys / Esc, deduped view recording, author-only viewer list + Delete)
- **Privacy** — blocks always hide; private accounts and followers-only stories require the approved follow edge; view records are stripped for everyone except the author
- **Profile story ring** — active stories ring your avatar on your profile; click opens the same viewer

### Notifications
- Generated for **likes, comments, and follows**
- **Unread badge** in the left rail / bottom nav (polling-based, updates as you browse)
- Mark-one / mark-all read, delete individual notifications
- **Never notifies yourself** for your own actions

### Messaging
- **1:1 conversations** — auto-created or reused on first message
- **"New" conversation button** — opens a picker of people you **don't already chat with** (existing conversation partners are excluded server-side), with debounced name/username search, avatar rows, and one-click start
- **Threaded message list** with real conversation previews
- **Unread badge counts PEOPLE, not messages** — distinct users with unread messages (3 unread from 1 person shows `1`), shown in the left rail and bottom nav
- **Unread counts** per conversation + **mark-as-read** with server-side unread tracking both directions
- **Conversation seeding** — every demo user ships with realistic, on-persona chat history

### Experience Layer
- **Light / dark theme** — CSS-variable driven, persisted to localStorage (`rio-theme`), with an **anti-flash script** in `<head>` (no white blink on load)
- **Living neon network background** — a canvas constellation behind the app: nodes, edges, and glowing signal particles that **travel the real edges** with trails (GSAP ticker, debounced resize, visibility pause; static single frame under reduced motion; hidden in light theme)
- **Cold-start gate** — `BackendReady` shows a themed loading screen (with elapsed time and a friendly message after 2 minutes) while polling `/health`, so a Render cold start never looks like "you were logged out"
- **RIO branding** — theme-aware logo marks across navbar and all auth screens
- **Cloudinary-served imagery** — every image URL gets `f_auto,q_auto` (auto webp/avif + adaptive quality); verified ~35% smaller payloads
- **Motion-first UI** (built on `motion` + a vendored motion-primitives library):
  - Spring-animated image lightbox
  - Char-level text reveal on the home greeting, word-level on auth titles
  - Scramble-decode effect on dynamic titles
  - Staggered feed entrance animations
  - Magnetic hover on primary CTAs
  - Scroll-progress bar across the navbar
  - Drag-swipe carousels with friction physics
- **Fully responsive** — desktop nav collapses gracefully to icon-only on narrow screens

---

## 3. What Makes RIO Different

### vs. mainstream networks (Instagram, X, Threads)
| | RIO | Mainstream |
|---|---|---|
| Who owns the data | **You** (your DB, your Cloudinary/S3) | The platform |
| Feed ranking | **Chronological. Always.** | Engagement-optimized black box |
| Moderation | **Transparent, role-based, auditable** | Opaque, automated, appeal-less |
| Ads / tracking | **Zero** | The business model |
| Codebase | **~250 small files, one engineer can hold it** | Millions of LOC |
| Deploy cost | A free-tier VPS + a database | — |

### vs. "build your own" alternatives
- **vs. Discord communities** — RIO is a *content* network (posts, feeds, discovery), not chat rooms bolted onto voice
- **vs. WordPress + social plugin** — those are bolted-on bolt-ons; RIO's likes/comments/follows are *first-class schema citizens* with indexes, pagination, and real tests
- **vs. Mastodon/ActivityPub** — RIO is deliberately single-instance and simple; federation is a roadmap item, not a prerequisite tax

### The honest technical differentiators
1. **Multi-image carousels done right** — 8 images per post, append/remove individual slides after publish, per-file cleanup on delete, drag physics, zoom lightbox. Most tutorial-grade clones ship single-image only.
2. **Admin moderation built in from commit zero** — role field, server-side `canModerate()` check (DB-verified, not trust-the-JWT), and UI that surfaces edit/delete to admins on *every* post. Most portfolios add this never.
3. **Real engagement seed data** — 24 users, 148 posts, 755 comments, 37 conversations, 219 messages of on-voice content. The demo doesn't look like `test test test` — it looks *alive*, which is what an investor actually needs to see.
4. **Motion system, not motion theater** — every animation is spring-based (`motion` library), performant, and mounted only where it improves comprehension (zoom, stagger, progress), not sprinkled for showreels.
5. **Engineering discipline as a feature** — see §6.

---

## 4. How It Works (Architecture)

```
┌─────────────────────────────┐
│  React 19 + Vite SPA        │  Tailwind v4 · motion · gsap · lucide icons
│  (client/)                  │  Feeds: auto-load + 45s live refresh
└──────────────┬──────────────┘
               │ fetch  ·  credentials: "include"  ·  JSON / FormData
               ▼
┌─────────────────────────────┐
│  Express 5 API  (server/)   │  CORS (strict origin allowlist) · cookie-parser
│                             │  Rate limiter (env-aware) · security headers
├─────────────────────────────┤
│  Routes → Controllers       │  Thin, single-responsibility, ≤150 lines each
│  → Models (Mongoose 9)      │  Compound indexes on every hot query path
└──────┬──────────────┬───────┘
       │              │
       ▼              ▼
  MongoDB 7+      Cloudinary
  (Atlas: users,  (rio/posts, rio/avatars,
   posts,          rio/covers — CDN delivery
   comments,       with f_auto,q_auto;
   conversations,  legacy /uploads disk
   messages,       kept as fallback)
   notifications)
```

**Middleware order:** CORS allowlist → `express.json` / urlencoded → cookie-parser → security headers → rate limiter (`/api`) → route mount → `optionalAuth` / `protect` (JWT from cookie) → controller → `notFound` → `{ errors: [...] }` error handler.

### The request lifecycle (example: liking a post)
1. Client sends `POST /api/posts/:id/like` — JWT rides in an **httpOnly cookie**, never in JS-accessible storage
2. Express: CORS gate → **rate limiter** (per-IP sliding window) → security headers → `protect` middleware verifies JWT → `req.user` populated
3. Controller loads the post, checks the caller's like set, `$addToSet`/`$pull`s atomically
4. If the like is new, a **notification document** is created for the post's author (self-actions skipped)
5. Response: `{ liked, likesCount }` — client updates the heart optimistically

### The media pipeline (summary — full detail in §16)
- Uploads validated at the multer layer: **jpeg/png/gif/webp only, 5MB cap, max 8 files**
- When Cloudinary is enabled, files go **memory → Cloudinary** (folder `rio/posts` / `rio/avatars` / `rio/covers`); controllers store the remote URL
- Failed validations leave nothing behind (no orphan disk garbage)
- Deletes walk the entire cleanup path: DB refs → bookmark references → **Cloudinary destroy (or local unlink for legacy files)**
- Every delivered URL is rewritten with **`f_auto,q_auto`** so browsers get modern formats at adaptive quality

### Auth security model
- **Session-backed auth:** 15-minute access JWT (`{id, sid}`) in an httpOnly cookie + hashed refresh token rotated on every `/refresh` (30-day TTL, reuse detection, 30 s parallel-tab grace). Logout, password change/reset, suspension and account deletion all revoke sessions server-side.
- **CSRF:** every state-changing request needs a session-bound token (`X-CSRF-Token` header) *and* a trusted `Origin`/`Referer` — the client attaches it automatically.
- **Passwords:** Argon2id (OWASP m=19456, t=2, p=1); bcrypt verified then upgraded on login. Never present in any response (`-password` select, tested).
- **Reset:** opaque 32-byte token stored as SHA-256 hash, single-use, 1 h expiry, generic responses; never logged or returned.
- **Cookies:** `secure; httpOnly; SameSite=None` in production (Vercel → Render is cross-site), `Lax` on localhost; `path=/`, lifetimes aligned with the session.
- **Admin powers are re-checked against the database** per request; suspended accounts can't log in and lose their sessions.
- **Rate limiting:** layered per-IP + per-account limiters, every `*_RATE_MAX` env-tunable; 429s use the standard `{errors:[...]}` contract.

---

## 5. Admin & Moderation (The Operator's Console)

Any account with `role: "admin"` (created via `node create-admin.js`):

- Sees **Edit + Delete on every post in the feed** and on every post detail page
- Can edit another user's content (marked Edited — no stealth rewriting)
- Can delete another user's post — with the **same full cleanup path** as a owner delete (comments, bookmarks, images)
- Can **suspend / restore** accounts (`POST /api/admin/users/:id/suspend|restore`) — suspension revokes every session and blocks login until restored
- Every moderation + suspension action writes an append-only **audit entry** (actor, action, target, reason, ip, outcome) readable via `GET /api/admin/audit`
- **Reports & appeals queue** — users report posts/comments/users (`POST /api/reports`); admins triage in the **Moderation dashboard** (`GET /api/admin/reports`, detail with full context, resolve/dismiss with notes — every decision audit-logged). Decided subjects can **appeal** (`POST /api/appeals`, unique per report ever); an **approved appeal reopens the report** to `reviewing`; only the affected subject may appeal
- Cannot be spoofed from the client: the role claim is verified server-side on every moderated action

This is the difference between a *demo* and a *platform someone can actually operate*.

---

## 6. Engineering Rigor (Why This Survives Contact With Reality)

| Discipline | Implementation |
|---|---|
| **150-line hard rule** | Every owned source file (JS/JSX/CSS) is capped at 150 lines, enforced by `node test_lines.js` across client + server. No god-components, no 800-line "utils". (Vendored `motion-primitives/` is exempt and documented.) |
| **Test suite** | **814 CLI-driven assertions across 7 suites** — `test_m1.js` auth (18), `test_m234.js` posts/profile/users (74), `test_m56.js` messages/notifications (58), `test_images.js` images/Cloudinary/drafts/media-safety/image-order/stories (93), `test_security.js` security (81: CSRF, sessions, reset, Argon2id migration, upload attacks, 429s, admin audit, IDOR, fail-fast secrets), `test_phase1.js` cursor feed/suggestions/bookmarks/inbox privacy/drafts/share URLs/media reconcile (542), `server/test_socket.js` socket handshake/presence/typing/receipts (48). Zero browser automation flakiness; pure `http.request` against a live server. |
| **Idempotent seeding** | Every seed script is re-runnable: content-prefix guards, per-pair chat dedup, deterministic PRNG. Run it twice → +0 duplicates, guaranteed. |
| **DB isolation** | Tests target a separate database — `db.js` automatically suffixes `_test` onto the DB **name** (`rio-database_test`) with an elevated rate limit — production data is never touched. |
| **Error contract** | Every endpoint returns `{ errors: [...] }` on failure. One shape. Predictable client handling. |
| **Index-backed queries** | Compound indexes on `category+createdAt`, `author+createdAt`, `post+createdAt`, hashtag arrays — feeds and comments stay O(log n) as data grows. |
| **Lint-clean** | oxlint, 0 warnings, including rules on the vendor boundary (motion-primitives excluded explicitly, documented). |

---

## 7. The Numbers (Live Instance — Atlas `rio-database`)

| Metric | Count |
|---|---|
| Users | 24 (21 personas + 1 admin + live signups) |
| Posts | 148 (125 with images, 23 text-only) |
| Comments | 755 (threaded to depth 3) |
| Conversations / Messages | 37 / 219 |
| Notifications | 12 |
| Post images on Cloudinary | 137 (+ 15 avatars); local `/uploads/` references: **0** |
| Test coverage | 814/814 passing (7 suites) |
| Source files over 150 lines | **0** (252 checked) |

Every persona has a real bio, a consistent voice, hashtags, and cross-engagement — comments reply to actual post content, not lorem ipsum.

**Live URLs**
- API: `https://rio-social-platform.onrender.com` (`/health`, `/api/*`)
- Web: `https://rio-social-platform.vercel.app`

---

## 8. Tech Stack (and Why)

| Layer | Choice | Version | Reasoning |
|---|---|---|---|
| Client | **React 19 + Vite** | ^19.2.8 / ^8.3.0 | Fastest DX in the ecosystem; instant HMR, lean production bundle |
| Styling | **Tailwind v4 + CSS variables** | ^4.3.3 | Utility speed with a theme system that flips via two custom properties |
| Animation | **motion + gsap + vendored primitives** | ^14.2.0 / ^3.15.0 | One physics engine for lightbox, carousels, reveals; GSAP for the canvas ticker |
| Icons | **lucide-react** | ^1.55.0 | Consistent, tree-shaken, 150+ icons used across the app |
| Server | **Express 5** | ^5.2.1 | Mature, unopinionated, testable via plain `fetch` |
| Database | **MongoDB + Mongoose 9** | ^9.11.0 | Flexible post schema (images array, category), strong query API |
| Auth | **JWT sessions + CSRF** | jsonwebtoken ^9.0.3 · @node-rs/argon2 (Argon2id) | Short-lived tokens, server-side revocation, modern hashing |
| Uploads | **multer + sharp** | ^2.4.0 / ^0.34 | Memory storage + magic-byte/dimension validation before push |
| Media | **Cloudinary** | ^2.11.0 | Hosted delivery with `f_auto,q_auto`, remote delete API + retry queue, disabled in tests |
| Lint | **oxlint** | ^1.81.0 | Zero-warning lint gate in `npm run lint` |

---

## 9. Roadmap & Known Limitations

**Now (shipped):** carousel-scale content, moderation (reports → admin queue → appeals), Socket.IO messaging (delivery/typing/presence/receipts), notifications, theming, search, Cloudinary media, live feed refresh, full test harness, hardened auth & platform security (server-side sessions + rotation, CSRF, Argon2id, layered rate limits, upload validation, admin audit logging, private-account enforcement), cursor feed + suggestions + bookmarks, post drafts with debounced autosave, 24h stories with tray/viewer/ring, share URLs (og previews), rich composer (drag-reorder + crop + upload progress/retry), media reconciliation.

**Next (30 days):**
- Video upload & playback (formats/size/duration validation, playback UI)
- Push notifications (web push)
- Re-crop published images in PostEdit (7.5 parity with the composer)

**Then (90 days):**
- Structured logging, OpenAPI docs, schema validation (RIO 2.0 §8.2–8.4)
- CI/CD pipeline + perf monitoring + rollback runbook (§8.5, 8.11–8.12)
- ActivityPub export (leave with your data — the differentiator, weaponized)
- Rate-limit dashboards + abuse heuristics (rate limits themselves are per-IP **and** per-account since the P0 hardening)

**Known limitations (honest list)**
- Home feed refresh + navbar/sidebar badges still poll (30–45s) — messaging, typing, presence, and notification pushes are instant via Socket.IO (§17)
- Password-reset email delivery is **inactive in production** until `RESEND_API_KEY` + `RESET_EMAIL_FROM` are configured (dev/test use a local outbox file; responses never contain the token)
- Rate-limit buckets are in-memory (single Render instance) — swap the store seam if scaling out
- No automated E2E/browser tests — verification is CLI-only by design
- Legacy `/uploads` fallback bypasses CDN transforms (moot for production: everything migrated)

---

## 10. Running RIO

```bash
# server
cd server
npm install
node seed.js && node seed-alive.js && node seed-alive-chats.js && node seed-categories.js
node create-admin.js        # admin@rio.app
npm run dev                 # http://localhost:3000

# client
cd client
npm install
echo "VITE_API_URL=http://localhost:3000/api" > .env   # see .env.example
npm run dev                 # http://localhost:5173
```

**Demo logins** (password `pass1234`): 21 personas — see `LOGIN_DETAILS.txt`.
**Admin:** `admin@rio.app` — password comes from `ADMIN_PASSWORD` (never committed; rotate per the runbook in `docs/P0_IMPLEMENTATION_REPORT.md` §4).

**Tests:** `node run_tests.js` from the project root (kills flaky port conflicts, runs all 7 suites).
**Line discipline:** `node test_lines.js` — enforces the 150-line rule across the codebase.

**Production** pushes from `main` to GitHub: Render (Root Directory `server`) redeploys the API, Vercel redeploys the client. Server env vars live in `server/.env` locally and in Render's dashboard; the client needs only `VITE_API_URL`. Full detail in §19.

---

## Bottom Line

RIO is not a landing page with a heart icon. It is a **complete social platform** — content, graph, engagement, messaging, moderation, stories, and motion — built with a level of structural discipline (file-length law, 814 assertions across 7 suites including dedicated security + socket suites, idempotent seeds, transparent moderation) that most production teams never achieve.

**Own the platform. Own the data. Own the roadmap.**

---
---

# PART II — ENGINEERING REFERENCE

## 11. Codebase Map

```
project-1/
├── client/
│   ├── src/
│   │   ├── pages/           # 15 route pages (Home, Profile, Messages, AdminDashboard, ...)
│   │   ├── components/      # 33 top-level + home/ dashboard cards + layout/ shell + story/ (tray, viewer) + vendored motion-primitives/
│   │   ├── context/         # AuthContext + useAuth, ToastContext + useToast
│   │   ├── lib/             # useAutoLoad, useFeed, useFeedRefresh, useUnreadCounts, time.js, network.js/Scene/Render
│   │   ├── services/        # http.js (base/auth/errors), api.js (endpoints), storyApi.js
│   │   ├── styles/          # index.css (theme vars), AmbientNetwork.css, ...
│   │   └── main.jsx / App.jsx
│   ├── .env(.example)       # VITE_API_URL
│   └── vite.config.js       # react + tailwindcss plugins
├── server/
│   ├── config/              # db.js (retrying connect + _test suffix), cloudinary.js, upload.js, categories.js
│   ├── controllers/         # 32 controllers (split for the 150-line rule: post, post-image, comment, comment-action, message, message-read, message-users, feed, suggestion, bookmark, password, account-delete, admin, report, report-admin, appeal, draft, story, session, ...)
│   ├── middleware/          # auth, optionalAuth, csrf, admin, ratelimit, validateImage, cloudinary, error
│   ├── models/              # User, Session, AuditLog, MediaCleanup, Draft, Story, Report, Appeal, Block, Mute, FollowRequest, post, Comment, Conversation, Message, Notification
│   ├── routes/              # 13 route files (comments nested under posts; reports, appeals, drafts, stories, admin API)
│   ├── socket/              # socket.io: auth handshake, index (rooms/fan-out), presence, typing, receipts
│   ├── uploads/             # legacy disk storage (fallback)
│   ├── utils/               # tokens, sessions, password, mailer, audit, media, mediaQueue, visibility, postPreview, cursor, postShape, categories, seedGuard
│   ├── app.js               # express app (testable, no listen; security headers + CSRF mount)
│   ├── server.js            # entry: fail-fast env validation, db connect, listen 0.0.0.0
│   ├── seed.js              # personas + admin + posts + chats (idempotent, prod-guarded)
│   └── migrate-cloudinary.js # one-time legacy image migration
├── docs/                    # P0_SECURITY_AUDIT.md, P0_IMPLEMENTATION_REPORT.md, PHASE1_IMPLEMENTATION_REPORT.md
├── test_lines.js            # 150-line rule checker (root)
├── run_tests.js             # CLI test runner (7 suites, per-suite env)
└── project.md               # this document
```

---

## 12. Data Models

### `User`
| Field | Type | Notes |
|---|---|---|
| username | String | required, unique, 3–30 chars, trimmed |
| name | String | required, ≤50 chars |
| age | Number | required (0–150) |
| email | String | required, unique, lowercase |
| password | String | Argon2id hash (bcrypt legacy dual-verified, upgraded on login) |
| bio | String | default `""`, ≤200 chars |
| avatar, coverImage | String | Cloudinary URLs, default `""` — only settable via `/api/upload/*` |
| role | Enum `user\|admin` | default `user` |
| isSuspended | Boolean | default `false` — blocks login; suspend revokes all sessions |
| followers, following | [ObjectId → User] | |
| bookmarks | [ObjectId → Post] | |
| isPrivate | Boolean | default `false` — enforced server-side (posts + lists hidden from non-followers) |
| resetPasswordToken | String | **SHA-256 hash** of the opaque reset token (single-use) |
| resetPasswordExpires | Date | 1 h window; cleanup is overwrite-on-issue |

Indexes: text on `username` + `name` (people search).

### `Post`
| Field | Type | Notes |
|---|---|---|
| author | ObjectId → User | required |
| content | String | required, ≤5000 chars; hashtags extracted on save |
| images | [String] | up to 8 Cloudinary URLs |
| image | String | legacy single-image field (`null` when text-only) |
| category | String | default `null` |
| likes | [ObjectId → User] | |
| hashtags | [String] | lowercase, extracted from content |
| editedAt | Date | `null` → otherwise "Edited" badge |

Indexes: text on `content` + `hashtags` · `author + createdAt` · `category + createdAt`.

### `Comment`
`author` → User · `post` → Post · `parentComment` → Comment (threading) · `depth` (0–3, schema-capped) · `content` (≤1000) · `likes` [User] · `editedAt` · timestamps. Index on `post + createdAt`.

### `Notification`
`recipient` → User (indexed) · `sender` → User · `type` ∈ `like\|comment\|follow\|reply` · `post` → Post (optional) · `comment` → Comment (optional) · `read` Boolean (default `false`). Index: `recipient + read + createdAt`.

### `Conversation`
`participants` [→ User] · `lastMessage { content, sender, createdAt }` · `unreadCounts` (Map of userId → number). Index: `participants + updatedAt` (inbox sort).

### `Message`
`conversation` → Conversation (indexed) · `sender` → User · `content` (≤2000) · `readBy` [→ User] · timestamps. Index: `conversation + createdAt`.

### `Draft` (post drafts)
`author` → User · `content` (≤5000) · `category` · `visibility` · `images[]` (Cloudinary URLs) · `version` (optimistic concurrency → stale patch = 409) · timestamps. Separate collection — drafts never appear in feeds, profiles, or share URLs.

### `Story` (24h ephemeral)
`author` → User · `media` (Cloudinary URL) · `visibility` · `expiresAt` (server clock +24h; TTL index **and** lazy sweep that also deletes media) · `views` [{user, viewedAt}] (deduped, capped `$slice -500`) · timestamps. Index: `author + expiresAt`.

### `Report` / `Appeal` (moderation)
Report: `reporter` · `targetType` ∈ `post|comment|user` · `target` · `reason` · `details` · `status` ∈ `open|reviewing|resolved|dismissed` · resolution notes + `resolvedBy`. Appeal: `appellant` · `report` (**unique per appellant+report ever**) · `statement` · `status` ∈ `pending|approved|denied` · decision meta — an approved appeal reopens the report to `reviewing`.

### `Block` / `Mute` / `FollowRequest`
Directional `Block` + `Mute` edges (privacy + graph filtering) and `FollowRequest` approvals — only an **approved** follow edge counts as `following` (private accounts, followers-only stories).

---

## 13. API Reference

Base URL (production): `https://rio-social-platform.onrender.com`
All routes below are prefixed with `/api`. Auth = httpOnly JWT cookie (set at login/register).
**Error format (every failure):** `{ "errors": [ "message", ... ] }` with appropriate status — including 401, 403 (CSRF/origin) and 429 (rate limits).
**Mutations:** require a valid `X-CSRF-Token` header (paired with the `csrf_token` cookie) + a trusted `Origin`/`Referer`.

### Auth — `/api/auth`
| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/register` | — | Create account (sets cookie; requires name/age/email/username/password) |
| POST | `/login` | — | Sign in (sets access + refresh + CSRF cookies) |
| GET | `/me` | cookie | Current session |
| POST | `/refresh` | refresh cookie | Rotate refresh token, issue new access token (reuse ⇒ session revoked) |
| POST | `/logout` | cookie | Revoke this session + clear cookies |
| POST | `/logout-all` | cookie | Revoke every session for the user |
| GET | `/profile/:id` | optional | Public profile |
| POST | `/forgot-password` | — | Issue single-use 1 h reset token — **emailed, never in the response** |
| POST | `/reset-password` | — | Consume token, set new password, revoke all sessions |
| POST | `/change-password` | protected | Verify old, set new, revoke all sessions |

### Posts — `/api/posts`
| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/?cursor&page&limit&imageOnly&category` | optional | Feed page, newest first. **Cursor mode** (opaque `nextCursor`, keyset over `createdAt\|_id`) returns `hasMore` + `nextCursor`; `limit` capped at 50; invalid cursor falls back to `page` mode; `imageOnly` accepts `1`/`true` |
| GET | `/search?q&hashtag` | optional | Text regex search **or** exact hashtag match (limit 20) |
| GET | `/trending` | optional | Trending hashtags |
| GET | `/bookmarks` | protected | Saved posts |
| POST | `/` | protected | Text post (extracts hashtags) |
| POST | `/image` | protected | Up to 8 images + text |
| GET | `/:id` | optional | Single post |
| PUT | `/:id` | protected | Edit (owner/admin) |
| DELETE | `/:id` | protected | Delete + full cleanup (owner/admin) |
| POST | `/:id/image` | protected | Append images |
| DELETE | `/:id/image` | protected | Remove image |
| POST | `/:id/like` | protected | Toggle like |
| POST | `/:id/bookmark` | protected | Toggle bookmark |

Comments are nested: `router.use("/:postId/comments", ...)`:

### Comments — `/api/posts/:postId/comments`
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | List thread (depth ≤ 3) |
| POST | `/` | Create (optional `parentComment`) |
| PUT | `/:id` | Edit own |
| DELETE | `/:id` | Delete (cascades children) |
| POST | `/:id/like` | Toggle comment like |

### Users & Follow — `/api/users`
`GET /suggestions?limit&offset` (protected — mutuals + recent, excludes self/following/suspended, `limit ≤ 10`, `offset ≤ 100`, returns `{users, hasMore}`) · `POST /:id/follow` (toggle) · `GET /:id/followers` · `GET /:id/following`

### Profile — `/api/profile`
`GET /search` · `GET /:id` (posts + lists gated for private accounts) · `PUT /` (name/bio/privacy — avatar/cover **only** via `/upload`) · `DELETE /` (staged account deletion, password required in body)

### Notifications — `/api/notifications`
`GET /` · `PATCH /read-all` · `PATCH /:id/read` · `DELETE /:id`

### Messages — `/api/messages`
`GET /` (inbox) · `GET /unread-count` · `GET /new-users` (chat candidates) · `GET /user/:userId` (**find-only**) · `POST /user/:userId` (**create/find conversation**) · `GET /:id/messages` · `POST /:id/messages` · `PATCH /:id/read`

### Drafts — `/api/drafts` (owner-private; non-owner → 404)
`GET /` · `POST /` (multipart ≤8 images) · `GET /:id` · `PATCH /:id` (JSON **or** multipart; stale `version` → 409) · `DELETE /:id` · `POST /:id/publish` (moves files into a new Post — no re-upload)

### Stories — `/api/stories` (auth required; every read filters `expiresAt > now`)
`GET /` (tray: self + following, grouped) · `POST /` (multipart image; +24h from **server clock**) · `GET /user/:userId` · `GET /:id` (non-authors never see `views`) · `POST /:id/view` (deduped) · `DELETE /:id` (author; deletes media)

### Reports & Appeals — `/api/reports`, `/api/appeals`
`POST /reports` (targetType + target + reason + details) · `POST /appeals` (unique per report ever) · `GET /appeals/mine` — admin side in `/api/admin` below

### Uploads — `/api/upload`
`POST /avatar` · `POST /cover` · `DELETE /:field` — all image-validated (magic bytes, ≤8192 px side, ≤40 MP)

### Admin — `/api/admin` (role re-checked per request)
| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/users/:id/suspend` | Suspend account (revokes sessions; login blocked) + audit |
| POST | `/users/:id/restore` | Restore account + audit |
| GET | `/audit` | Paginated audit log (≤100/page) |
| GET | `/reports` · `GET /reports/:id` · `PATCH /reports/:id` | Moderation queue: list (status filter), detail with target context, resolve/dismiss + notes → audit |
| GET | `/appeals` · `PATCH /appeals/:id` | Appeals list + decide (approved → reopens report to `reviewing`; decision → audit) |

### Ops
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | **200** only when Mongo connected, else **503** `{status:"starting"}` (drives `BackendReady`) |
| GET | `/uploads/*` | Legacy static images (fallback) |
| GET | `/posts/:id` | **HTML** share preview on the API origin: og/twitter meta for link scrapers → redirect into the SPA (visibility-gated, content-free 404, `Cache-Control: no-store`) |

---

## 14. Client Structure

### Routes (15 pages)
**Public (4):** `/login` · `/register` · `/forgot-password` · `/reset-password`

**Protected (11, wrapped in `<ProtectedRoute>` — redirects to `/login` when signed out):**
`/` Home · `/search` Explore · `/posts/:id` PostDetail · `/posts/:id/edit` PostEdit · `/profile` own profile · `/profile/edit` EditProfile · `/users/:id` UserProfile · `/messages` Messages · `/notifications` Notifications · `/settings` Settings · `/admin` AdminDashboard (reports queue + appeals + audit)

App shell: `ToastProvider → BrowserRouter → BackendReady → AmbientNetworkBackground + Navbar + PageTransition → Routes`; protected routes nest `ProtectedRoute → AppShell (left rail + <main> + bottom nav) → page`, and every page is `React.lazy` behind a Suspense route fallback (route-level code splitting). Session restored via `AuthContext` / `useAuth()` (`/auth/me`) before protected routes render.

### Key libraries
- `services/http.js` — `API_URL`, `API_ORIGIN`, `MEDIA_URL`, `apiRequest`/`uploadRequest` (JSON error extraction, `credentials: include`, trailing-slash-safe base, auto-appends `/api`); attaches the `X-CSRF-Token` header to every mutation, single-flight refresh on 401 with one retry, and a no-refresh path for auth endpoints; session restore handled by `AuthContext` (failed `/auth/me` simply leaves the user signed out)
- `services/api.js` — one function per endpoint + `mediaUrl()` (Cloudinary `f_auto,q_auto` injection, §16)
- `lib/useAutoLoad.js` — infinite scroll sentinel (IntersectionObserver, 400px margin, success-gated page advance)
- `lib/useFeed.js` — home feed state: cursor paging with `_id` dedupe, pending buffer for the new-posts pill, optimistic likes, retry, memoized `PostCard` render list
- `lib/useFeedRefresh.js` — feed refresh (45s interval + focus/visibility triggers, dedupe by `_id`, overlap + hidden-tab guards, silent error recovery) delivering new posts to a **buffer** (`onFresh`) instead of mutating the list
- `lib/useUnreadCounts.js` — module-shared 30s polling for notification + message badges (single in-flight request, visibility-aware, `resetUnread()` on logout)
- `lib/time.js` — `timeAgo` / `shortTime` relative timestamps (post bylines, inbox previews)
- `components/layout/` — `AppShell` (grid shell + `<Outlet>`), `LeftNav` (sticky rail, badges, user card), `BottomNav` (fixed <768px) + their CSS
- `components/home/` — `CompactComposer`, `NewPostsPill`, `SuggestionsCard`, `MessagesCard`, `TrendingCard` (+ `SideCards`/`Composer`/`FeedChrome` styles)
- `lib/network.js` + `networkScene.js` + `networkRender.js` — background engine (config, physics, drawing)
- `components/BackendReady.jsx` — cold-start gate (3s `/health` retries, 12s timeout per probe, elapsed timer, StrictMode-safe cleanup)
- `lib/usePostUpload.js` + `services/draftApi.js` + `lib/useDrafts.js` — upload progress/retry (XHR, truthful bar, cancel, no-duplicate retry); draft CRUD with debounced autosave, dirty-check, 409 conflict chip, publish-without-reupload
- `components/ImageCropper.jsx` + `MediaPreviewGrid.jsx` + `CreatePostForm.jsx` — crop before upload (cropped bytes ARE the published bytes), drag/keyboard image reorder, `n/8` previews
- `components/story/` + `services/storyApi.js` — `StoryTray` (feed header, own create entry + author rings) and `StoryViewer` (fullscreen, 5s auto-advance, deduped view recording, author delete)

### Quality constraint
**Hard limit: 150 lines per file** — enforced by `node test_lines.js` (currently **252 files, 0 over**). Exception: `client/src/components/motion-primitives/` (vendored, exempt).

---

## 15. Auth & Security

| Concern | Implementation |
|---|---|
| Token transport | 15-min access JWT (`{id, sid}`) in **httpOnly cookie**; `secure; sameSite: "none"` in production (Vercel → Render cross-site), `lax` on localhost; `path=/` |
| Sessions | Server-side `Session` docs (hashed refresh, TTL index) — rotation on `/refresh` with 30 s grace, **reuse detection revokes the session**, logout/change/reset/suspend/delete all revoke |
| CSRF | Session-bound token (`csrf_token` cookie → `X-CSRF-Token` header) + `Origin`/`Referer` allowlist on every mutation; untrusted origin → 403 |
| Passwords | **Argon2id** (OWASP m=19456, t=2, p=1) via `@node-rs/argon2`; bcrypt dual-verified and rehashed on login |
| Password reset | Opaque 32-byte token stored **SHA-256-hashed**, 1 h expiry, single-use, generic responses; delivered via outbox (dev/test) / Resend HTTP API (prod, env-gated) — **never in responses or logs** |
| CORS | Allowlist: localhost:5173 + Vercel prod/preview origins + `CORS_ORIGINS` env (comma-separated); `credentials: true`; runs before `express.json()`; rejections → 403 `{errors:[...]}` |
| Rate limiting | Layered `express-rate-limit` behind `trust proxy 1`: global/IP + login/register/reset/change-password (per IP/email) + per-account follow/like/comment/bookmark/message/upload — every limit overridable via `*_RATE_MAX` env |
| Headers | `Strict-Transport-Security` (prod), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy` baseline |
| Uploads | Post-multer `validateImage`: magic-byte format allowlist, `UPLOAD_MAX_SIDE` 8192, `UPLOAD_MAX_PIXELS` 40 M, round-trip re-encode; extension from detected bytes; 5 MB/8-file caps kept |
| Media deletion | `deleteMedia()` — local unlink / Cloudinary destroy with `MediaCleanup` retry queue; used by avatar swap, post-image removal, post delete, account deletion |
| Secrets | `.env` gitignored; production **exits** on missing/short `JWT_SECRET` or missing `MONGO_URI` (no values printed); seeds guarded by `FORCE_SEED=1`; admin bootstrap reads `ADMIN_EMAIL`/`ADMIN_PASSWORD` |
| Admin | Role re-checked from DB per request; suspend/restore + append-only `AuditLog` (`GET /api/admin/audit`) |
| Account deletion | Password from body only; staged idempotent cleanup (media → comments → posts → notifications → social graph → conversations → sessions → audit → user last) |
| Privacy | `isPrivate` enforced: posts + follower/following lists hidden from non-followers (self/admin exempt) |
| Tests | Separate DB — `db.js` inserts `_test` into the DB **name** (before the query string) so tests never touch production; dedicated `test_security.js` suite (81 assertions) |

---

## 16. Media Pipeline (Operational Detail)

1. **Upload** — `multer` memory storage when Cloudinary is enabled (disk fallback otherwise); max 8 files for posts, 1 for avatar/cover; jpeg/png/gif/webp only, 5MB cap.
2. **Validate** — `validateImage` (after multer, before push): format from **magic bytes** (not the client's MIME header), each side ≤ `UPLOAD_MAX_SIDE` (8192), total ≤ `UPLOAD_MAX_PIXELS` (40 MP) against decompression bombs, round-trip re-encode rejects malformed files; stored extension comes from the detected format.
3. **Push** — `pushToCloudinary(folder)` middleware uploads to folders `rio/posts`, `rio/avatars`, `rio/covers` and sets `f.remoteUrl`; controllers prefer `remoteUrl` over local path.
4. **Delete** — `deleteMedia()` everywhere: remote destroy via the `MediaCleanup` retry queue (backoff, 10 attempts) + local `unlink`; avatar swap order = upload new → save → delete old.
5. **Delivery** — `mediaUrl()` injects **`f_auto,q_auto`** into every Cloudinary URL (auto format: webp/avif; auto quality). Verified ~35% smaller payloads (359KB → 232KB on sample); double-injection guarded.
6. **Migration** — `node migrate-cloudinary.js` (idempotent, `--delete-local` optional) moved **15 avatars + 137 post images**; production now has **0 `/uploads/` references**.
7. **Gate** — Cloudinary disabled during automated tests (`NODE_ENV=test`), so the suite never touches the CDN.
8. **Responsive variants** — `mediaUrl(path, width)` emits standardized Cloudinary transforms (`w_480|960|1600, f_auto, q_auto`); post images ship `srcSet` + `sizes` so phones fetch 480w and desktops 960/1600w. The CDN caches the transforms — zero reprocessing on resize.
9. **Reconciliation** — `node server/reconcile-media.js` cross-references local `uploads/` + remote `rio/*` against **every** DB media reference (Post, User, Draft): dry-run by default (prints `RECONCILE {json}`), `--delete` to execute, `--grace-hours=N` (default 24), `--retry-destroy` requeues exhausted destroy jobs; refuses `--delete` under `NODE_ENV=test`; every deletion writes an `AuditLog` `media.reconcile` entry. Exhausted destroy jobs are kept (not dropped), audited, and requeueable.

---

## 17. Real-Time Layer (Socket.IO)

Messaging, presence, and notification pushes ride **Socket.IO** on the same HTTP server (REST stays fully intact — no separate WS process):

| Feature | Mechanism |
|---|---|
| New messages | `message:new` pushed to `user:<id>` rooms from the REST controllers (`emitToConversation`) |
| Delivery + read receipts | `message:delivered` (client → server) → `message:status` fan-out |
| Typing indicators | `typing:start` / `typing:stop` → `typing:update` per participant |
| Online presence | connection tracking + `presence:get` / `presence:update` (visibility-aware) |
| Notifications | `notification:new` pushed on creation |
| Handshake auth | JWT from the httpOnly cookie (polling transport carries the Cookie; no token in the query string) |

Still polling **by design** — low-churn, visibility-aware loops that don't warrant a socket: home feed refresh (45s + focus), navbar unread badges (30s), sidebar mini-inbox (45s).

Implementation: `server/socket/` (`auth`, `index`, `presence`, `typing`, `receipts`) initialized in `server.js`; suite `server/test_socket.js` (48 assertions: authenticated handshake, REST coexistence, fan-out).

---

## 18. Testing & Quality Gates

All verification is **CLI-only** (no browser automation):

| Command | What it checks | Current status |
|---|---|---|
| `node test_lines.js` | 150-line rule (root, skips node_modules/dist/.git; markdown not counted) | **252 files, 0 over** |
| `npm run lint` (client) | oxlint | **0 warnings** |
| `npm run build` (client) | Production bundle | **✓ built** |
| `node run_tests.js` | 7 suites sequentially — `test_m1.js` (auth, 18), `test_m234.js` (posts/profile/users, 74), `test_m56.js` (messages/notifications, 58), `test_images.js` (images/Cloudinary/drafts/media-safety/image-order/stories, 93), `test_security.js` (security, 81), `test_phase1.js` (cursor feed, suggestions, bookmarks, inbox privacy, drafts, share URLs, media reconcile, 542), `test_socket.js` (socket handshake/presence/typing/receipts, 48) | **7/7 (814 assertions)** |

Conventions: temp scripts named `test_*.js` (gitignored, deleted after use); tests run against `rio-database_test`; kill stray `node` processes before running (Vite port conflicts); never run the build and the suite in parallel (the cleanup step kills node).

---

## 19. Deployment & Environment

### Backend (Render)
- **Root Directory:** `server` · branch `main` · auto-deploy on push from GitHub
- Free tier: cold start 30–60s → mitigated by the `BackendReady` gate + DB-retry loop (connect every 5s, no crash)
- Listens on `0.0.0.0:${PORT}` (PORT injected by platform)
- Startup diagnostics: logs missing env vars + `PORT/NODE_ENV/CLOUDINARY` state

### Frontend (Vercel)
- Builds from `client/`; `.env` / `.env.example` provide `VITE_API_URL`
- Preview branch URL added to the CORS allowlist (must be added when a new preview origin appears)

### Environment variables
**Server** (full, with defaults: `server/.env.example`): `PORT` · `NODE_ENV` · `MONGO_URI` · `JWT_SECRET` (≥32 chars, prod-enforced) · `ACCESS_TOKEN_TTL` · `REFRESH_TOKEN_TTL` · `CORS_ORIGINS` · `CLIENT_ORIGIN` · rate limits (`RATE_LIMIT_MAX`, `AUTH_RATE_MAX`, `REGISTER_RATE_MAX`, `RESET_RATE_MAX`, `CHANGE_PW_RATE_MAX`, `FOLLOW_RATE_MAX`, `LIKE_RATE_MAX`, `COMMENT_RATE_MAX`, `BOOKMARK_RATE_MAX`, `MESSAGE_RATE_MAX`, `UPLOAD_RATE_MAX`) · media (`CLOUDINARY_*`, `UPLOAD_MAX_SIDE`, `UPLOAD_MAX_PIXELS`) · email (`RESEND_API_KEY`, `RESET_EMAIL_FROM`) · admin (`ADMIN_EMAIL`, `ADMIN_PASSWORD`) · `FORCE_SEED`
**Client:** `VITE_API_URL` (full API root, e.g. `https://rio-social-platform.onrender.com/api`)

### Demo & seed access
- Admin: `admin@rio.app` — password supplied via `ADMIN_PASSWORD` env (rotation runbook: `docs/P0_IMPLEMENTATION_REPORT.md` §4)
- Demo users: `<username>@demo.com` / `pass1234` — usernames in gitignored `LOGIN_DETAILS.txt`
- `node seed.js` (+ companion seed scripts) builds 21 personas, 148 posts across four categories, and realistic chat history — all idempotent and refuse to run against production without `FORCE_SEED=1`.

---

*RIO — built from zero. · This document covers the codebase as of Phase 4 (last commit `7d2191b`) · Tests: 7/7 suites (814 assertions) · Files >150 lines: 0 (252 files)*
