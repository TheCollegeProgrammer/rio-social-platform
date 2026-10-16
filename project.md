# RIO — The Social Platform You Own

> **A full-stack social network, built from zero. No page builders, no templates, no shortcuts.**

RIO is a complete, production-shaped social media platform: users, posts, carousels, feeds, follows, threaded comments, bookmarks, notifications, real-time-ish messaging, media pipelines, theme system, and **built-in admin moderation** — all running on a clean Node/Express + MongoDB + React architecture that one engineer can understand, extend, and deploy.

---

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

---

## 2. What RIO Ships Today (Feature Breakdown)

### Identity & Access
- **Register / Login / Logout** — JWT issued as an **httpOnly cookie** (not localStorage — immune to XSS token theft)
- **Forgot / Reset password** flow with secure token links
- **Change password** with old-password verification
- **Account deletion** (password-confirmed)
- **bcrypt** hashing (cost 10), per-user salt
- **Admin role** — a privileged account with moderation powers (see §5)

### Posts & Content
- **Text posts** with automatic **hashtag extraction** (`#discipline` → indexed, searchable, clickable)
- **Multi-image posts — up to 8 images per post**, served as a **swipeable carousel** with slide counter, arrows, and dot indicators
- **Click-to-zoom lightbox** on every image — spring-animated expand/shrink, keyboard navigation (←/→/Esc), works for single images and carousel slides alike
- **Post editing** with "Edited" badge
- **Post deletion** (owner — or admin) with full cleanup: comments, bookmarks references, and **image files off disk**
- **Category tagging** on posts (`motivation`, `billionaire-mindset`, `f1`, `motorsport`) — one schema field, queryable, ready for any taxonomy

### Feed & Discovery
- **Home feed** — newest-first, paginated ("Load more"), with **staggered scroll-reveal animations**
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
- **Comments** — **threaded up to 3 levels deep** (comment → reply → nested reply), with depth enforcement at the API
- **Comment likes**, comment editing, comment deletion (cascades to children)
- **Bookmarks** — private save, dedicated bookmarks view, bookmark search

### Notifications
- Generated for **likes, comments, and follows**
- **Unread badge** in the navbar (polling-based, updates as you browse)
- Mark-one / mark-all read, delete individual notifications
- **Never notifies yourself** for your own actions

### Messaging
- **1:1 conversations** — auto-created or reused on first message
- **"New" conversation button** — opens a picker of people you **don't already chat with** (existing conversation partners are excluded server-side), with debounced name/username search, avatar rows, and one-click start
- **Threaded message list** with real conversation previews
- **Navbar badge counts PEOPLE, not messages** — distinct users with unread messages (3 unread from 1 person shows `1`)
- **Unread counts** per conversation + **mark-as-read** with server-side unread tracking both directions
- **Conversation seeding** — every demo user ships with realistic, on-persona chat history

### Experience Layer
- **Light / dark theme** — CSS-variable driven, persisted to localStorage, with an **anti-flash script** in `<head>` (no white blink on load)
- **RIO branding** — theme-aware logo marks across navbar and all auth screens
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
| Who owns the data | **You** (your DB, your S3/disk) | The platform |
| Feed ranking | **Chronological. Always.** | Engagement-optimized black box |
| Moderation | **Transparent, role-based, auditable** | Opaque, automated, appeal-less |
| Ads / tracking | **Zero** | The business model |
| Codebase | **~120 small files, one engineer can hold it** | Millions of LOC |
| Deploy cost | A $5 VPS + a database | — |

### vs. "build your own" alternatives
- **vs. Discord communities** — RIO is a *content* network (posts, feeds, discovery), not chat rooms bolted onto voice
- **vs. WordPress + social plugin** — those are bolted-on bolt-ons; RIO's likes/comments/follows are *first-class schema citizens* with indexes, pagination, and real tests
- **vs. Mastodon/ActivityPub** — RIO is deliberately single-instance and simple; federation is a roadmap item, not a prerequisite tax

### The honest technical differentiators
1. **Multi-image carousels done right** — 8 images per post, append/remove individual slides after publish, per-file cleanup on delete, drag physics, zoom lightbox. Most tutorial-grade clones ship single-image only.
2. **Admin moderation built in from commit zero** — role field, server-side `canModerate()` check (DB-verified, not trust-the-JWT), and UI that surfaces edit/delete to admins on *every* post. Most portfolios add this never.
3. **Real engagement seed data** — 21 personas, 158 posts, 766 comments, 32 conversations, 214 messages of on-voice content. The demo doesn't look like `test test test` — it looks *alive*, which is what an investor actually needs to see.
4. **Motion system, not motion theater** — every animation is spring-based (`motion` library), performant, and mounted only where it improves comprehension (zoom, stagger, progress), not sprinkled for showreels.
5. **Engineering discipline as a feature** — see §6.

---

## 4. How It Works (Architecture)

```
┌─────────────────────────────┐
│  React 19 + Vite SPA        │  Tailwind v4 · motion · lucide icons
│  (client/)                  │  Code-split by route
└──────────────┬──────────────┘
               │ fetch  ·  credentials: "include"  ·  JSON / FormData
               ▼
┌─────────────────────────────┐
│  Express 5 API  (server/)   │  CORS (strict origin) · cookie-parser
│                             │  Rate limiter (env-aware) · security headers
├─────────────────────────────┤
│  Routes → Controllers       │  Thin, single-responsibility, ≤150 lines each
│  → Models (Mongoose 9)      │  Compound indexes on every hot query path
└──────┬──────────────┬───────┘
       │              │
       ▼              ▼
  MongoDB 7+      Local disk uploads/
  (users, posts,  (avatars, covers, post
   comments,       images — path-absolute,
   conversations,  swappable for S3 later)
   messages,
   notifications)
```

### The request lifecycle (example: liking a post)
1. Client sends `POST /api/posts/:id/like` — JWT rides in an **httpOnly cookie**, never in JS-accessible storage
2. Express: CORS gate → **rate limiter** (per-IP sliding window) → security headers → `protect` middleware verifies JWT → `req.user` populated
3. Controller loads the post, checks the caller's like set, `$addToSet`/`$pull`s atomically
4. If the like is new, a **notification document** is created for the post's author (self-actions skipped)
5. Response: `{ liked, likesCount }` — client updates the heart optimistically

### The media pipeline
- Uploads validated at the multer layer: **jpeg/png/gif/webp only, 5MB cap, max 8 files**
- Failed validations **delete the just-written files** (no orphan disk garbage)
- Posts reference images as array `images[]` with `image` mirrored to `images[0]` for backward compatibility
- Deletes walk the entire cleanup path: DB refs → bookmark references → **actual files on disk**
- Search enrichment returns `images` arrays so every surface (feed, detail, bookmarks, search) renders carousels uniformly

### Auth security model
- httpOnly + sameSite cookie (auto CSRF-resistant posture for cross-origin dev)
- Passwords never leave the server in any response (`-password` select everywhere, verified by dedicated tests)
- Admin powers are **re-checked against the database at authorization time** — demote an admin and their old token loses power on the next request
- Rate limiting: 2000 req/15min dev · 500 prod · 10000 test (overridable via env)

---

## 5. Admin & Moderation (The Operator's Console)

Any account with `role: "admin"` (created via `node create-admin.js`):

- Sees **Edit + Delete on every post in the feed** and on every post detail page
- Can edit another user's content (marked Edited — no stealth rewriting)
- Can delete another user's post — with the **same full cleanup path** as a owner delete (comments, bookmarks, image files)
- Cannot be spoofed from the client: the role claim is verified server-side on every moderated action

This is the difference between a *demo* and a *platform someone can actually operate*.

---

## 6. Engineering Rigor (Why This Survives Contact With Reality)

| Discipline | Implementation |
|---|---|
| **150-line hard rule** | Every owned source file (JS/JSX/CSS) is capped at 150 lines, enforced by an automated checker across client + server. No god-components, no 800-line "utils". |
| **Test suite** | 181 CLI-driven HTTP tests across 4 suites — auth (18), profile/posts/bookmarks/follows/comments (74), notifications/messaging/uploads (58), image lifecycle (31). Zero browser automation flakiness; pure `fetch` against a live server. |
| **Idempotent seeding** | Every seed script is re-runnable: content-prefix guards, per-pair chat dedup, deterministic PRNG. Run it twice → +0 duplicates, guaranteed. |
| **DB isolation** | Tests target a separate `social_media_app_test` database with an elevated rate limit — your dev data is never touched. |
| **Error contract** | Every endpoint returns `{ errors: [...] }` on failure. One shape. Predictable client handling. |
| **Index-backed queries** | Compound indexes on `category+createdAt`, `author+createdAt`, `post+createdAt`, hashtag arrays — feeds and comments stay O(log n) as data grows. |
| **Lint-clean** | oxlint, 0 warnings, including rules on the vendor boundary (motion-primitives excluded explicitly, documented). |

---

## 7. The Numbers (Current Demo Instance)

| Metric | Count |
|---|---|
| Seeded users | 22 (21 personas + 1 admin) |
| Posts | 158 (incl. 20 category posts with multi-image carousels) |
| Comments | 766 (threaded to depth 3) |
| Conversations | 32 (every user has 2–4 threads) |
| Messages | 214 |
| Notifications | Generated live from real engagement |
| Test coverage | 181/181 passing |
| Source files over 150 lines | **0** |

Every persona has a real bio, a consistent voice, hashtags, and cross-engagement — comments reply to actual post content, not lorem ipsum.

---

## 8. Tech Stack (and Why)

| Layer | Choice | Reasoning |
|---|---|---|
| Client | **React 19 + Vite** | Fastest DX in the ecosystem; route-level lazy loading built in |
| Styling | **Tailwind v4 + CSS variables** | Utility speed with a theme system that flips via two custom properties |
| Animation | **motion + vendored primitives** | One physics engine for lightbox, carousels, reveals, hovers |
| Icons | **lucide-react** | Consistent, tree-shaken, 150+ icons used across the app |
| Server | **Express 5** | Mature, unopinionated, testable via plain `fetch` |
| Database | **MongoDB + Mongoose 9** | Flexible post schema (images array, category), strong query API |
| Auth | **JWT in httpOnly cookies** | XSS-resilient session model |
| Uploads | **multer (disk)** | Dead simple now; swap the storage adapter for S3/GCS in one file |

---

## 9. Roadmap (The Investor Slide)

**Now:** carousel-scale content, moderation, messaging, notifications, theming, search, full test harness.

**Next (30 days):**
- Image resizing pipeline (thumbnails + originals)
- Push notifications (web push)
- Rich post composer (image reordering, drafts)

**Then (90 days):**
- WebSocket messaging (replace polling) — the socket layer is already isolated
- Role-based report/review queue (user reports → admin dashboard)
- Rate-limit dashboards + abuse heuristics
- ActivityPub export (leave with your data — the differentiator, weaponized)

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
npm run dev                 # http://localhost:5173
```

**Demo logins** (password `pass1234`): 21 personas — see `LOGIN_DETAILS.txt`.
**Admin:** `admin@rio.app` / `RioAdmin#2026`

**Tests:** `node run_tests.js` from the project root (kills flaky port conflicts, runs all 4 suites).
**Line discipline:** `node test_lines.js` — enforces the 150-line rule across the codebase.

---

## Bottom Line

RIO is not a landing page with a heart icon. It is a **complete social platform** — content, graph, engagement, messaging, moderation, and motion — built with a level of structural discipline (file-length law, 181 tests, idempotent seeds, transparent moderation) that most production teams never achieve.

**Own the platform. Own the data. Own the roadmap.**

*RIO — built from zero.*
