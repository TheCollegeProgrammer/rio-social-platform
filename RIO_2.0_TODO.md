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

- [x] **5.1 Socket.IO Integration** — ✅ `socket.io` + `socket.io-client` installed; `server/socket/index.js` (initSocket, personal rooms, `emitToUser`); `client/src/lib/socket.js` + `SocketContext.jsx` (single shared socket, connect/disconnect by session); `server/config/origins.js` shared by Express + Socket.IO; REST retained for history/fallback.
- [x] **5.2 Authenticated Sockets** — ✅ `server/socket/auth.js` mirrors REST trust chain (`verifyAccess` + `isSessionActive`); `io.use` middleware rejects unauthenticated/garbage/revoked handshakes with `unauthorized`; `server/test_socket.js` covers no-cookie/garbage/authenticated/revoked + REST coexistence + unknown-event resilience (11 checks).
- [x] **5.3 Real-Time Messaging** — ✅ persist-then-emit: `sendMessage` controller emits `message:new` (conversation id + populated message) to every participant's personal room after `save()`; client `useChatSocket` hook appends with `_id` dedupe vs REST; `Messages.jsx` live-updates inbox preview/unread and auto-marks read when the chat is open; REST remains source of truth for history/fallback.
- [x] **5.4 Typing Indicators** — ✅ `server/socket/typing.js`: ephemeral `typing:start/stop` → `typing:update` to participants' rooms; membership re-checked per event (outsiders blocked), 1.5s broadcast rate limit, 5s server-side auto-clear, never persisted; client throttles at 1.2s and shows "…is typing" indicator.
- [x] **5.5 Online/Offline Presence** — ✅ server: in-memory multi-device socket count (done in WP-A) + `presence:get` → `presence:state` reply; client `usePresence` hook (asks on connect, follows `presence:update`) renders lime presence dot on viewed profiles (`Presence.css`). No DB writes per heartbeat.
- [x] **5.6 Message Delivery Status** — ✅ precise transitions sent → delivered → read; `Message.deliveredTo` persisted only via recipient's `message:delivered` ack (server emit never counts as proof); read = existing authorized `PATCH /:id/read` which now also implies delivered; `message:status` syncs across devices; `matchedCount` guard (timestamps make `modifiedCount` useless) skips duplicate ack broadcasts; UI ticks in bubbles (`messageStatus.js`: Sent/Delivered/Read).
- [x] **5.7 Multi-Device Sync** — ✅ all emits target personal rooms (every device); `message:status` read event zeroes the reader's other-device inbox badges (`useInboxSync`) and flips sender ticks; stable `_id`s everywhere; reconnect refetch via REST (`useChatSocket` re-syncs open conversation, `useInboxSync` refetches inbox); idempotent handlers (dedupe by `_id`, no wrong-origin echoes).
- [x] **5.8 Real-Time Notifications** — ✅ `createNotification` emits `notification:new` (populated to REST list shape) only after `Notification.create` succeeds, to the recipient's room; self-notifications still blocked; client: `useNotificationSync` refetches list on push, `useUnreadCounts` polls badges on `notification:new`.
- [x] **5.9 Reconnection & Duplicate Prevention** — ✅ bounded backoff (1s → 8s) in `lib/socket.js`; reconnect re-runs the full JWT+session handshake; duplicate prevention by stable `_id` (messages/notifications) + `matchedCount` receipt guard + idempotent status application; missed state fetched on `connect` (open conversation, inbox, notification list, unread badges).
- [ ] **5.10 Redis Socket Adapter** — ⏸ defer until multi-instance is verified as a real need (brief §5.10 + constraint #9).

## Phase 3 — Social Interactions & Moderation

- [x] **6.1 Block Users** — ✅ `Block` model (unique pair); `POST/DELETE /users/:id/block`; block severs mutual follows + purges follow requests; enforced across follow, profile (asymmetric: blocker still sees blocked to unblock), follower lists, feed (query-level `$nin`), post view/like/comment, messaging (history readable, sends blocked, typing muted), people/content search, suggestions, bookmarks, notifications (`createNotification` guard); UI Block/Unblock on profile (`useProfileBlock`).
- [x] **6.2 Mute Users** — ✅ `Mute` model (unique pair); `POST/DELETE /users/:id/mute` (soft, idempotent, keeps follows + interactions); feed excludes muter's muted authors at query level (with blocks); `createNotification` drops notifications from muted senders; profile exposes `mutedByYou`; Mute/Unmute button on profile (`useProfileMute`); all `createNotification` call sites now awaited (persistence before response fixes notification-read races).
- [x] **6.3 Private Accounts** — ✅ surface sweep complete: shared `canViewPost` gate (private + block → 404) on comments read/create, comment likes, post likes, bookmarks; trending hashtags exclude private authors' tags (viewer-independent, cache-safe); new-chat picker excludes blocked; search already filters (6.1) and shows private profiles intentionally with `isPrivate`; media direct URLs are CDN-bearer by design (resource URLs like posts/profiles are enforced); anonymous viewers see only public content via `optionalAuth` + `buildPostVisibility`.
- [x] **6.4 Follow Requests** — ✅ `FollowRequest` model (unique requester+target, pending/approved/rejected); private `POST /:id/follow` becomes a request toggle (create/cancel, duplicate-safe via unique index + 11000 catch); `GET /follow-requests` (+`/sent`), atomic approve/reject by target only; approved converts to follow edges (`addToSet`) + `follow_request`/`follow_approved`/`follow_rejected` notifications; profile exposes `followRequested` for the "Requested" button (`useProfileFollow`); pending-request section with Approve/Reject on Notifications page (`FollowRequests`).
- [x] **6.5 Post Visibility Controls** — ✅ `Post.visibility: public|followers` (default public); enforced via `buildPostVisibility.hidden()` on feed/profile/direct URL/search/bookmarks + `canViewPost` gates (comments/likes/bookmarks/comment-likes); unfollow revokes access dynamically; `parseVisibility` validates writes (create/image-create/edit); composer + PostEdit toggle (`VisibilityToggle`), PostCard pill badge; enriched feed/search/detail responses include `visibility`. Media URLs stay CDN-bearer (same accepted scope as 6.3).
- [x] **6.6 User Mentions** — ✅ `utils/mentions.js` (`extractMentionNames`/`resolveMentions` case-insensitive, unknown names drop) stores resolved ids on `Post.mentions` + `Comment.mentions`; `mention` notifications on create/edit (post & comment) with dedup inside `createNotification` (edits/retries cannot double-notify), gated by `mentionAudience` + block/mute rules; payloads populated in feed/detail/profile/search/bookmarks/comments; `MentionText` renders resolved `@name` as clickable profile links (spans — no nested anchors); notification icon/text (`AtSign`). No @-autocomplete (accepted scope — links + notifications meet the brief).
- [x] **6.7 Moderation Dashboard** — ✅ `Report` model (reporter/targetType/targetId/reason/status/resolution/handledBy+At, dedup indexes); `POST /api/reports` intake (post/comment/user targets, canViewPost-gated, self-report 400, duplicate open 409, CastError 400) + admin queue `GET /api/admin/reports` (status/type filters validated, pagination, reporter populated) + detail w/ privacy-safe context (no email/password) + `PATCH` (status/resolution, `report.update` audit); client: `moderationApi.js` + `useReport` prompt flow (Report buttons on PostDetail/CommentItem/UserProfile), `AdminDashboard` (`/admin`, status filter tabs, paginated rows) + `AdminReportDetail` (context panel, status/resolution save, suspend/restore), Settings → admin link (role-gated route).
- [x] **6.8 Moderation Appeals** — ✅ `Appeal` model (appellant+report unique pair, status pending/approved/denied, decisionNote/decidedBy/decidedAt, indexes); subject-only intake `POST /api/appeals` (resolved decisions only, affected user enforced via report context, duplicate 409, cast 400); `GET /api/appeals/mine` status view; admin `GET /api/admin/appeals` (status filter + pagination) + `PATCH` decide (admin-only; approved reopens report → `reviewing`, denied keeps it; `appeal.decide` audit); notifications: resolving a report notifies the affected subject (`moderation`, carries `report` ref — **system types bypass block/mute**, 5.8 socket includes report), decide notifies appellant (`appeal_approved`/`appeal_denied`); client: Appeal button on moderation notices (prompt form, hidden once appealed), `AppealStatus` section on Notifications, `AdminAppealsList` tab in dashboard. Accepted scope: appeals target resolved report decisions (suspended users cannot authenticate to file; suspension is pre-auth block). History retained on the appeal record.
- [x] **6.9 Pinned Posts** — ✅ `Post.pinnedAt` (date orders pins); `POST /api/posts/:id/pin` toggle (owner-only, limit 3 via `pin.controller.js`); profile sorts `pinnedAt desc, createdAt desc` (nulls last) with the same visibility filters (followers-only/private/deleted pinned posts never leak); PostCard "Pinned" badge (feed/profile/search payloads carry `pinnedAt`); Pin/Unpin button in PostDetail owner actions.
- [x] **6.10 Interaction Privacy Controls** — ✅ `User.{comment,mention,message}Audience: everyone|followers` (default everyone); shared policy `utils/interactionPolicy.js` (`audienceError` + `parseAudiences`); enforced on comment create, DM open + send (403 with clear message, blocks still first, self always allowed, history stays readable); `PUT /api/profile/privacy` endpoint; Settings → Privacy section (`PrivacySettings.jsx`); `mentionAudience` enforcement lands with 6.6 mention creation.

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
