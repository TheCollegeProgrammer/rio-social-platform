# RIO — P0 Security Audit

**Scope:** Full server codebase, auth middleware & JWT handling, cookie/CORS configuration, all state-changing endpoints, password reset & change flows, Multer/Cloudinary pipeline, admin authorization, account deletion, environment/startup configuration, existing tests.
**Method:** Source-level review of every route/controller/middleware/model + repository & git-history inspection. No code was modified during this phase.
**Basis:** Codebase as of commit `2d3fc62` (plus uncommitted `project.md` restructure).

---

## Summary of Findings

| ID | Finding | Severity | P0 Item | Primary files |
|---|---|---|---|---|
| F-01 | Password-reset JWT is usable as a session token (token confusion) | **Critical** | P0-03 | `password.controller.js`, `auth.middleware.js` |
| F-02 | Reset token returned in API response (demo mode = live account takeover) | **Critical** | P0-03 | `password.controller.js` |
| F-03 | Reset tokens not single-use, not stored, never invalidated | **High** | P0-03 | `password.controller.js`, `models/User.js` |
| F-04 | No CSRF protection on cookie-authenticated mutations | **High** | P0-01 | `app.js`, all state-changing routes |
| F-05 | No refresh tokens, no server-side sessions, no revocation | **High** | P0-02 | `auth.controller.js`, `auth.middleware.js` |
| F-06 | bcrypt-only hashing (cost 10), no algorithm agility / upgrade path | **High** | P0-04 | `auth/password/profile/create-admin controllers` |
| F-07 | Uploads trust client MIME; no magic-byte, dimension or pixel validation | **High** | P0-05 | `config/upload.js`, `cloudinary.middleware.js` |
| F-08 | Orphaned media: post-delete never touches Cloudinary; failure paths leak files | **High** | P0-05/08 | `post-action.controller.js`, `cloudinary.js`, `profile.controller.js` |
| F-09 | Account deletion partial, non-idempotent, non-transactional; password accepted in query string | **High** | P0-08 | `profile.controller.js` |
| F-10 | Rate limiting is IP-only, broken behind Render proxy, no per-account/auth limits | **High** | P0-06 | `app.js` |
| F-11 | Unescaped user regex in search (ReDoS / regex injection) | **Medium** | P0-09 | `bookmark.controller.js` |
| F-12 | GET endpoint creates resources (`GET /messages/user/:userId`) | **Medium** | P0-01/09 | `message.controller.js` |
| F-13 | `isPrivate` never enforced server-side (cosmetic privacy) | **Medium** | P0-09 | `profile.controller.js`, `post.controller.js` |
| F-14 | Arbitrary URL accepted as `avatar`/`cover` via `updateProfile` (bypasses validation; enables cross-account media destruction) | **High** | P0-05/09 | `profile.controller.js`, `upload.controller.js` |
| F-15 | No admin audit logging; no suspension mechanism | **Medium** | P0-07 | (absent) `post-action.controller.js` |
| F-16 | Live admin credential hardcoded in repo, docs and git history | **High** | P0-10 | `create-admin.js`, `project.md`, history |
| F-17 | Missing security headers (CSP, HSTS, Referrer-Policy); cookie hardening gaps | **Medium** | P0-01/02 | `app.js`, `auth.controller.js` |
| F-18 | No purpose-specific limits on login/register/reset; register enumerates emails | **Medium** | P0-06/03 | `auth.controller.js`, `password.controller.js` |
| F-19 | Production startup only *warns* on missing/weak secrets (fail-open) | **Medium** | P0-10 | `server.js` |
| F-20 | `401` responses use `{message}` instead of the `{errors:[...]}` contract | **Low** | P0-02 | `auth.middleware.js`, `optionalAuth.middleware.js` |
| F-21 | JWT verify does not pin algorithm; no issuer/audience; cookies lack `path`/`maxAge` | **Low** | P0-01/02 | `auth.middleware.js`, `auth.controller.js` |
| F-22 | CORS rejection surfaces as 500; unhandled errors logged raw | **Low** | P0-10 | `app.js`, `error.middleware.js` |
| F-23 | Seeded demo accounts + `pass1234` live on production DB; seed scripts can target prod | **Medium** | P0-10 | `seed*.js`, tracked in git |
| F-24 | No test coverage for any new security property (CSRF, sessions, reset, signatures, IDOR beyond basics) | **Medium** | Phase 3 | `test_*.js` |

**Totals: 2 Critical · 9 High · 9 Medium · 4 Low.**
**Positive controls already present (verified):** all mutating routes require `protect`; notifications/messages/bookmarks are recipient/owner-scoped; `canModerate()` re-checks admin role in DB; `path.basename()` prevents static-path traversal; `.env` never committed and git history contains **no** Mongo URIs or JWT secrets; startup logs never print secret values; test DB isolation via `_test` suffix; uniform `{errors:[...]}` on most endpoints; 401 ownership checks exist for posts/comments/conversations.

---

## Resolution Status (post-implementation — Phase 5)

All findings fixed except where noted. Evidence: `docs/P0_IMPLEMENTATION_REPORT.md`; suite **260/260 (5/5)** incl. dedicated security suite (79 assertions, sections C1–C23).

| ID | Status | Verified by |
|---|---|---|
| F-01 | ✅ Fixed — opaque sha256-hashed reset tokens, no shared JWT path | C12–C13 |
| F-02 | ✅ Fixed — token never in response/log (outbox dev, Resend prod) | C12 |
| F-03 | ✅ Fixed — single-use, 1 h expiry, overwrite invalidation, session revoke | C12–C13 |
| F-04 | ✅ Fixed — session-bound CSRF token + Origin allowlist on all mutations | C3–C7 |
| F-05 | ✅ Fixed — 15 m access JWT + hashed refresh, rotation, reuse detection, revocation | C8–C11 |
| F-06 | ✅ Fixed — Argon2id (OWASP params) + dual-verify + rehash-on-login | C14 |
| F-07 | ✅ Fixed — magic bytes, `UPLOAD_MAX_SIDE`/`UPLOAD_MAX_PIXELS`, round-trip | C15 |
| F-08 | ✅ Fixed — `deleteMedia()` everywhere + retry queue (live CDN destroy untestable: CDN disabled in tests; local path covered) | code review + C21 |
| F-09 | ✅ Fixed — staged idempotent deletion, password body-only, session revoke | C21 |
| F-10 | ✅ Fixed — `trust proxy 1` + layered env-tunable limiters with 429 contract | C16 |
| F-11 | ✅ Fixed — `escapeRegex` + length cap on all user-input regexes | code review |
| F-12 | ✅ Fixed — GET find-only, POST creates (client + tests updated) | C20 |
| F-13 | ✅ Fixed — approved policy: private posts + follower/following lists gated | C23 |
| F-14 | ✅ Fixed — avatar/cover not updatable via profile PUT (upload endpoints only) | C23 |
| F-15 | ✅ Fixed — AuditLog + suspend/restore + admin-only read path | C17–C18 |
| F-16 | ⚠️ Code/doc fixed (env-driven, placeholders only) — **live password rotation pending your approval** (runbook in implementation report §4) | C22 env checks |
| F-17 | ✅ Fixed — Referrer-Policy, Permissions-Policy, HSTS (prod), cookie path/maxAge | C2 |
| F-18 | ✅ Fixed — per-purpose limiters (login/register/reset/change-pw) | C16 |
| F-19 | ✅ Fixed — production exits on missing/short secrets | C22 |
| F-20 | ✅ Fixed — 401s carry `errors[]` + `message` | C1 |
| F-21 | ✅ Fixed — `algorithms:["HS256"]` pinned, cookie `path`/`maxAge` | C8–C11 |
| F-22 | ✅ Fixed — CORS rejection → 403 `{errors:[...]}` | C6 |
| F-23 | ✅ Fixed — `FORCE_SEED=1` gate + create-admin env guard (demo DB data left untouched per scope) | seed guard code |
| F-24 | ✅ Done — 79-assertion security suite (C1–C23) wired into `run_tests.js` | `node run_tests.js` |

**Residual (accepted):** register `409` email enumeration tradeoff; in-memory rate-limit store (single-instance; seam documented); production reset delivery inactive until `RESEND_API_KEY`/`RESET_EMAIL_FROM` are set; demo seed data intentionally remains on the production DB.

---

## Detailed Findings

### P0-01 — CSRF Protection

**F-04 · No CSRF token, no origin validation on state-changing routes · High**
- **Vulnerability:** Every POST/PUT/PATCH/DELETE trusts the `token` httpOnly cookie alone. In production the cookie is `SameSite=None; Secure` (required for Vercel→Render cross-site), i.e. deliberately sent cross-site. CORS blocks *reading* responses but not *sending* them.
- **Affected files:** `server/app.js` (no csrf middleware), `server/routes/*.js` (all 40+ mutations), `client/src/services/http.js` (no token header).
- **Exploitation:** Attacker page auto-submits `POST https://rio-social-platform.onrender.com/api/posts/:id/like`, `/api/profile` (change bio/username), `/api/auth/change-password`-adjacent flows, or a `multipart/form-data` upload to `/api/upload/avatar` — the browser attaches the victim's cookie. SameSite=None makes this work from any origin. Note: JSON bodies require a CORS preflight (blocked), but `FormData`/form-encoded POSTs are "simple requests" with **no preflight**.
- **Recommended fix:** CSRF middleware for mutating methods: (a) validate `Origin`/`Referer` against the same allowlist as CORS (reject untrusted with 403 `{errors:[...]}`); (b) require a per-session CSRF token (issued at login/refresh, non-httpOnly cookie + `X-CSRF-Token` header, constant-time compare). Do not rely on SameSite or CORS alone.
- **Dependencies:** Best implemented together with P0-02 so the token binds to the server-side session id.

**F-12 · GET endpoint mutates state · Medium**
- **Vulnerability:** `GET /api/messages/user/:userId` creates a Conversation document (`findOrCreateConversation`).
- **Affected files:** `server/controllers/message.controller.js:32-48`, `server/routes/message.routes.js`, `client/src/services/api.js`.
- **Exploitation:** Prefetchers/crawlers/spam links create orphan conversations for any pair of user ids; GETs cannot carry CSRF tokens, so state-changing GETs are unprotectable by design.
- **Recommended fix:** Move creation to `POST /api/messages/user/:userId` (or a `POST /api/conversations`), leave GET as find-only. Client change required; update tests.
- **Dependencies:** API contract change (documented in report), client edit.

**F-21 · Cookie/JWT hardening gaps · Low**
- **Affected files:** `auth.middleware.js:13` (`jwt.verify` without `algorithms`), `auth.controller.js:10-14` (no `path`, no `maxAge`).
- **Fix:** Pin `algorithms:["HS256"]`, set `path:"/"`, align cookie lifetimes with session design.
- **Dependencies:** P0-02.

**Must also hold:** GET/HEAD routes audited — only F-12 mutates; all others read-only. ✔ to be re-verified post-fix.

---

### P0-02 — Session Management

**F-05 · No refresh tokens, no server-side sessions, no revocation · High**
- **Vulnerability:** Auth = one 1-hour JWT in a cookie, verified statelessly. There is no server-side record of sessions. Consequences:
  - `logout` only clears the browser cookie — the token stays valid for up to 1h anywhere.
  - Password change/reset does **not** invalidate existing tokens (stolen pre-reset token keeps working).
  - Account deletion does **not** revoke tokens — a deleted user's cookie still authenticates mutating requests (ghost likes/comments from a nonexistent author).
  - No logout-all, no per-session listing, no concurrent-refresh safety (nothing to conflict yet).
- **Affected files:** `server/controllers/auth.controller.js` (generateToken/setAuthCookie/logout), `server/middleware/auth.middleware.js`, `server/middleware/optionalAuth.middleware.js`, `server/models/` (no Session model).
- **Exploitation:** XSS-adjacent or stolen-cookie scenarios cannot be remediated by the victim; a "changed password" does not end an attacker's session.
- **Recommended fix (deliberately simple, no Redis):**
  1. Short-lived **access JWT** (~15 min) carrying `{ id, sid }` where `sid` is the server session id.
  2. **Session model** in Mongo: `{ _id(sid), userId, refreshHash, userAgent?, createdAt, lastSeenAt, expiresAt (TTL index), revokedAt }`. Refresh token = 32-byte `crypto.randomBytes`, stored **only as SHA-256 hash**.
  3. Refresh cookie (`httpOnly, secure, sameSite`) → `POST /api/auth/refresh`: verify hash → **rotate** (new refresh token, update hash atomically with a single `findOneAndUpdate` guarded on the old hash) → issue new access token. If presented refresh hash does not match stored → **reuse detected → revoke session + all sessions for user**.
  4. `protect` verifies access JWT **and** session not revoked (lightweight existence check; cheap indexed lookup or short in-memory cache).
  5. `POST /api/auth/logout` (current session) and `POST /api/auth/logout-all` (revoke all user sessions). Password change/reset and account deletion revoke sessions via helper.
  6. TTL index cleans expired sessions.
  7. Secrets stay in env (already true).
- **Dependencies:** Foundation for F-01 (CSRF binding), F-03 (reset revocation), F-09 (deletion revocation), F-15 (suspend → revoke). Client must handle silent refresh on 401 (extend `http.js`).
- **Constraint note:** Login/`/me` response shapes (`{user}`) asserted by existing tests must be preserved; cookie name `token` kept for access token to limit churn (refresh in a second cookie `refresh_token`).

---

### P0-03 — Password Reset Security

**F-01 · Reset token doubles as a session token · Critical**
- **Vulnerability:** Reset tokens are JWTs signed with the **same `JWT_SECRET`** containing `{ id, purpose }`. `protect`/`optionalAuth` verify only the signature — **purpose is never checked on authentication**.
- **Affected files:** `password.controller.js:18-22`, `auth.middleware.js:13-15`.
- **Exploitation:** Obtain a reset token (see F-02, or any log/proxy leak) → set it as the `token` cookie → full authenticated access as the victim for 1 hour, including admin accounts.
- **Recommended fix:** Replace JWT reset tokens with **opaque 32-byte random tokens**; store only `SHA-256(token)` on the user (`resetPasswordTokenHash`, `resetTokenExpiresAt`, `resetTokenUsedAt`); compare with `crypto.timingSafeEqual`. Session JWTs and reset tokens then share no verification path.
- **Dependencies:** P0-02 (session revocation after reset).

**F-02 · Reset token returned in API response · Critical**
- **Vulnerability:** `forgotPassword` responds `{ resetToken, message }` to anyone, for any email (demo mode).
- **Affected files:** `password.controller.js:24-27`.
- **Exploitation:** `POST /api/auth/forgot-password {"email":"victim@x"}` → response contains the live token → `POST /reset-password` → attacker sets victim's password → **full account takeover without touching email**.
- **Recommended fix:** Production never returns the token; an env-configured mail provider sends it (`EMAIL_PROVIDER` + credentials; link format `FRONTEND_ORIGIN/reset-password?token=...`). Development/test may deliver the token via a controlled local outbox (response field only when `NODE_ENV !== "production"`, or a local file/log sink). Generic response for unknown/known emails (already generic for unknown; make both identical).
- **Dependencies:** **Requires user credentials/approval for a production email provider** (see “Items needing your input”). Existing `test_m1.js` only asserts status 200 → test-safe.

**F-03 · Reset tokens not single-use / not revocable · High**
- **Vulnerability:** Tokens are pure JWTs: valid until 1h expiry, unlimited reuse; issuing a new one doesn't invalidate old; `User.resetPasswordToken` field exists but is never written or checked; successful reset doesn't kill other sessions.
- **Affected files:** `password.controller.js:18-59`, `models/User.js:89-91`.
- **Exploitation:** Token intercepted once → reusable for the full window; old sessions survive a password reset (attacker keeps access).
- **Recommended fix:** Hashed single-use tokens (F-01) with `usedAt` marking inside an atomic `findOneAndUpdate` (prevents double-spend), expiry ≤30 min, new issue overwrites old hash (invalidates previous), revoke all sessions on successful reset.
- **Dependencies:** P0-02 (session revocation), F-01.

**F-18 (partial) · No dedicated reset rate limit; timing/enumeration surface · Medium**
- **Fix:** Per-IP and per-email limiters (e.g., 5/15min) on `forgot-password` + constant generic response; covered fully under P0-06.

---

### P0-04 — Password Hashing Upgrade

**F-06 · bcrypt-only, cost 10, no migration path · High**
- **Vulnerability:** All hashing is `bcrypt.hash(pw, 10)`; verification always `bcrypt.compare`. No algorithm detection, so upgrading the algorithm later is a breaking event; cost 10 is below current guidance for interactive logins on modern hardware.
- **Affected files:** `auth.controller.js:36,58`, `password.controller.js:52,76,79`, `profile.controller.js:107-110`, `create-admin.js`, `seed*.js`, `models/User.js` (plain `password` field).
- **Exploitation:** Offline cracking of any leaked hash is cheaper than with Argon2id at OWASP parameters; no forward path.
- **Recommended fix:**
  - Add `argon2` via **`@node-rs/argon2`** (prebuilt NAPI binaries — avoids `node-gyp` build failures on Render; `argon2` npm native builds are a deploy risk).
  - OWASP-aligned Argon2id params, tuned for Render free-tier CPU: e.g. `m=19456 KiB (19 MiB), t=2, p=1` (OWASP 2024 low-memory recommendation) — verify latency < 200 ms locally before locking.
  - `hashPassword()` / `verifyPassword()` helpers: prefix detection (`$argon2id$` → argon2 verify; `$2a$/$2b$/$2y$` → bcrypt verify).
  - **Rehash-on-login:** on successful bcrypt verify, transparently re-save as Argon2id (migration without invalidating anyone).
  - Password change/reset always write Argon2id.
  - Never return hashes (verified: `-password` selects already in place; keep + test).
  - Migration failures must not fail login (catch, keep old hash, log metric).
- **Dependencies:** P0-03 (reset writes new hash), P0-08 (deletion password check must verify both), new dependency approval (justified: standard, prebuilt).

---

### P0-05 — Upload Security

**F-07 · Client-declared MIME only; no signature, dimension or pixel validation · High**
- **Vulnerability:** `fileFilter` trusts `file.mimetype` (attacker-controlled header). No verification that bytes are a real image; no width/height/pixel-count cap; no malformed-file rejection before third-party processing.
- **Affected files:** `config/upload.js:6-13`, `middleware/cloudinary.middleware.js`, `routes/post.routes.js`, `routes/upload.routes.js`.
- **Exploitation:** (a) Upload a file that *declares* `image/jpeg` but contains HTML/JS/polyglot content — stored and served (nosniff + Cloudinary content-types reduce but don't eliminate risk; local `/uploads` path serves by extension which comes from the original filename). (b) **Decompression bomb:** a tiny file that decodes to 30,000×30,000 px → CPU/memory exhaustion during validation/CDN processing. (c) Extension spoofing: `originalname = "x.php"` with image MIME → saved as `.php` in disk fallback mode (static serving won't execute it, but it violates allowlisting).
- **Recommended fix:** Introduce a validation step **after multer, before Cloudinary push** using **sharp**:
  - `sharp(buffer).metadata()` must resolve; `format ∈ {jpeg,png,gif,webp}` (from actual bytes, not client);
  - `width × height ≤ 40 MP` and each side ≤ 8192 (env-tunable);
  - re-encode/verify round-trip (`sharp(buffer).toBuffer()` succeeds) to reject malformed inputs;
  - derive the stored extension from the **detected format**, never from `originalname`.
  - Preserve: 5 MB multer cap, max 8 files, existing `f_auto,q_auto` delivery, multi-image flows.
- **Dependencies:** New dependency `sharp` (justified: de-facto standard, prebuilt binaries); middleware ordering change; tests with real PNG/GIF/WebP bytes (suite already uses a real 1×1 PNG ✔).

**F-08 · Orphaned media on failure paths; post deletion never deletes Cloudinary assets · High**
- **Vulnerability:**
  1. `deletePost` (`post-action.controller.js:58-66`) only unlinks **local** files via `path.basename(p)` — for Cloudinary URLs this resolves to a nonexistent local path → **every deleted post leaks its images on Cloudinary** (cost + retention violation).
  2. `destroyRemote()` swallows all errors (`.catch(() => {})`) → failed deletions are silently lost, no retry.
  3. `createPostWithImage`: validation failures clean up ✔, but a `Post.create` throw path calls `next(error)` **without** `deleteFiles` → leak.
  4. `uploadAvatar`: old avatar is deleted **before** the new one is saved → if `save()` fails, the user loses their avatar and the new file is orphaned.
  5. `deleteAccount` never touches avatar/cover at all.
- **Affected files:** `post-action.controller.js`, `post-image.controller.js`, `upload.controller.js`, `cloudinary.js:36-40`, `profile.controller.js`.
- **Recommended fix:** One shared `deleteMedia(urls)` helper (remote destroy + local unlink, per-item error capture) used everywhere; a **`MediaCleanupJob` collection** (`{url, attempts, nextAttemptAt, lastError}`) for compensation/retries with backoff (Cloudinary cannot join Mongo transactions — compensation is mandatory); reorder avatar swap (upload new → save → then delete old); wrap `Post.create` in try/catch cleanup.
- **Dependencies:** Used by P0-08; P0-05 validation ordering.

**F-14 (shared) · Arbitrary URL as avatar → cross-account media deletion · High**
- **Vulnerability:** `updateProfile` accepts `avatar`/`coverImage` as arbitrary strings (bypassing the entire upload pipeline), and `removeStored()` will later `destroyRemote()` **whatever URL is stored**.
- **Affected files:** `profile.controller.js:51,78`, `upload.controller.js:8-13,29,44`.
- **Exploitation:** `PUT /api/profile {"avatar":"https://res.cloudinary.com/fhcjepbw/image/upload/v…/rio/posts/VICTIM_IMAGE.jpg"}` then `DELETE /api/upload/avatar` → our credentials destroy the victim's image. Also enables tracking-URL injection and non-image values.
- **Recommended fix:** Remove `avatar`/`coverImage` from `updateProfile`'s accepted fields (uploads only go through `/api/upload/*`), or restrict stored URLs to `res.cloudinary.com/<our cloud>/rio/*` + `/uploads/<basename>`. Covered in P0-05/P0-09.
- **Dependencies:** Check `EditProfile.jsx` for `avatar` usage in profile PUT (client may need adjustment).

---

### P0-06 — Per-User Rate Limiting

**F-10 · IP-only limiter, broken behind Render, no per-account layers · High**
- **Vulnerability:** One `express-rate-limit` instance keyed by `req.ip`, mounted on `/api`. `app.set("trust proxy", …)` is **not configured**, so on Render `req.ip` is the platform router for **every** request → all users share a single bucket (500 req/15 min in production), and conversely no meaningful per-attacker bound exists. No per-user limits for abuse endpoints; no auth/reset/upload/messaging limits.
- **Affected files:** `server/app.js:29-37,57`.
- **Exploitation:** (a) One noisy client exhausts the shared bucket → **global 429 DoS for all users**; (b) an attacker with N accounts can follow/message/like-spam with no account-level bound; (c) credential stuffing against `/login` bounded only by the shared bucket; (d) `X-Forwarded-For` spoofing is currently impossible *only because* trust proxy is off — the fix must add hop-count-limited trust, not blind header trust.
- **Recommended fix:**
  - `app.set("trust proxy", 1)` (Render's single trusted hop; never `true`).
  - Layered limiters, all env-configurable, all emitting `{ errors: [...] }` with 429 via custom handler:
    - global per-IP (existing, keep);
    - **auth:** login/register per-IP+per-email (e.g. 10–15 / 15 min);
    - **reset:** forgot-password per-IP+per-email (5 / 15 min);
    - **per-account** on abuse-prone authenticated routes (follow, like, comment, message-send, upload) keyed by `req.user.id` (fallback to IP pre-auth);
    - upload-specific bytes/count window (e.g. 30 uploads / 15 min).
  - Test environment: high limits via existing `NODE_ENV=test` defaults so the 181-test suite never trips them.
  - **No Redis** — Render runs a single instance; document the seam (`keyGenerator` + store interface) so a shared store can be dropped in if scaled out.
- **Dependencies:** Touches every suite run → do early; pairs with F-18.

**F-18 · No purpose-specific limits; register email enumeration · Medium**
- **Fix:** As above; keep `401 "Invalid email or password"` generic (already ✔). Register `409 "User already exists"` is an accepted UX tradeoff (tests assert status only) — mitigate with per-IP registration limits; document as residual.

---

### P0-07 — Admin Audit Logging

**F-15 · No audit trail; no suspension mechanism · Medium**
- **Vulnerability:** Admin moderation (`editPost`/`deletePost` when `actor ≠ author`) writes nothing attributable. There is no `AuditLog` model, no admin-only read path, and no suspend/restore operation at all (the P0 spec requires tracking suspension/restoration, role changes, moderation outcomes, reason, requestId).
- **Affected files:** `post-action.controller.js:6-10,12-76` (the only privileged ops today); no model exists.
- **Exploitation:** Malicious/compromised admin can edit or wipe any user's content with zero forensic trail; users cannot be shown what happened; incident response impossible.
- **Recommended fix:**
  - `models/AuditLog.js`: `{ actor, action, targetType, targetId, metadata (strict whitelist), requestId, ip (from trusted proxy), outcome, reason, createdAt }`; indexes `{ createdAt: -1 }`, `{ actor, createdAt }`, `{ targetId }`.
  - Append-only at app level: model exposes only `create` + `find` (no update/delete routes; document that DB-level enforcement is out of app scope).
  - `writeAudit()` helper invoked from: admin edit/delete of others' posts, **new** `POST /api/admin/users/:id/suspend|restore` and `PATCH /api/admin/users/:id/role` (admin-only routes; `role` change via env-guarded script only, or admin endpoint — decide in implementation), all with `outcome` + optional `reason`.
  - Never store passwords/tokens/secrets/emails (actor/target as ObjectId + username snapshot at most).
  - Read path: `GET /api/admin/audit` with `protect` + server-side admin check, paginated.
  - Suspension: add `User.suspended`; `protect`/`login` reject suspended users and **revoke their sessions**.
- **Dependencies:** P0-02 (suspend revokes sessions); P0-08 (deletion may write a final audit record with retention policy — store actor/target ids only, no PII payload).

---

### P0-08 — Account Deletion Integrity

**F-09 · Partial, non-idempotent, non-transactional deletion; password in query string · High**
- **Vulnerability (current sequence):** verify password → `Post.deleteMany(author)` → `Comment.deleteMany(author)` → pull follower/following refs → `findByIdAndDelete(user)`. Missing:
  - comments **on** the user's posts (now orphaned, pointing at deleted posts);
  - replies **to** the user's comments (orphans);
  - notifications sent/received (orphans; clients populate `sender` → null crashes);
  - `likes` entries inside other users' posts, `bookmarks` entries referencing the user's posts (stale ids);
  - conversations & messages (participant remains a ghost; `unreadCounts` stale key);
  - Cloudinary avatar/cover (F-08);
  - **session revocation** (F-05);
  - ordering is unsafe: crash after post-deletion but before user-deletion leaves a live user with zero posts; a second run throws on `user.password` of `null` → 500 (**not idempotent**);
  - `req.query.password` accepts the password **in the URL** → secret lands in Render access logs, proxies, browser history.
- **Affected files:** `profile.controller.js:99-133`.
- **Recommended fix (staged, idempotent, best-effort transactional):**
  1. Password accepted from **body only** (drop `req.query` fallback).
  2. Atomically mark `deletingAt` (rejects further writes; immediately revokes sessions).
  3. Reverse-reference cleanup with set-based ops: `$pull` user from others' followers/following/likes/bookmarks; delete notifications where sender/recipient = user; delete comments on user's posts + replies to user's comments; conversations: delete 1:1 threads where user is participant (both sides' content) **or** anonymize per documented retention policy — default: delete threads, keep an audit record of ids only.
  4. Enqueue avatar/cover for media cleanup (retryable — outside any transaction).
  5. Delete the user document **last**; wrap steps 3+5 in a Mongo transaction (Atlas replica set supports it) with compensating retries if unavailable.
  6. Respond `200` even if already deleted (idempotent); `protect` after deletion returns 401 because the session was revoked.
  7. Retain `AuditLog` entries (ids + action only) per retention policy.
- **Dependencies:** P0-02 (sessions), P0-07 (audit retention), P0-08 media queue (F-08). Existing test `Session cleared after delete → 401` must keep passing ✔.

---

### P0-09 — Authorization Audit

Route-by-route review (all `protect` unless noted):

| Area | Verdict | Evidence |
|---|---|---|
| Profile edit | ✔ own user only (`findByIdAndUpdate(req.user.id)`) | `profile.controller.js:81` |
| Post edit/delete | ✔ owner or DB-verified admin | `post-action.controller.js:6-10,25,48` |
| Post image add/remove | ✔ author only | `post-image.controller.js:64,109` |
| Comment edit/delete | ✔ author only (no admin override — noted, by design) | `comment-action.controller.js:17,39` |
| Conversation read/send/read-mark | ✔ participant check | `message.controller.js:54,97`, `message-read.controller.js:9` |
| Bookmarks | ✔ scoped to `req.user.id` | `bookmark.controller.js:28-38` |
| Notifications | ✔ `recipient: req.user.id` in every query | `notification.controller.js:19,44,61,72` |
| Upload delete | ✔ field whitelist + own user | `upload.controller.js:54-67` |
| Admin actions | ✔ DB role re-check per request | `post-action.controller.js:6-10` |
| **Avatar/cover URL** | ✘ **F-14** arbitrary URL → cross-account destroy | `profile.controller.js:78` |
| **Private accounts** | ✘ **F-13** `isPrivate` never queried server-side | grep: only read/write in profile |
| **Search input** | ✘ **F-11** raw `$regex` (ReDoS) | `bookmark.controller.js:53,86` |
| **GET mutation** | ✘ **F-12** | `message.controller.js:40` |
| Stale-token writes (deleted user) | ✘ **F-05** no session/existence gate on mutations | `auth.middleware.js` |

- **F-11 · Regex injection · Medium:** escape metacharacters, cap input length (≤100), prefer the existing text index for content search.
- **F-13 · `isPrivate` cosmetic · Medium:** enforce server-side — proposal: profile metadata visible, **posts + follower/following lists hidden** from non-followers (self/admin exempt); feed excludes private users' posts unless follower. **Product-policy confirmation requested** (may change demo behavior).
- **Stale-token/ghost-writes:** fixed by P0-02 session + existence checks.
- **Required tests:** IDOR suite — cross-user edit/delete (post, comment, profile), foreign conversation read/send, notification mark/delete by non-recipient, upload delete for another user's resource, avatar-URL injection rejection, private-profile access, admin-only audit route as normal user.

---

### P0-10 — Production Secrets Audit

| Check | Result |
|---|---|
| Hardcoded JWT secret | ✔ none in source or history |
| Database credentials in source/history | ✔ none (`.env` never committed; 0 history hits for `mongodb+srv://`) |
| Cloudinary secrets in source | ✔ none |
| Email credentials | n/a (no provider yet) |
| **Demo admin credentials** | ✘ **F-16 High** — the demo admin password was hardcoded in tracked `server/create-admin.js`, printed by the script, documented in `project.md`, and is present in git history (2 additions) — **and it is live on the production admin account** (value redacted here per fix (c); see git history pre-hardening) |
| Reset tokens in responses | ✘ **F-02 Critical** |
| API keys in seed scripts | ✔ none (image fetch needs no key) |
| Exposed env files | ✔ `.env` gitignored (`.env`, `.env.*`, `!.env.example`), never in history |
| Secrets in startup logs | ✔ logs presence booleans only — but **F-19**: missing `MONGO_URI`/`JWT_SECRET` only warns in production (fail-open) |
| Secrets in frontend bundles | ✔ only `VITE_API_URL` (non-secret) |
| Git history | ✔ clean except F-16 credential |
| Seed safety | ✘ **F-23 Medium** — `seed*.js` connect to whatever `MONGO_URI` is set (no production guard); 21 live demo accounts use documented `pass1234` |

**Recommended fixes:** (a) `create-admin.js` reads `ADMIN_EMAIL`/`ADMIN_PASSWORD` from env, refuses known default values when `NODE_ENV=production`, never echoes the password; (b) rotate the live admin password (requires your approval — runbook provided in the implementation report); (c) replace credential literals in docs with placeholders; (d) fail-fast validation in `server.js` (production: exit if `JWT_SECRET` missing or < 32 chars, `MONGO_URI` missing); (e) seed scripts refuse to run when `NODE_ENV=production` unless `FORCE_SEED=1`; (f) keep `CORS_ORIGINS`/`RATE_LIMIT_MAX` documented in `.env.example`.
- **Dependencies:** **User approval needed for live credential rotation (F-16).**

**F-22 · CORS rejection → 500 · Low:** translate CORS errors to 403 `{errors:["Origin not allowed"]}`; keep error logging but ensure no request bodies/tokens are logged (currently `console.error("Unhandled error:", err)` — scrub stack context).

**F-20 · `{message}` vs `{errors}` on 401 · Low:** emit `errors[]` primary (client already prefers it), keep `message` mirror for one release; existing tests assert status only → safe.

---

## Existing Test Coverage vs. Required Security Tests

Present today (status-code level): cross-user post/comment 403s, stranger conversation 403s, post-deletion session 401, upload validation basics, profile password/email non-leak.
**Absent (must be added in Phase 3):** CSRF (missing/invalid/valid/untrusted-origin), session rotation & revocation & reuse detection, reset expiry/single-use, bcrypt→Argon2id migration, file-signature & oversize & bomb rejection, per-account 429, audit-log authorization, deletion cleanup completeness, IDOR matrix, unauthorized conversation access (extend), secrets/config validation tests.
Test runner facts: raw `http.request` against `localhost:3000`, **status-code assertions** (body assertions on shapes like `{user}`, `{profile}`, `{posts}` — those shapes must be preserved), Node client sends **no Origin header** (CSRF design must accommodate a token flow in the shared helper), `test_*.js` files are gitignored/local-only, tests run against `rio-database_test`.

---

## Impact on the Existing 181 Tests (expected)

| Change | Risk to suite | Mitigation |
|---|---|---|
| CSRF on mutations | All suites' POST/PUT/PATCH/DELETE | Extend each suite's `req()` helper: capture CSRF token at login (cookie+header); add explicit negative CSRF tests |
| Sessions/refresh | Login/me/cookie assertions | Keep cookie name `token`; keep `{user}` shapes; add refresh flow tests separately |
| Rate limits | Shared-bucket 429 mid-suite | Test-env high limits (existing pattern); per-auth limiters disabled/high under `NODE_ENV=test` |
| Argon2id | Register/login/password tests | Transparent dual-verify; same statuses |
| Reset response change | `test_m1.js:72-73` asserts **status only** | Safe; token never used by old tests |
| Sharp validation | `test_images.js` uses a real 1×1 PNG | Safe; add negative fixtures (bad bytes, oversize dims) |
| GET conversation → POST | Any test hitting `GET /messages/user/:id` | Update helper call to POST (behavioral change documented) |
| Account deletion order | `Session cleared after delete → 401` | Revocation keeps this green; make response identical |

---

## Proposed Implementation Order (dependency-driven)

| Wave | P0 Items | Rationale |
|---|---|---|
| **1** | **P0-10** (fail-fast env validation, `.env.example`, seed guards, admin-credential env refactor — rotation runbook flagged for approval) | Zero-risk to runtime behavior; unlocks clean config for everything else |
| **2** | **P0-06** (trust proxy + layered limiters, test-safe) | Must land before large test-suite changes so new tests never fight 429s |
| **3** | **P0-02 + P0-01** (sessions/refresh/rotation/reuse-detection/revocation + CSRF bound to session + cookie hardening F-17/F-21 + 401 contract F-20 + client `http.js` refresh/CSRF + GET-mutation fix F-12) | Single tightly-coupled wave over the auth core; one test-helper update instead of two |
| **4** | **P0-03** (opaque hashed single-use reset, mail provider env + dev outbox, reset rate limits, session revocation on reset) | Depends on waves 2–3; needs your provider input for prod activation |
| **5** | **P0-04** (Argon2id + dual-verify + rehash-on-login) | After reset so all new hashes are Argon2id |
| **6** | **P0-05** (sharp signature/dimension validation pre-Cloudinary, extension from detected format, shared media-delete helper + cleanup queue, avatar-swap ordering, F-14 URL whitelist) | Independent of auth waves; new dependency `sharp` |
| **7** | **P0-07** (AuditLog model, admin suspend/restore/role endpoints, `GET /api/admin/audit`, writeAudit hooks) | Needed before deletion retention & suspension semantics |
| **8** | **P0-08** (staged idempotent deletion: password-in-body, session revoke, reverse-ref cleanup, media queue, transaction, audit retention) | Consumes waves 3, 6, 7 |
| **9** | **P0-09** (regex escape, isPrivate enforcement — policy confirm, IDOR test matrix, centralized authz helpers, ghost-write guards) | Final cross-cutting sweep |
| **10** | **Phase 3** — extend suite to cover all 15 required security test categories; run `node run_tests.js`, `node test_lines.js`, `npm run lint`, `npm run build` | No claim of completion without full green |
| **11** | **Phase 5** — audit update (status per finding), `docs/P0_IMPLEMENTATION_REPORT.md`, `.env.example`, `project.md` | Documentation last, reflecting reality |

**Rule applied throughout:** each wave = inspect → explain → implement → add tests → regression → verify → document → next. No big-bang rewrite; 150-line rule and `{errors:[...]}` preserved every step.

---

## Items Needing Your Approval / Input (blocking only where noted)

1. **Email provider for production password reset (P0-03)** — need provider choice + credentials (e.g. Resend/SendGrid/SMTP). *Until provided:* implement env-driven provider + dev/test local outbox; production keeps working with generic responses and **no token in responses** (reset email simply not deliverable until configured). **Blocking for prod reset delivery only.**
2. **Admin password rotation (F-16)** — the demo admin password (in git history pre-hardening) is live on production. `create-admin.js` is env-driven now; **changing the actual production password requires your go-ahead** (runbook in the implementation report §4; rotating invalidates the documented demo login).
3. **`isPrivate` enforcement policy (F-13)** — my default: hide private users' posts + follower/following lists from non-followers (self/admin exempt). Confirm or adjust (changes demo behavior).
4. **Conversation creation GET→POST (F-12)** — small breaking API change (client + tests updated together). Confirm.
5. **`sharp` + `@node-rs/argon2` dependencies** — both prebuilt-binary, standard choices; Render-compatible. Confirm to proceed (waves 4–5).
6. **Retention policy for deleted users' conversations/messages** — default: delete 1:1 threads containing the user (audit keeps only ids). Confirm or choose anonymization ("[deleted user]").

No other production settings or credentials will be changed without explicit approval.
