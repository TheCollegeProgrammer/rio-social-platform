# RIO — P0 Security Hardening: Implementation Report

**Scope:** All 10 approved P0 items (P0-01 … P0-10) + Phase 3 security test suite.
**Base:** codebase at commit `2d3fc62` (+ uncommitted `project.md` restructure). Audit: `docs/P0_SECURITY_AUDIT.md`.
**Status:** **Complete** — all waves implemented, no open findings.

---

## 1. Verification (final state)

| Gate | Result |
|---|---|
| `node test_lines.js` | **153 files, 0 over 150** |
| `node run_tests.js` | **260/260 — 5/5 suites** (`m1` 18 · `m234` 74 · `m56` 58 · `images` 31 · **`security` 79**) |
| `npm run lint` (client) | **oxlint, 0 warnings** |
| `npm run build` (client) | **✓ built** |

The security suite (`test_security.js`, gitignored like all tests) runs last with `AUTH_RATE_MAX=5` injected by `run_tests.js` so real 429s are observable; every other suite keeps default test headroom.

---

## 2. What was built, per item

### P0-01 — CSRF (`csrf.middleware.js`)
- Per-session CSRF token: HMAC-SHA256(`sid`, `JWT_SECRET`) issued at login/refresh, carried in a **non-httpOnly** `csrf_token` cookie, sent as `X-CSRF-Token`.
- `Origin`/`Referer` allowlist check first (403 `Origin not allowed`); cookie-authed mutations without a valid pair are rejected. Cookieless (pre-auth) mutations are origin-gated only.
- Mounted globally after the rate limiter in `app.js`; covers every POST/PUT/PATCH/DELETE without touching individual routes.
- Client `http.js` reads the cookie and attaches the header to mutations.
- F-21 fixed here too: JWT `algorithms:["HS256"]` pinned; cookies get `path:"/"` + lifetimes aligned to session TTLs.

### P0-02 — Sessions & refresh (`models/Session.js`, `utils/tokens.js`, `utils/sessions.js`, `auth.middleware.js`)
- Access JWT 15 min (`ACCESS_TOKEN_TTL`) carrying `{ id, sid }`; refresh token = 32 random bytes stored **only as SHA-256 hash**, 30 d TTL with Mongo TTL index.
- `POST /api/auth/refresh` rotates atomically (single `findOneAndUpdate` guarded on the old hash) with a **30 s grace window** for parallel tabs; replay outside grace = **reuse detected → session revoked**.
- `protect`/`optionalAuth` verify signature **and** live session; password change, reset, suspend and deletion all `revokeAllForUser`.
- `POST /api/auth/logout` (revokes sid, idempotent) and `POST /api/auth/logout-all`.
- Client `http.js`: single-flight refresh, one 401→refresh→retry, `NO_REFRESH` path for auth endpoints.
- F-20 fixed: 401s emit both `errors[]` and `message`.

### P0-03 — Password reset (`utils/mailer.js`, `password.controller.js`)
- Opaque 32-byte tokens, stored **sha256-hashed** with 1 h expiry (`User.resetPasswordExpires`), single-use inside an atomic update; new issue overwrites old.
- Token **never returned or logged**: dev/test deliver to gitignored `server/.reset-outbox.json`; production sends via Resend HTTP API (`RESEND_API_KEY` + `RESET_EMAIL_FROM`) — **inactive until credentials are provided**.
- Generic 200 for known/unknown emails; `revokeAllForUser` on successful reset. F-01/F-02/F-03 closed.

### P0-04 — Argon2id (`utils/password.js`, `@node-rs/argon2`)
- `hashPassword`/`verifyPassword` with prefix detection (`$argon2id$` vs bcrypt), OWASP params m=19456 t=2 p=1.
- **Rehash-on-login**: legacy bcrypt hashes transparently upgraded on successful login; reset/change/create-admin/seeds all write Argon2id. Migration failure never fails login.

### P0-05 — Upload security (`middleware/validateImage.js`, `utils/media.js`, `utils/mediaQueue.js`, `models/MediaCleanup.js`)
- Post-multer, pre-Cloudinary validation: magic-byte format allowlist (jpeg/png/gif/webp), `UPLOAD_MAX_SIDE` (8192), `UPLOAD_MAX_PIXELS` (40 M) bomb cap, round-trip re-encode; stored extension comes from **detected** bytes.
- One `deleteMedia()` helper everywhere (avatar swap, post image remove, post delete, account delete): local unlink / remote destroy with **retry queue** (`MediaCleanup`, exponential backoff, 10 attempts).
- F-14: `updateProfile` no longer accepts `avatar`/`coverImage` URLs — upload endpoints only.

### P0-06 — Rate limiting (`middleware/ratelimit.js`)
- `app.set("trust proxy", 1)` (Render's single hop).
- Layered limiters, all env-overridable (`*_RATE_MAX`): global/IP, login+register (per IP/email), reset (per IP/email), change-password, and per-account follow/like/bookmark/comment/message/upload. Custom 429 handler emits `{ errors: [...] }`.
- Test env keeps high defaults so suites never trip them (except the security suite's deliberate `AUTH_RATE_MAX=5`).

### P0-07 — Admin audit & suspension (`models/AuditLog.js`, `utils/audit.js`, `middleware/admin.middleware.js`, `admin.controller.js`, `admin.routes.js`)
- Append-only `AuditLog` (actor/action/target/whitelist metadata/requestId/ip/outcome/reason, indexes on `createdAt`/`actor`/`targetId`).
- `POST /api/admin/users/:id/suspend|restore` (admin-only, **suspension revokes all sessions**; login rejects suspended accounts with 403) and `GET /api/admin/audit` (paginated ≤100).
- Moderator deletes of others' posts write audit entries.

### P0-08 — Account deletion (`controllers/account-delete.controller.js`)
- Password from **body only**; staged idempotent order: verify → media → comments (author **and** on user's posts) → posts → notifications → social graph → bookmarks → conversations+messages → revoke sessions → audit → **user doc last** → clear cookies.
- Re-run or racing request → safe 200; post-deletion cookie → 401. Client `api.js` sends the body; test updated.

### P0-09 — Authorization audit (`utils/visibility.js`, controllers)
- F-11: user input escaped (`escapeRegex`) + length-capped in search regexes.
- F-13: `isPrivate` enforced server-side — private users' **posts** and **follower/following lists** hidden from non-followers (self/admin exempt); feed/post detail filter accordingly (product-approved policy).
- F-12: `GET /messages/user/:userId` is **find-only**; creation moved to **POST** (client + tests updated — approved breaking change).
- IDOR matrix covered by the security suite (conversation read/send as outsider → 403, etc.).

### P0-10 — Secrets & startup (`server.js`, `create-admin.js`, `seedGuard.js`)
- Production **fails fast** (exit) on missing/short `JWT_SECRET` or missing `MONGO_URI` — no secret values ever printed (security suite asserts no leak).
- `create-admin.js` reads `ADMIN_EMAIL`/`ADMIN_PASSWORD` from env, refuses demo defaults in production, never echoes the password.
- All `seed*.js` refuse `NODE_ENV=production` without `FORCE_SEED=1`.
- F-22: CORS failures surface as 403 `{errors:[...]}`, not 500.
- **Live admin password rotation intentionally not performed** — runbook in §4.

---

## 3. Security test coverage (79 assertions)

| Section | Covers |
|---|---|
| C1–C2 | 401 `errors[]+message` contract; security headers (incl. HSTS in prod) |
| C3–C7 | CSRF: missing/invalid/valid token, untrusted Origin, cookieless evil-origin |
| C8–C11 | Refresh rotation, reuse detection (backdated session), logout revocation, change-password revocation |
| C12–C13 | Reset: no token in response, single-use, expiry, session revocation (outbox-driven) |
| C14 | bcrypt → Argon2id migration on login |
| C15 | Uploads: fake MIME (magic bytes), oversize body, dimension bomb, valid image |
| C16 | Per-account login 429 (`AUTH_RATE_MAX=5`) |
| C17–C18 | Admin route authorization; suspend → 401/403 → restore lifecycle + audit rows |
| C19–C20 | Conversation IDOR; GET find-only / POST create |
| C21 | Deletion completeness (post 404, session 401, login 401) |
| C22 | Prod fail-fast: missing + weak secrets, no secret echoed in output |
| C23 | IDOR matrix: foreign post/comment edit & delete, avatar-URL injection not stored, foreign notification mark, private-post/follower-list gating both directions |

---

## 4. Operational runbooks (user action required)

1. **Activate production reset email** — set `RESEND_API_KEY`, `RESET_EMAIL_FROM` (and optionally `CLIENT_ORIGIN`) in Render. Until then, production forgot-password returns the generic 200 but cannot deliver mail.
2. **Rotate the live admin password** (F-16: the demo admin password still lives in git history):
   ```
   # on Render (or locally with prod MONGO_URI — never commit the value)
   set ADMIN_PASSWORD=<new-strong-password> && node create-admin.js
   ```
   Then update the demo-access note wherever it is shared. Docs in the repo now carry placeholders only.
3. **Tune rate limits** — any `*_RATE_MAX` env var overrides its default (see `server/.env.example`).
4. **New dependencies:** `@node-rs/argon2` (prebuilt NAPI — no node-gyp on Render) and `sharp` (prebuilt). Both approved pre-implementation.

## 5. Residual risks (accepted / documented)

- Register returns `409` on existing email (enumeration UX tradeoff, mitigated by per-IP register limits).
- Single-instance in-memory rate-limit store — seam documented (`keyGenerator`); add shared store if scaling out.
- Prod reset delivery blocked until §4.1 credentials exist; admin credential rotation (§4.2) pending user.
- Audit retention is app-level append-only; DB-level enforcement out of scope.
- Seeded demo accounts still exist on the production DB by design (seed guard prevents *re-running* seeds there).

**Rule kept throughout:** every wave = inspect → implement → test → regression → verify → document. 150-line cap and `{errors:[...]}` contract hold at every step.
