# RIO 2.0 — Implementation TODO (living document)

**Brief:** `RIO_2.0_Selected_Improvements_OpenCode_Prompt.md` (58 selected improvements)
**Rules:** commit per work-package → update this file in the same commit → gates must pass (`node test_lines.js` 0 over · `node run_tests.js` 6/6 · client `npm run lint` 0 · `npm run build` ✓).
**Legend:** ✅ already implemented · 🔶 partial · ❌ not implemented · ⏸ deferred (owner decision)

---

## Phase 1 — Feed, UI/UX & Performance

- [x] **4.1 Feed Refresh** — ✅ `lib/useFeed.js` (cursor + `_id` dedupe + pending buffer), `useFeedRefresh.js`, `feed.controller.js` keyset cursor, dual-shape fallback.
- [x] **4.2 Suggestions API** — ✅ `suggestion.controller.js` + `GET /users/suggestions` (excludes self/following, bounded, mutuals signal).
- [x] **4.3 Messages Preview API** — ✅ `GET /messages` bounded conversations + Home `MessagesCard` (empty/loading/error states).
- [x] **4.4 Optimistic Follow** — ✅ shared `lib/useFollowToggle.js` (instant flip, in-flight dedupe per id, rollback + toast, server-response reconcile); wired into `UserProfile` (counts too), `PostAuthor`, `SuggestionsCard`; server `addToSet` idempotency (no duplicate edges); toggle-integrity tests in `test_phase1.js`.
- [x] **4.5 Server-State Optimization** — ✅ decision: **keep custom hooks** (`useFeed`, `useUnreadCounts`, `useFeedRefresh`, `useFollowToggle`) — dedupe/pause/visibility handled per-hook; TanStack Query not justified at current scale (dep constraint #8, no cache-invalidation pain observed). Revisit if request duplication reappears.
- [x] **4.6 MongoDB Feed Indexes** — ✅ `post {createdAt:-1,_id:-1}`, `user {followers:1}`; feed uses sort+hint-able keyset.
- [x] **4.7 Lazy Loading** — ✅ `React.lazy` all routes; `loading="lazy"` in `PostMedia`, `ExploreGrid`.
- [x] **4.8 Frontend Bundle Optimization** — ✅ route-level chunks (build ✓); revisit if any chunk >300 kB.
- [x] **4.9 Loading/Empty/Error States** — ✅ all three side cards skeletonized (shared `.sk-side*` shimmer rows); Messages + Trending now have error+Retry (Trending no longer fails silently); feed/search/profile/notifications/chat empty states verified existing.
- [x] **4.10 Animation Optimization** — ✅ audited: AmbientNetwork pauses ticker **and** kills the signal scheduler on `visibilitychange` (explicit, not just rAF physics); reduced-motion = global CSS kill-switch (`interactions.css`) + 6 JS guards (Home stagger/TextEffect, PostCard heart, PageTransition, feed scroll, ambient static frame); only infinite animations are loading indicators (skeleton shimmer, boot spinner), both frozen under reduced-motion.
- [x] **4.11 Theme Consistency** — ✅ audited: all surfaces/borders/text use `--bg*/--border*/--text*/--accent/--lime` tokens in both `data-theme` themes; hard-coded values limited to intentional patterns (lime fallbacks, white-on-`--danger` badges, white-on-media overlays, boot screen pre-theme, dark-only ambient hidden in light); zero inline colors in JSX; ThemeToggle persists to localStorage.
- [x] **4.12 Mobile Responsive** — ✅ static sweep: viewport meta present; no fixed width ≥360px anywhere; breakpoints at 1379/1279/1023/767/760/720/640; `home-grid` collapses single-column, shell → single-col + fixed BottomNav, messages → 1-col with show-chat toggle, explore/media auto-fill grids; full-height messages accounts for bottom nav. Caveat: visual spot-check at 360/768 recommended before deploy.

## Phase 2 — Real-Time Infrastructure (all ❌ — no socket.io in repo)

- [ ] **5.1 Socket.IO Integration** — ❌ add `socket.io` + `socket.io-client`, event contract, REST retained for history/fallback.
- [ ] **5.2 Authenticated Sockets** — ❌ handshake via existing httpOnly-JWT verification, server-side room authorization.
- [ ] **5.3 Real-Time Messaging** — ❌ persist-then-emit message events, dedupe vs REST.
- [ ] **5.4 Typing Indicators** — ❌ ephemeral, rate-limited, auto-clear.
- [ ] **5.5 Online/Offline Presence** — ❌ in-memory socket-count presence, multi-device correct, no DB writes per heartbeat.
- [ ] **5.6 Message Delivery Status** — 🔶 read receipts exist via REST (`PATCH /:id/read`); gap: sent/delivered states + socket sync.
- [ ] **5.7 Multi-Device Sync** — ❌ broadcast read/message events to all user sockets.
- [ ] **5.8 Real-Time Notifications** — 🔶 polling exists (`useUnreadCounts`); gap: emit-after-persist socket events.
- [ ] **5.9 Reconnection & Duplicate Prevention** — ❌ bounded backoff, re-auth, idempotent events, missed-state fetch.
- [ ] **5.10 Redis Socket Adapter** — ⏸ defer until multi-instance is verified as a real need (brief §5.10 + constraint #9).

## Phase 3 — Social Interactions & Moderation

- [ ] **6.1 Block Users** — ❌ no Block model/enforcement. Plan: `Block` model, enforce in feed/profile/search/follow/messages.
- [ ] **6.2 Mute Users** — ❌ no Mute model/feed filtering.
- [ ] **6.3 Private Accounts** — 🔶 `isPrivate` + `utils/visibility.js` enforce posts & lists; gap: full surface sweep (search/suggestions/media) once follow-requests (6.4) land.
- [ ] **6.4 Follow Requests** — ❌ no pending-request state; `toggleFollow` on private accounts needs audit → plan: `FollowRequest` model, approve/reject/cancel, notify.
- [ ] **6.5 Post Visibility Controls** — ❌ posts have no per-post visibility field (only account-level). Plan: `visibility: public|followers` + feed/URL/media enforcement.
- [ ] **6.6 User Mentions** — ❌ no `@username` parsing/notification.
- [ ] **6.7 Moderation Dashboard** — 🔶 admin has suspend/restore, audit-log view, post removal w/ audit (`admin.routes.js`). Gap: report intake, queue UI, context view, status/pagination.
- [ ] **6.8 Moderation Appeals** — ❌ no appeal model/workflow.
- [ ] **6.9 Pinned Posts** — ❌ no pin metadata/endpoint/profile display.
- [ ] **6.10 Interaction Privacy Controls** — ❌ no comment/mention/message audience settings.

## Phase 4 — Media & Content Creation

- [ ] **7.1 Rich Post Composer** — 🔶 `CreatePostForm` multi-image + category + draft-in-memory. Gap: richer media preview/validation feedback, a11y pass.
- [ ] **7.2 Post Drafts** — ❌ no server draft model/endpoints (client-only category retention).
- [ ] **7.3 Draft Autosave** — ❌ depends on 7.2.
- [ ] **7.4 Image Drag-and-Drop Reordering** — ❌ carousel order = upload order.
- [ ] **7.5 Image Cropping & Editing** — ❌ no crop UI/pipeline.
- [ ] **7.6 Upload Progress & Retry** — ❌ no per-file progress/cancel/retry (XHR/fetch progress needed).
- [ ] **7.7 Public Post Sharing URLs** — 🔶 `/post/:id` route + `optionalAuth` works; gap: link-preview metadata (og tags), graceful deleted-post page.
- [ ] **7.8 Stories** — ❌ no story model/flows/expiry.
- [ ] **7.9 Video Upload & Playback** — ❌ `validateImages` = images only; no video field/validation/playback.
- [ ] **7.10 Media Processing Optimization** — 🔶 `f_auto,q_auto` + `cleanup.js` exist; gap: orphan reconciliation dry-run, retryable cleanup, audit records.

## Phase 7 — Production & Scalability

- [ ] **8.1 Sentry Monitoring** — ⏸ needs owner DSN + privacy review before adding `@sentry/*`.
- [ ] **8.2 Structured Logging** — ❌ raw `console.*`; plan: JSON logger + request IDs + redaction (no new dep needed).
- [ ] **8.3 Swagger/OpenAPI** — ❌ no API docs; plan: static OpenAPI JSON + served page (no heavy dep).
- [ ] **8.4 Zod Validation Standardization** — ❌ manual checks; plan: add `zod`, central schemas for bodies/query/params, consistent 400s.
- [ ] **8.5 GitHub Actions CI/CD** — ❌ no `.github/`; plan: verify-only workflow (lines/tests/lint/build), no deploy triggers.
- [ ] **8.6 k6 Load Testing** — ⏸ needs isolated env decision (owner).
- [ ] **8.7 Automated Database Backups** — ⏸ Neon provider-managed; needs owner verification of plan + retention doc.
- [ ] **8.8 Database Recovery Testing** — ⏸ blocked by 8.7 decision.
- [ ] **8.9 Cloudinary Cleanup Reconciliation** — 🔶 see 7.10; plan: dry-run report script first.
- [ ] **8.10 Accessibility Audit** — 🔶 aria labels/`aria-pressed`/focus work in P0+Phase1; gap: full keyboard/focus/contrast sweep + report.
- [ ] **8.11 Performance Monitoring** — ❌ no metrics; plan: lightweight request timing log + web-vitals hook (no new dep for server side).
- [ ] **8.12 Deployment Rollback Strategy** — ❌ no runbook; plan: docs + migration compatibility notes.
- [ ] **8.13 Redis Caching** — ⏸ only after measured bottleneck (brief §8.13).

## Phase 8 — Data Ownership & Federation

- [ ] **9.1 User Data Export** — ❌ no export endpoint/UI. Plan: `GET /me/export` JSON (profile, posts, comments, likes, follows, conversations) with auth.
- [ ] **9.2 Downloadable Media Archive** — ❌ plan: list owned media URLs + optional zip job (bounded).
- [ ] **9.3 Account Deletion & Retention** — 🔶 `account-delete.controller.js` + `DELETE /profile` exist; gap: retention-policy doc, retryable cleanup, media cascade audit.

---

## Working order (dependency-aware, per brief §10)

1. ~~Repo/security audit~~ (P0 done) + this status audit ✅
2. **Phase 1 gaps:** 4.4 → 4.9 → 4.10 → 4.11 → 4.12 → 4.5(decision doc)
3. **Phase 2 real-time:** 5.1 → 5.2 → 5.3 → 5.4 → 5.5 → 5.6 → 5.7 → 5.8 → 5.9 (5.10 ⏸)
4. **Phase 3 social:** 6.4 → 6.1 → 6.2 → 6.3 sweep → 6.5 → 6.10 → 6.6 → 6.9 → 6.7 → 6.8
5. **Phase 4 media:** 7.1 → 7.6 → 7.4 → 7.2 → 7.3 → 7.7 → 7.10 → 7.5 → 7.8 → 7.9
6. **Phase 7 production:** 8.2 → 8.4 → 8.5 → 8.3 → 8.10 → 8.9 → 8.11 → 8.12 (8.1/8.6/8.7/8.8/8.13 ⏸)
7. **Phase 8 data:** 9.3 → 9.1 → 9.2

## Decisions needed (owner only)

- Sentry DSN + whether to add `@sentry/*` (8.1)
- k6 test environment (8.6); Neon backup plan verification (8.7/8.8)
- Redis: stay deferred until multi-instance/cache need is measured (5.10, 8.13)
- Deploy approval: nothing deploys without explicit go-ahead (P0 runbook items still open: admin password rotation, Resend creds)

## Do not change

- Existing API contracts, auth/CSRF cookie flow, error shape `{errors:[...]}`, 150-line rule, test harness conventions, lime accent token, no prod data writes, no deploy without approval.
