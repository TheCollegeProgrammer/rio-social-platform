# RIO 2.0 --- Selected Improvements & OpenCode Implementation Brief

**Document type:** Implementation specification and agent prompt\
**Project:** RIO social media application\
**Audience:** OpenCode / coding agent and project owner\
**Execution mode:** Audit first; implementation requires explicit
approval

------------------------------------------------------------------------

## 1. Mission

You are working on **RIO**, an existing full-stack social media
application. Your job is to inspect the current repository and prepare a
safe, dependency-aware implementation plan for the improvements selected
in this document.

The selected work covers:

-   Feed refresh, API efficiency, frontend performance and responsive
    experience
-   Real-time infrastructure and messaging
-   Social privacy, interactions and moderation
-   Media creation and publishing
-   Production observability, testing, backups and scalability
-   User data ownership and portability

This document is the scope of work. Do not silently add unrelated
features or expand the project beyond these selections.

## 2. Non-negotiable execution rule

### Stage 1 --- Audit only

**Do not edit, create, delete, rename, move, format or generate project
files during the initial audit. Do not run migrations, modify databases,
change environment variables, install packages, deploy, or alter
external services.**

First inspect the repository and report:

1.  Current architecture and actual technology versions.
2.  Relevant frontend routes, pages, components, hooks and
    state-management patterns.
3.  Relevant backend routes, controllers, services, middleware and
    socket infrastructure, if any.
4.  Existing MongoDB/Mongoose models, relationships, indexes and data
    constraints.
5.  Existing authentication, authorization, privacy and upload
    mechanisms.
6.  Existing tests, scripts, CI workflows, deployment configuration and
    documentation.
7.  Which selected requirements are already implemented, partially
    implemented, missing, or unsafe/incomplete.
8.  Existing bugs, architectural constraints, technical debt and
    compatibility risks relevant to this scope.
9.  Dependencies between improvements and a proposed implementation
    order.
10. Files likely to be affected, with a short reason for each.

Use repository evidence. Cite exact file paths and relevant symbols;
include line numbers where practical. Do not infer that a feature is
absent merely because it is not found in one file. Search the full
relevant code path.

### Required status labels

For every selected improvement, assign exactly one initial status:

-   **Already implemented** --- the required behavior exists and is
    sufficiently complete.
-   **Partially implemented** --- some behavior exists, but important
    requirements are missing or unreliable.
-   **Not implemented** --- no meaningful implementation exists.
-   **Needs verification** --- repository evidence is insufficient to
    make a reliable determination.

Also assign an implementation priority:

-   **P0 --- Critical prerequisite:** security, data integrity or
    architectural prerequisite that must be addressed before dependent
    work.
-   **P1 --- High:** core selected functionality or reliability work.
-   **P2 --- Medium:** valuable improvement that can follow core
    functionality.
-   **P3 --- Later:** long-term portability or federation work.

Priority may differ from the phase number. Explain any reprioritization.

### Stage 1 deliverables

Create no files yet. Present the audit report in the terminal/chat with:

-   Executive summary
-   Architecture map
-   Per-feature status matrix
-   Security and data-integrity findings
-   Dependency map
-   Ordered implementation roadmap
-   Proposed file-level change plan
-   Test and verification plan
-   Risks, assumptions and questions requiring owner decisions

Then **stop and wait for explicit approval**. Do not begin
implementation until the owner approves the audit and roadmap.

### Stage 2 --- After approval only

After explicit approval, implement in small, reviewable increments.
Before each work package, state its scope and affected files. Preserve
existing behavior, add/update tests, run the relevant checks, and report
results. Do not claim tests passed unless they were actually executed
and passed.

------------------------------------------------------------------------

## 3. Project context and constraints

The known project context is:

-   Frontend: React + Vite.
-   Backend: Node.js + Express.
-   Database: MongoDB with Mongoose.
-   Authentication: JWT-based authentication using httpOnly cookies.
-   Media: Cloudinary.
-   Existing product areas include feed/posts, profiles,
    follow/unfollow, likes/comments, notifications and messaging.

These are **starting clues, not authoritative repository facts**. Verify
the actual code and versions before planning changes. If the repository
differs, report the difference and adapt the plan without making
changes.

### Engineering constraints

1.  Do not rewrite the application or replace its architecture without
    evidence and owner approval.
2.  Reuse existing components, services, APIs and patterns where
    appropriate.
3.  Preserve existing routes and API contracts unless a migration is
    necessary and approved.
4.  Maintain secure server-side authorization; hiding UI controls is not
    authorization.
5.  Validate all untrusted input at server boundaries.
6.  Avoid leaking private messages, private profile data, tokens,
    secrets or internal error details.
7.  Do not hardcode mock users, fake metrics or fabricated activity in
    production features.
8.  Do not add dependencies until their need, maintenance status and
    bundle/runtime impact are justified.
9.  Do not introduce Redis, Socket.IO, queues, workers or other
    infrastructure until the current architecture and deployment
    constraints have been audited.
10. Do not make destructive database changes. Any schema migration must
    be backward-compatible where practical, documented, tested and
    approved.
11. Preserve accessibility, responsive behavior and reduced-motion
    preferences.
12. Keep secrets out of source control, client bundles and logs.
13. Do not deploy or change production services without explicit
    approval.
14. Respect the repository's existing code conventions and test
    commands. Do not assume a line-count rule unless it is present in
    project documentation or explicitly confirmed by the owner.

------------------------------------------------------------------------

# 4. Selected scope --- Phase 1: Feed, UI/UX & Performance

**Goal:** Make the existing feed more reliable, efficient and usable
across screen sizes.

### 4.1 Feed Refresh Optimization

**What it does:** Prevents duplicate posts, concurrent refresh races and
unexpected jumps while a user is reading.

**Additional work in RIO:** - Deduplicate feed entries using stable post
identifiers. - Prevent overlapping refresh/load-more requests. -
Preserve the user's reading position when new posts are available. -
Handle deleted posts and newly inserted posts without corrupting feed
order. - Make refresh and pagination states explicit.

**Likely frontend areas:** Feed page, feed hooks/state, post list,
scroll management and loading indicators.\
**Likely backend areas:** Feed endpoint, sorting and pagination
contract.\
**Likely database areas:** Post timestamps and stable identifiers used
for ordering.

**Dependencies:** Existing feed contract and pagination behavior must be
audited first. Coordinate with cursor pagination if already present.\
**Acceptance criteria:** Repeated refreshes do not duplicate posts;
simultaneous requests are safely handled; new content does not
unexpectedly move the reader's viewport; ordering remains deterministic.

### 4.2 Suggestions API

**What it does:** Supplies real, eligible accounts for the Suggested for
You area instead of static or fabricated suggestions.

**Additional work in RIO:** - Add or refine an authenticated suggestions
endpoint. - Exclude the current user, already-followed accounts and
unavailable accounts. - Respect blocks and privacy rules if those
features exist. - Return only fields needed by the UI. - Use bounded
result sizes and efficient queries. - Use mutual connections or other
recommendation signals only when the data exists and can be computed
safely.

**Likely frontend areas:** Suggestions sidebar/card, user profile
summary and follow action.\
**Likely backend areas:** User routes/controllers/services and
authorization middleware.\
**Likely database areas:** User and follow relationship queries; indexes
only where query plans justify them.

**Dependencies:** Existing follow model/API and privacy/blocking rules.\
**Acceptance criteria:** Results are real and eligible; no
self/followed/blocked account is returned where applicable; endpoint is
authenticated, bounded and does not expose private fields.

### 4.3 Messages Preview API

**What it does:** Retrieves the current user's latest conversations for
the compact Home-screen Messages card.

**Additional work in RIO:** - Return a bounded list of recent
conversations. - Include only safe preview fields, latest-message
preview, timestamp and unread count where supported. - Verify the
requester is a participant in every returned conversation. - Avoid
returning full message histories. - Support empty, loading and failure
states in the UI.

**Likely frontend areas:** Home sidebar message card, conversation
navigation and message state.\
**Likely backend areas:** Conversation/message routes, services and
membership authorization.\
**Likely database areas:** Conversation and message models; indexes for
participant lookup, latest message and unread/read state.

**Dependencies:** Existing messaging schema, membership rules and
read-receipt semantics.\
**Acceptance criteria:** Only the authenticated user's conversations
appear; no unauthorized message data is exposed; previews are bounded
and sorted correctly.

### 4.4 Optimistic Follow Interactions

**What it does:** Makes Follow/Unfollow appear immediate while the
server request completes.

**Additional work in RIO:** - Update the local UI optimistically. -
Prevent repeated clicks and duplicate requests. - Reconcile with the
server response. - Roll back on failure and show clear feedback. - Keep
follower/following counts and suggestion lists consistent.

**Likely frontend areas:** Follow buttons, profile cards, profile pages,
feed cards and shared follow hooks.\
**Likely backend areas:** Existing follow/unfollow endpoints and
authorization.\
**Likely database areas:** Existing follow relationship storage;
uniqueness constraints/indexes if required.

**Dependencies:** Existing follow API contract and state ownership.\
**Acceptance criteria:** UI responds immediately; failures restore
correct state; repeated actions cannot create duplicate relationships.

### 4.5 Server-State Optimization

**What it does:** Establishes consistent fetching, caching and
synchronization for server-owned data.

**Additional work in RIO:** - Audit current fetching hooks and
duplicated request logic. - Evaluate TanStack Query against the existing
architecture. - If justified, define query keys, stale times, retries,
invalidation and mutation patterns. - Avoid migrating every component at
once. - Keep authentication and cookie/CSRF behavior correct.

**Likely frontend areas:** API client, data hooks, feed, profiles,
suggestions, messages and notifications.\
**Likely backend areas:** Only endpoints whose contracts need
adjustment.\
**Likely database areas:** Usually none directly.

**Dependencies:** Current state management and API client audit.\
**Acceptance criteria:** Reduced duplicate requests, predictable cache
invalidation, correct behavior after mutations and no stale private data
across account changes.

### 4.6 MongoDB Feed Indexes

**What it does:** Improves feed query performance through indexes that
match real filters and sort patterns.

**Additional work in RIO:** - Inspect actual feed queries and filters. -
Review current indexes and use query execution plans (`explain`) on
representative queries. - Propose compound indexes based on measured
query patterns. - Consider index size and write overhead. - Add indexes
through a documented, safe migration/deployment procedure.

**Likely frontend areas:** None, except pagination/filter behavior if
contracts change.\
**Likely backend areas:** Feed query implementation.\
**Likely database areas:** Post collection indexes and migration
scripts.

**Dependencies:** Feed query audit and stable sort/filter contract.\
**Acceptance criteria:** Indexes are evidence-based; explain plans show
expected index use; no destructive or unreviewed production index
operation occurs.

### 4.7 Lazy Loading

**What it does:** Defers non-critical images and UI until they are close
to being viewed.

**Additional work in RIO:** - Lazy-load feed images and below-the-fold
media. - Use suitable image dimensions and loading behavior. - Lazy-load
heavy route-level or non-critical components where beneficial. -
Preserve layout dimensions to reduce layout shift.

**Likely frontend areas:** Post media, avatars where appropriate, feed
cards and route components.\
**Likely backend areas:** Usually none.\
**Likely database areas:** None.

**Dependencies:** Existing image components and Cloudinary URL
strategy.\
**Acceptance criteria:** Less unnecessary initial loading; no broken
media; reduced layout shift; visible content loads promptly.

### 4.8 Frontend Bundle Optimization

**What it does:** Reduces the JavaScript required for the initial page
load.

**Additional work in RIO:** - Inspect Vite build output and identify
large dependencies/chunks. - Split routes and heavy components where
useful. - Lazy-load non-critical modules. - Avoid unnecessary
dependencies and duplicated libraries. - Compare bundle output before
and after.

**Likely frontend areas:** Router, Vite configuration and heavy feature
components.\
**Likely backend areas:** None.\
**Likely database areas:** None.

**Dependencies:** Baseline build and bundle analysis.\
**Acceptance criteria:** Build succeeds; route chunks load correctly;
initial bundle improves without runtime regressions.

### 4.9 Loading, Empty & Error States

**What it does:** Makes every important network state understandable to
users.

**Additional work in RIO:** - Add feed and sidebar skeletons. - Design
empty-feed and no-suggestion states. - Add retry actions for recoverable
errors. - Prevent endless spinners and silent failures. - Keep error
messages useful without exposing internal details.

**Likely frontend areas:** Feed, suggestions, messages, profiles and
shared feedback components.\
**Likely backend areas:** Consistent error responses where needed.\
**Likely database areas:** None.

**Dependencies:** Existing API response/error conventions.\
**Acceptance criteria:** Loading, success, empty and failure states are
covered; retry works; no private implementation details leak.

### 4.10 Animation Optimization

**What it does:** Keeps animations smooth and avoids unnecessary CPU/GPU
use.

**Additional work in RIO:** - Audit Motion/GSAP and background network
animation. - Pause or reduce non-essential animation when the page is
hidden. - Respect `prefers-reduced-motion`. - Avoid expensive
layout-triggering animation and excessive simultaneous effects.

**Likely frontend areas:** Background canvas/animation, transitions and
interactive components.\
**Likely backend/database areas:** None.

**Dependencies:** Existing animation implementation.\
**Acceptance criteria:** Reduced-motion preference is honored;
background effects do not run unnecessarily; interactions remain
functional.

### 4.11 Theme Consistency

**What it does:** Makes dark and light themes consistent and readable.

**Additional work in RIO:** - Audit design tokens and duplicated color
values. - Standardize surfaces, borders, text, accent and interaction
states. - Check cards, forms, modals, sidebars and media controls in
both themes. - Preserve RIO's visual identity.

**Likely frontend areas:** Theme provider, global styles and all
affected UI components.\
**Likely backend/database areas:** None.

**Dependencies:** Existing theme mechanism and design tokens.\
**Acceptance criteria:** No unreadable text or inconsistent surfaces in
either theme; theme switching does not break component state.

### 4.12 Mobile Responsive Experience

**What it does:** Makes RIO practical on phones and tablets, not merely
a scaled desktop layout.

**Additional work in RIO:** - Use a single-column feed on mobile. - Add
a compact header and mobile bottom navigation where appropriate. -
Reflow or hide secondary sidebars without losing access to their
functionality. - Ensure cards, dialogs, carousels and touch targets work
at small widths. - Test common viewport sizes and avoid horizontal
overflow.

**Likely frontend areas:** Home layout, navigation, feed cards, messages
preview, suggestions and responsive styles.\
**Likely backend/database areas:** None unless mobile reveals API
payload issues.

**Dependencies:** Layout and navigation audit.\
**Acceptance criteria:** No horizontal overflow; key flows work at
mobile/tablet widths; touch targets and text remain usable.

------------------------------------------------------------------------

# 5. Selected scope --- Phase 2: Real-Time Infrastructure

**Goal:** Add reliable real-time communication while retaining existing
HTTP APIs for initial loading, history and recovery.

### 5.1 Socket.IO Integration

**What it does:** Adds a persistent event channel between the browser
and backend.

**Additional work in RIO:** - Audit current server bootstrap and
deployment support. - Add Socket.IO only if compatible with the hosting
environment. - Define event names and payload schemas. - Keep REST
endpoints for history, initial state and fallback. - Define connection
lifecycle and resource limits.

**Likely frontend areas:** Socket client/provider and
messaging/notification consumers.\
**Likely backend areas:** Server bootstrap, socket modules and event
handlers.\
**Likely database areas:** Usually none for the transport layer itself.

**Dependencies:** Authentication design, deployment support and event
contract.\
**Acceptance criteria:** Authenticated clients connect and disconnect
cleanly; REST behavior remains intact; malformed events are rejected.

### 5.2 Authenticated Socket Connections

**What it does:** Ensures a socket connection is associated with a
verified user and authorized resources.

**Additional work in RIO:** - Authenticate socket handshakes using the
existing secure authentication approach. - Validate session/token state
and expiry. - Authorize room joins server-side. - Never trust
client-supplied user IDs or conversation membership. - Revoke or
disconnect sockets when sessions are invalidated where feasible.

**Likely frontend areas:** Socket connection setup and reconnect
handling.\
**Likely backend areas:** Socket authentication middleware and room
authorization.\
**Likely database areas:** Session/user lookup as required.

**Dependencies:** Existing authentication/session model and Socket.IO
integration.\
**Acceptance criteria:** Unauthenticated connections are rejected; users
cannot join another user's private rooms; expired/revoked sessions lose
access.

### 5.3 Real-Time Messaging

**What it does:** Delivers new messages immediately without waiting for
periodic polling.

**Additional work in RIO:** - Send and receive validated message
events. - Persist messages server-side before acknowledging success. -
Reuse message authorization and conversation rules. - Support REST
history loading and socket live updates. - Avoid duplicate display when
REST and socket events overlap.

**Likely frontend areas:** Chat view, message list, composer and socket
event handlers.\
**Likely backend areas:** Message service, socket handlers and existing
REST routes.\
**Likely database areas:** Message and conversation models/indexes.

**Dependencies:** Authenticated sockets, existing message persistence
and conversation authorization.\
**Acceptance criteria:** Authorized participants receive persisted
messages in real time; reconnect/history does not duplicate messages.

### 5.4 Typing Indicators

**What it does:** Shows when another participant is currently typing.

**Additional work in RIO:** - Emit start/stop typing events. - Use
short-lived server-managed state or timeouts. - Limit event frequency. -
Clear indicators on disconnect, navigation and inactivity. - Do not
persist typing events as messages.

**Likely frontend areas:** Chat composer and conversation
header/status.\
**Likely backend areas:** Socket event validation and room
broadcasting.\
**Likely database areas:** None expected.

**Dependencies:** Authenticated sockets and conversation room
authorization.\
**Acceptance criteria:** Only authorized participants see indicators;
stale indicators clear automatically; typing events are rate-limited.

### 5.5 Online/Offline Presence

**What it does:** Shows connection presence without claiming that a
connected user is actively using the app.

**Additional work in RIO:** - Track active socket connections per
user/device. - Handle multiple devices and disconnects correctly. -
Define last-seen semantics and privacy controls. - Avoid marking a user
offline while another valid connection remains. - Treat presence as
approximate and transient.

**Likely frontend areas:** Profile status, chat list and conversation
header.\
**Likely backend areas:** Presence service and socket lifecycle
handlers.\
**Likely database areas:** Optional last-seen field only if product
requirements justify persistence; transient presence should not require
frequent database writes.

**Dependencies:** Authenticated sockets; privacy settings if available.\
**Acceptance criteria:** Multi-device presence is correct; disconnects
are handled; last-seen behavior is documented and privacy-aware.

### 5.6 Message Delivery Status

**What it does:** Communicates whether a message was sent, delivered and
read.

**Additional work in RIO:** - Define precise state transitions. -
Persist required delivery/read metadata. - Ensure read receipts are
authorized. - Avoid treating socket emission as proof of delivery. -
Synchronize status changes across devices.

**Likely frontend areas:** Message bubbles and conversation list.\
**Likely backend areas:** Message service and socket/REST status
handlers.\
**Likely database areas:** Message delivery/read fields or a suitable
receipt model and indexes.

**Dependencies:** Real-time messaging, multi-device identity and
existing message schema.\
**Acceptance criteria:** Status reflects server-confirmed transitions
and remains consistent after reload/reconnect.

### 5.7 Multi-Device Synchronization

**What it does:** Keeps the user's conversations and read state
consistent across their active devices.

**Additional work in RIO:** - Broadcast relevant events to all
authorized user sessions. - Reconcile messages and read receipts. - Use
stable event/message IDs. - Recover missed events through REST
synchronization. - Avoid echoing duplicate actions back to the
originating device incorrectly.

**Likely frontend areas:** Socket state and message cache
synchronization.\
**Likely backend areas:** User-session/socket registry and event
delivery.\
**Likely database areas:** Existing message/read-state storage.

**Dependencies:** Authenticated sockets, real-time messaging and
delivery/read semantics.\
**Acceptance criteria:** Sending or reading on one device updates other
devices; reconnect restores missed state without duplicates.

### 5.8 Real-Time Notifications

**What it does:** Delivers notification updates as events occur.

**Additional work in RIO:** - Emit events after the underlying
notification is successfully persisted. - Reuse the existing
notification model and API for history. - Validate recipient
authorization. - Handle unread counts and read state consistently. -
Avoid duplicate notification creation from retries.

**Likely frontend areas:** Notification bell, notification list and
unread badge.\
**Likely backend areas:** Notification service and socket event
delivery.\
**Likely database areas:** Notification model and recipient/unread
indexes.

**Dependencies:** Authenticated sockets and existing notification
persistence.\
**Acceptance criteria:** Persisted notifications appear promptly and
remain correct after refresh/reconnect.

### 5.9 Reconnection & Duplicate Prevention

**What it does:** Makes real-time features resilient to temporary
network loss.

**Additional work in RIO:** - Reconnect with bounded backoff. -
Re-authenticate after reconnect. - Use event IDs/idempotency keys for
retryable actions. - Fetch missed state after reconnect. - Handle
duplicate and out-of-order events safely.

**Likely frontend areas:** Socket lifecycle, cache reconciliation and
connection status.\
**Likely backend areas:** Idempotent event handling and synchronization
endpoints.\
**Likely database areas:** Unique identifiers/constraints where
persistence requires them.

**Dependencies:** All real-time features.\
**Acceptance criteria:** Network interruptions do not create duplicate
messages/actions or silently lose persisted updates.

### 5.10 Redis Socket Adapter

**What it does:** Allows multiple backend instances to share Socket.IO
events.

**Additional work in RIO:** - Confirm multi-instance deployment is
needed. - Configure Redis adapter and secure Redis connectivity. -
Define Redis availability/failure behavior. - Monitor memory and
connection usage. - Avoid adding Redis solely for hypothetical scale.

**Likely frontend areas:** None.\
**Likely backend areas:** Socket server and deployment configuration.\
**Likely database/infrastructure areas:** Redis service and operational
monitoring.

**Dependencies:** Socket.IO and a verified multi-instance deployment
requirement.\
**Acceptance criteria:** Events reach authorized clients connected to
different instances; Redis failure behavior is documented and tested.

------------------------------------------------------------------------

# 6. Selected scope --- Phase 3: Social Interactions & Moderation

**Goal:** Give users meaningful control over their interactions and
provide operational moderation tools.

### 6.1 Block Users

**What it does:** Prevents unwanted interactions between two accounts.

**Additional work in RIO:** - Add block/unblock actions. - Enforce
blocks in feed, profile, search, follow and messaging paths as product
rules require. - Prevent new interactions that violate a block. - Define
behavior for existing follows and conversations. - Ensure block state is
enforced by the backend.

**Likely frontend areas:** Profile actions, menus, search, feed and
messaging.\
**Likely backend areas:** Block service/model and authorization checks
across relevant endpoints.\
**Likely database areas:** Block relationship collection/model and
indexes.

**Dependencies:** Existing follow, profile and messaging authorization.\
**Acceptance criteria:** Block restrictions are enforced server-side
across all relevant interactions and cannot be bypassed by direct API
calls.

### 6.2 Mute Users

**What it does:** Lets a user suppress another account's content without
unfollowing or blocking them.

**Additional work in RIO:** - Add mute/unmute actions. - Apply mute
preferences to feed and optionally notifications. - Keep mute distinct
from block and unfollow. - Define whether muted users can still
interact.

**Likely frontend areas:** Profile menus, feed and notification
settings.\
**Likely backend areas:** Mute service and feed/notification filtering.\
**Likely database areas:** User-to-user mute relationship storage and
indexes.

**Dependencies:** Feed query behavior and notification model.\
**Acceptance criteria:** Muted content is suppressed according to
documented rules while allowed interactions remain intact.

### 6.3 Private Accounts

**What it does:** Lets users restrict profile content to approved
followers.

**Additional work in RIO:** - Add account privacy setting. - Enforce
privacy on profile, post, media and follower data endpoints. - Define
what unauthenticated/non-followers can see. - Avoid leaking private data
through search, suggestions or direct URLs.

**Likely frontend areas:** Privacy settings, profile states and follow
controls.\
**Likely backend areas:** User/profile/post authorization and response
filtering.\
**Likely database areas:** User privacy field and related indexes only
if needed.

**Dependencies:** Follow request workflow and post visibility rules.\
**Acceptance criteria:** Private data is inaccessible to non-approved
viewers through both UI and direct API requests.

### 6.4 Follow Requests

**What it does:** Lets private account owners approve or reject follow
attempts.

**Additional work in RIO:** - Create pending request state. - Add
approve/reject/cancel actions. - Prevent duplicate requests. - Notify
users about request state changes. - Convert approved requests into
normal follow relationships safely.

**Likely frontend areas:** Profile follow button, pending requests
screen and notifications.\
**Likely backend areas:** Follow request service and authorization.\
**Likely database areas:** Follow request model/collection, unique
constraints and status indexes.

**Dependencies:** Private accounts and existing follow relationship
model.\
**Acceptance criteria:** Requests transition correctly; only the target
account can approve/reject; duplicate or unauthorized transitions are
rejected.

### 6.5 Post Visibility Controls

**What it does:** Allows post authors to choose the audience for
individual posts.

**Additional work in RIO:** - Define supported visibility levels,
initially public and followers-only. - Enforce visibility on feed,
profile, direct post URL, search and media delivery. - Prevent private
media URL leakage where applicable. - Define behavior when follow
relationships change.

**Likely frontend areas:** Composer, post edit UI and visibility
indicators.\
**Likely backend areas:** Post read/write authorization and feed query
filters.\
**Likely database areas:** Post visibility field and query indexes where
justified.

**Dependencies:** Follow relationship and private-account
authorization.\
**Acceptance criteria:** Unauthorized users cannot retrieve restricted
post content through any API path.

### 6.6 User Mentions

**What it does:** Allows users to reference other RIO accounts using
@username.

**Additional work in RIO:** - Parse and validate mentions. - Resolve
usernames to stable user IDs. - Display clickable mention links. -
Create notifications according to privacy and block rules. - Prevent
duplicate notifications from edits/retries.

**Likely frontend areas:** Composer, caption rendering, comment
rendering and profile navigation.\
**Likely backend areas:** Mention parsing/validation and notification
creation.\
**Likely database areas:** Optional mention references or notification
records, depending on current design.

**Dependencies:** Username uniqueness, notification system and
block/privacy rules.\
**Acceptance criteria:** Mentions resolve correctly; invalid usernames
are handled; notification rules are enforced server-side.

### 6.7 Moderation Dashboard

**What it does:** Gives authorized administrators a central place to
review and act on moderation cases.

**Additional work in RIO:** - Audit whether report intake already
exists. - Build a queue for existing moderation/report records. - Show
relevant user/content context with privacy safeguards. - Support
authorized actions and record an audit trail. - Add filtering, status
and pagination.

**Likely frontend areas:** Admin-only routes, dashboard and moderation
detail views.\
**Likely backend areas:** Admin authorization, moderation endpoints and
action services.\
**Likely database areas:** Existing report/moderation records; add
indexes or fields only after audit.

**Dependencies:** Admin role model, report intake and audit logging.\
**Acceptance criteria:** Only authorized moderators can access the
dashboard or perform actions; every action is auditable.

### 6.8 Moderation Appeals

**What it does:** Lets affected users challenge moderation decisions.

**Additional work in RIO:** - Create appeal submission and status
workflow. - Associate appeal with the original moderation action. -
Prevent duplicate or invalid appeals. - Allow authorized reviewers to
respond. - Notify users of status changes.

**Likely frontend areas:** User appeal form/status view and moderator
review UI.\
**Likely backend areas:** Appeal workflow and authorization.\
**Likely database areas:** Appeal records, status history and indexes.

**Dependencies:** Moderation action records, admin roles and
notifications.\
**Acceptance criteria:** Users can appeal eligible decisions; only
authorized reviewers can resolve appeals; history is retained according
to policy.

### 6.9 Pinned Posts

**What it does:** Lets profile owners highlight selected posts.

**Additional work in RIO:** - Add pin/unpin actions for the post
owner. - Define pin limits and ordering. - Display pinned posts
distinctly on profiles. - Ensure deleted/private posts are not shown
incorrectly.

**Likely frontend areas:** Profile post grid/list and post action menu.\
**Likely backend areas:** Pin/unpin authorization and profile
retrieval.\
**Likely database areas:** Pin metadata or a separate relation,
depending on current post model.

**Dependencies:** Existing post ownership and profile feed behavior.\
**Acceptance criteria:** Only the owner can pin/unpin; configured limits
are enforced; pinned ordering is stable.

### 6.10 Interaction Privacy Controls

**What it does:** Gives users control over who may comment, mention,
message or otherwise interact with them.

**Additional work in RIO:** - Define clear audience options for each
interaction type. - Add settings UI and validation. - Enforce settings
in the backend on every relevant endpoint. - Provide understandable
feedback when an action is restricted.

**Likely frontend areas:** Privacy settings, comment composer, mention
UI and messaging entry points.\
**Likely backend areas:** Shared interaction authorization policies.\
**Likely database areas:** User privacy preference fields or settings
model.

**Dependencies:** Existing privacy, block, follow and messaging rules.\
**Acceptance criteria:** Settings are enforced server-side consistently
and cannot be bypassed through direct requests.

------------------------------------------------------------------------

# 7. Selected scope --- Phase 4: Media & Content Creation

**Goal:** Make publishing easier, more expressive and reliable across
images, stories and video.

### 7.1 Rich Post Composer

**What it does:** Provides a more capable interface for composing posts.

**Additional work in RIO:** - Create a clear composition flow. - Improve
caption editing and media preview. - Show selected media and validation
feedback. - Reuse the existing post creation service and upload
pipeline. - Keep accessibility and mobile usability in scope.

**Likely frontend areas:** Composer modal/page, media picker and post
preview.\
**Likely backend areas:** Existing post creation and upload endpoints.\
**Likely database areas:** Existing post schema unless a justified field
is required.

**Dependencies:** Existing post creation flow and upload security.\
**Acceptance criteria:** Users can compose and publish without duplicate
implementations or regressions to existing posting.

### 7.2 Post Drafts

**What it does:** Lets users save unfinished posts and return later.

**Additional work in RIO:** - Create draft save/list/load/delete
behavior. - Keep drafts private to their owner. - Define which media
references can be retained safely. - Prevent drafts from appearing in
public feeds.

**Likely frontend areas:** Composer, draft list and resume-draft flow.\
**Likely backend areas:** Draft endpoints and ownership authorization.\
**Likely database areas:** Draft model/collection or a carefully scoped
post status, based on current schema.

**Dependencies:** Rich composer, authentication and media lifecycle.\
**Acceptance criteria:** Only the owner can access drafts; drafts never
appear as published content; deletion/cleanup works.

### 7.3 Draft Autosave

**What it does:** Automatically saves draft changes to reduce accidental
content loss.

**Additional work in RIO:** - Debounce autosave. - Show
saving/saved/error state. - Handle offline/network failures and
conflicting updates. - Avoid saving every keystroke as a separate
request. - Ensure autosave cannot accidentally publish.

**Likely frontend areas:** Composer state and autosave status.\
**Likely backend areas:** Draft update endpoint with safe update
semantics.\
**Likely database areas:** Draft updatedAt/version fields if required.

**Dependencies:** Draft persistence and rich composer.\
**Acceptance criteria:** Changes are saved reliably; failures are
visible; stale updates do not silently overwrite newer content.

### 7.4 Image Drag-and-Drop Reordering

**What it does:** Lets users control the order of multiple images in a
post carousel.

**Additional work in RIO:** - Add drag-and-drop and accessible
alternative controls. - Update preview order before submission. -
Preserve order in the persisted post. - Ensure upload completion order
does not change selected order.

**Likely frontend areas:** Media picker and carousel preview.\
**Likely backend areas:** Post media ordering validation.\
**Likely database areas:** Ordered media array or explicit order
metadata.

**Dependencies:** Multi-image upload and rich composer.\
**Acceptance criteria:** Display order matches user-selected order after
publishing and reloading.

### 7.5 Image Cropping & Editing

**What it does:** Lets users adjust how images are framed before
publishing.

**Additional work in RIO:** - Provide crop/position controls and
supported aspect ratios. - Preview the final composition. - Preserve
original media when required by the product design. - Validate image
dimensions and avoid excessive client memory use.

**Likely frontend areas:** Image editor/crop interface and preview.\
**Likely backend areas:** Upload validation and optional transformation
pipeline.\
**Likely database areas:** Optional crop metadata only if needed.

**Dependencies:** Upload pipeline, media constraints and composer.\
**Acceptance criteria:** Cropped preview matches published output;
unsupported or oversized inputs fail gracefully.

### 7.6 Upload Progress & Retry

**What it does:** Shows users upload progress and provides recovery from
transient failures.

**Additional work in RIO:** - Display per-file progress where
supported. - Support retry without duplicating published posts or
media. - Handle cancellation and partial failure. - Clean up abandoned
temporary uploads. - Keep upload authorization and file validation
intact.

**Likely frontend areas:** Upload manager, composer and progress UI.\
**Likely backend areas:** Upload endpoints, temporary upload handling
and idempotency.\
**Likely database/infrastructure areas:** Temporary upload metadata only
if required; Cloudinary cleanup process.

**Dependencies:** Existing Cloudinary integration and upload security.\
**Acceptance criteria:** Progress is truthful; retries do not create
duplicate posts/assets; failed uploads can be recovered or cleaned
safely.

### 7.7 Public Post Sharing URLs

**What it does:** Gives eligible public posts a stable URL that can be
shared outside RIO.

**Additional work in RIO:** - Add a stable post route. - Enforce post
visibility and account privacy on direct access. - Add appropriate
metadata for link previews. - Handle deleted or unavailable posts
gracefully. - Avoid exposing private content through preview metadata or
cached responses.

**Likely frontend areas:** Post detail route, share action and metadata
handling.\
**Likely backend areas:** Public post retrieval and access policy.\
**Likely database areas:** Existing post ID/slug strategy; no extra
field unless required.

**Dependencies:** Post visibility and private-account rules.\
**Acceptance criteria:** Public posts are shareable; restricted posts
remain restricted through direct URLs and previews.

### 7.8 Stories

**What it does:** Adds temporary media/content that expires after 24
hours.

**Additional work in RIO:** - Create story creation and viewing flows. -
Track creation and expiry timestamps. - Enforce expiry on reads, not
only by hiding the UI. - Define viewer privacy and view tracking
rules. - Clean up expired media safely.

**Likely frontend areas:** Story tray, viewer, composer and profile
story indicators.\
**Likely backend areas:** Story endpoints, authorization and expiry
handling.\
**Likely database areas:** Story model/collection, expiry indexes and
viewer records if required.

**Dependencies:** Media upload pipeline, privacy/block rules and cleanup
jobs.\
**Acceptance criteria:** Stories expire according to server time;
expired stories cannot be retrieved; viewer access respects privacy.

### 7.9 Video Upload & Playback

**What it does:** Expands posts to support video media.

**Additional work in RIO:** - Define supported formats, size and
duration limits. - Add upload validation and processing. -
Generate/serve thumbnails and optimized playback variants where
supported. - Provide responsive playback controls and loading/error
states. - Protect against abusive resource consumption.

**Likely frontend areas:** Video picker, post media renderer and
playback UI.\
**Likely backend areas:** Upload validation, processing orchestration
and media metadata.\
**Likely database areas:** Media type, duration, dimensions, processing
status and relevant indexes.

**Dependencies:** Upload security, media processing and storage limits.\
**Acceptance criteria:** Supported videos upload and play reliably;
unsupported/oversized files are rejected safely; processing failures are
visible and recoverable.

### 7.10 Media Processing Optimization

**What it does:** Improves media delivery, storage use and cleanup
reliability.

**Additional work in RIO:** - Audit Cloudinary transformations and
delivery settings. - Standardize responsive image variants and
quality/format settings. - Avoid repeated processing where possible. -
Track upload/processing status where needed. - Reconcile orphaned assets
and retry failed cleanup safely.

**Likely frontend areas:** Media URL selection and responsive image
components.\
**Likely backend areas:** Upload service, transformation configuration
and cleanup jobs.\
**Likely database/infrastructure areas:** Media metadata, cleanup
tracking and Cloudinary configuration.

**Dependencies:** Existing Cloudinary architecture and upload
lifecycle.\
**Acceptance criteria:** Media is delivered efficiently; cleanup is
auditable and retryable; no valid user media is deleted by
reconciliation.

------------------------------------------------------------------------

# 8. Selected scope --- Phase 7: Production & Scalability

**Goal:** Make the application observable, testable, recoverable and
ready for measured growth.

### 8.1 Sentry Monitoring

**What it does:** Captures application errors that occur in real usage.

**Additional work in RIO:** - Configure frontend and backend error
reporting. - Filter secrets and sensitive personal/message data. - Add
environment and release identifiers. - Set source-map handling
securely. - Define alert ownership and noise controls.

**Likely frontend areas:** App initialization and error boundaries.\
**Likely backend areas:** Express error handling and process-level error
reporting.\
**Likely infrastructure areas:** Sentry project/environment
configuration.

**Dependencies:** Environment configuration and privacy review.\
**Acceptance criteria:** Test errors are captured with useful context
and no secrets or private content are leaked.

### 8.2 Structured Logging

**What it does:** Makes production behavior easier to search and
diagnose.

**Additional work in RIO:** - Standardize JSON logs and severity
levels. - Add request/correlation IDs. - Log relevant operational events
and failures. - Redact tokens, passwords, cookies and private message
bodies. - Define retention and log access.

**Likely frontend areas:** Minimal client diagnostics if required.\
**Likely backend areas:** Logger, request middleware and services.\
**Likely infrastructure areas:** Log collection and retention.

**Dependencies:** Existing logging and deployment environment.\
**Acceptance criteria:** Requests can be traced across relevant
services; sensitive values are redacted; logs are structured and useful.

### 8.3 Swagger/OpenAPI

**What it does:** Documents the API contract in a machine-readable and
browsable format.

**Additional work in RIO:** - Document routes, parameters,
request/response schemas and errors. - Document cookie authentication
and CSRF expectations. - Keep docs aligned with implementation. -
Restrict or protect interactive docs if necessary.

**Likely frontend areas:** None.\
**Likely backend areas:** Route schemas and OpenAPI
generation/documentation.\
**Likely database areas:** None.

**Dependencies:** API inventory and validation schemas.\
**Acceptance criteria:** Selected APIs are accurately documented and
examples do not expose secrets or real private data.

### 8.4 Zod Validation Standardization

**What it does:** Establishes consistent input validation at application
boundaries.

**Additional work in RIO:** - Audit current validation. - Define
reusable schemas for request bodies, query parameters and route
parameters. - Return consistent validation errors. - Share types/schemas
only where the project structure supports it cleanly. - Keep
authorization separate from input validation.

**Likely frontend areas:** Forms and typed API contracts where useful.\
**Likely backend areas:** Validation middleware and route handlers.\
**Likely database areas:** None directly.

**Dependencies:** Existing validation conventions and API error format.\
**Acceptance criteria:** Untrusted input is validated consistently;
malformed input is rejected before business logic; error format remains
compatible.

### 8.5 GitHub Actions CI/CD

**What it does:** Automates repeatable checks before changes are merged
or deployed.

**Additional work in RIO:** - Inspect existing workflows and deployment
process. - Run tests, lint and builds on pull requests. - Use protected
secrets and least-privilege permissions. - Separate verification from
production deployment. - Add controlled deployment gates only with owner
approval.

**Likely frontend/backend areas:** Existing scripts and test commands.\
**Likely infrastructure areas:** GitHub Actions workflows and repository
settings.

**Dependencies:** Reliable scripts, test suite and deployment policy.\
**Acceptance criteria:** Pull requests receive repeatable automated
checks; secrets are protected; production deployment is not triggered
unexpectedly.

### 8.6 k6 Load Testing

**What it does:** Measures endpoint behavior under controlled concurrent
traffic.

**Additional work in RIO:** - Identify critical endpoints and realistic
user flows. - Create bounded load scenarios for feed, auth and
messaging. - Define latency/error thresholds based on observed
baseline. - Avoid testing production without explicit permission. -
Document bottlenecks and test environment assumptions.

**Likely frontend areas:** None.\
**Likely backend areas:** Tested endpoints and performance
instrumentation.\
**Likely infrastructure areas:** Isolated test environment and k6
scripts.

**Dependencies:** Stable test environment and baseline metrics.\
**Acceptance criteria:** Repeatable tests report latency, throughput and
error rates without damaging production data/services.

### 8.7 Automated Database Backups

**What it does:** Protects application data against accidental loss and
operational failure.

**Additional work in RIO:** - Audit current MongoDB backup capabilities
and provider configuration. - Define backup frequency, retention and
access control. - Encrypt backups where supported. - Monitor backup
success/failure. - Document restore ownership and procedure.

**Likely frontend areas:** None.\
**Likely backend areas:** Usually none, except operational hooks if
required.\
**Likely database/infrastructure areas:** MongoDB backup configuration,
storage and credentials.

**Dependencies:** Hosting/provider capabilities and retention
requirements.\
**Acceptance criteria:** Backups run on schedule, are access-controlled
and have verifiable success records.

### 8.8 Database Recovery Testing

**What it does:** Proves that backups can actually be restored.

**Additional work in RIO:** - Restore a backup into an isolated
environment. - Validate expected collections, indexes and representative
records. - Check application compatibility with restored data. -
Document recovery time and gaps. - Never overwrite production during a
test.

**Likely frontend areas:** None.\
**Likely backend areas:** Compatibility checks and smoke tests.\
**Likely database/infrastructure areas:** Isolated restore environment
and recovery scripts.

**Dependencies:** Automated backups and a safe test environment.\
**Acceptance criteria:** A documented restore drill succeeds and data
integrity checks pass.

### 8.9 Cloudinary Cleanup Reconciliation

**What it does:** Finds media assets that are no longer referenced by
valid application records.

**Additional work in RIO:** - Audit all upload/delete paths and media
references. - Build a dry-run reconciliation report first. - Identify
candidate orphan assets conservatively. - Require safe
ownership/reference checks before deletion. - Add retryable cleanup and
audit records. - Keep a recovery window where practical.

**Likely frontend areas:** Upload/delete feedback only if needed.\
**Likely backend areas:** Media lifecycle and cleanup jobs.\
**Likely database/infrastructure areas:** Media references, cleanup
records and Cloudinary API configuration.

**Dependencies:** Media processing and deletion semantics.\
**Acceptance criteria:** Dry-run identifies candidates; valid referenced
assets are never deleted; cleanup failures are retryable and auditable.

### 8.10 Accessibility Audit

**What it does:** Makes core RIO workflows usable with keyboards,
assistive technologies and varied accessibility needs.

**Additional work in RIO:** - Audit semantic HTML, labels, focus order
and contrast. - Verify dialogs, menus, carousels and notifications. -
Support keyboard interaction and visible focus. - Respect reduced-motion
settings. - Add automated checks plus manual verification.

**Likely frontend areas:** Shared components and all core pages.\
**Likely backend/database areas:** None.

**Dependencies:** UI inventory and component conventions.\
**Acceptance criteria:** Core journeys are keyboard-operable; controls
have accessible names; critical contrast and focus issues are addressed.

### 8.11 Performance Monitoring

**What it does:** Measures real application speed and reliability over
time.

**Additional work in RIO:** - Define key frontend and backend
performance indicators. - Track API latency, error rates and frontend
loading metrics. - Add request correlation where useful. - Establish
baseline and alert thresholds. - Avoid collecting unnecessary personal
data.

**Likely frontend areas:** Performance instrumentation and route
loading.\
**Likely backend areas:** Request metrics and service instrumentation.\
**Likely infrastructure areas:** Metrics collection and dashboards.

**Dependencies:** Structured logging, monitoring platform and
environment access.\
**Acceptance criteria:** Key metrics are visible, thresholds are
documented and instrumentation does not expose sensitive data.

### 8.12 Deployment Rollback Strategy

**What it does:** Provides a safe way to recover from a bad release.

**Additional work in RIO:** - Document release and rollback steps. - Use
compatible database migration practices. - Define frontend/backend
version compatibility. - Preserve required environment configuration. -
Test rollback in a non-production environment.

**Likely frontend/backend areas:** Build and release configuration.\
**Likely database/infrastructure areas:** Migration strategy, deployment
versions and release records.

**Dependencies:** Existing deployment workflow and migration inventory.\
**Acceptance criteria:** A rollback procedure is documented and tested
without destructive database reversal.

### 8.13 Redis Caching

**What it does:** Reduces repeated expensive operations where
measurement shows caching is beneficial.

**Additional work in RIO:** - Profile candidate endpoints before
introducing cache. - Select safe, low-risk data to cache. - Define TTL,
invalidation and cache key strategy. - Never share private user-specific
data across users. - Define behavior when Redis is unavailable. -
Monitor memory and cache hit rates.

**Likely frontend areas:** Usually none.\
**Likely backend areas:** Cache service and selected read paths.\
**Likely infrastructure areas:** Redis deployment, credentials and
monitoring.

**Dependencies:** Measured bottleneck, cache invalidation design and
operational need.\
**Acceptance criteria:** Cache improves measured performance without
stale privacy-sensitive data or making Redis a single point of failure.

------------------------------------------------------------------------

# 9. Selected scope --- Phase 8: Data Ownership & Federation

**Goal:** Give users control over their data and establish a clear
foundation for portability.

### 9.1 User Data Export

**What it does:** Lets a user download a structured copy of their
eligible account data.

**Additional work in RIO:** - Define included data categories and
exclusions. - Export the requesting user's own profile and eligible
activity. - Enforce authentication and re-authentication for sensitive
exports where appropriate. - Generate a bounded, secure downloadable
archive or JSON file. - Prevent export URLs from being publicly
guessable.

**Likely frontend areas:** Account settings, export request and download
status.\
**Likely backend areas:** Export service, authorization and job handling
if asynchronous.\
**Likely database areas:** User-owned records and relationship
traversal.

**Dependencies:** Data inventory, privacy model and retention policy.\
**Acceptance criteria:** Users can export only their own eligible data;
export is complete according to documented scope and securely delivered.

### 9.2 Downloadable Media Archive

**What it does:** Lets users obtain copies of their uploaded media.

**Additional work in RIO:** - Identify media owned by the requesting
user. - Package eligible originals or documented available variants. -
Use time-limited secure download access. - Handle large archives
asynchronously if necessary. - Avoid including media the user does not
own or is not authorized to export.

**Likely frontend areas:** Export settings and archive status/download
UI.\
**Likely backend areas:** Archive job and secure download service.\
**Likely database/infrastructure areas:** Media ownership references,
temporary storage and Cloudinary access.

**Dependencies:** User data export, media inventory and secure
job/storage strategy.\
**Acceptance criteria:** Archive contains only authorized user media;
downloads expire securely; large jobs do not block normal API requests.

### 9.3 Account Deletion & Retention Policy

**What it does:** Defines what happens to user data when an account is
deleted and what must be retained for legitimate operational or legal
reasons.

**Additional work in RIO:** - Inventory user-owned and user-associated
data. - Define deletion, anonymization and retention behavior. -
Document treatment of messages involving other users, backups,
moderation/audit records and media. - Make deletion workflows retryable
and observable. - Explain the policy clearly to users.

**Likely frontend areas:** Account deletion flow and policy/help page.\
**Likely backend areas:** Deletion orchestration and cleanup services.\
**Likely database/infrastructure areas:** Related collections, backups,
retention configuration and Cloudinary assets.

**Dependencies:** Account deletion implementation, data export and audit
requirements.\
**Acceptance criteria:** Deletion behavior is documented, consistent and
testable; retained data has a defined reason and retention period;
partial failures can be retried.

------------------------------------------------------------------------

# 10. Cross-phase dependencies and recommended order

Do not implement in the numerical phase order blindly. Follow actual
prerequisites and avoid building dependent features on unstable
foundations.

A likely dependency-aware sequence is:

1.  **Repository and security audit** --- verify authentication,
    authorization, API contracts, models, uploads and deployment
    constraints.
2.  **Feed and data correctness** --- feed refresh behavior, pagination
    contract, query analysis and evidence-based indexes.
3.  **Shared frontend data patterns** --- evaluate server-state
    strategy, request deduplication and error/loading conventions.
4.  **Core Home experience** --- suggestions/messages previews,
    optimistic follow behavior, lazy loading, responsive layout, themes
    and animation improvements.
5.  **Real-time foundation** --- socket architecture, authentication,
    room authorization and event contracts.
6.  **Real-time messaging and notifications** --- persistence-first
    message events, typing, presence, read/delivery status and
    multi-device synchronization.
7.  **Reliability across connections** --- reconnect recovery,
    idempotency and duplicate prevention.
8.  **Social privacy foundation** --- block/mute, private accounts,
    follow requests, visibility and interaction controls.
9.  **Social workflows** --- mentions, pinned posts, moderation
    dashboard and appeals.
10. **Media creation foundation** --- rich composer, upload lifecycle,
    drafts and autosave.
11. **Media enhancements** --- reordering, cropping, progress/retry,
    sharing, stories, video and processing optimization.
12. **Production operations** --- logging, monitoring, API docs,
    validation, CI, load testing, backups, restore drills, cleanup
    reconciliation, accessibility and rollback.
13. **Measured scaling** --- introduce Redis caching or Socket.IO Redis
    adapter only when the audit or measurements justify them.
14. **Data ownership** --- export, media archive and deletion/retention
    policy.

The audit may change this order. Explain why before proposing a
different sequence.

------------------------------------------------------------------------

# 11. Required audit report format

For every selected improvement, provide a row with these columns:

  -----------------------------------------------------------------------
  Field                               Required content
  ----------------------------------- -----------------------------------
  Improvement                         Exact name from this document

  Status                              Already implemented / Partially
                                      implemented / Not implemented /
                                      Needs verification

  Priority                            P0 / P1 / P2 / P3

  Evidence                            Exact file paths, symbols and line
                                      references where practical

  Current behavior                    What the application does today

  Gap                                 What is missing, unsafe or
                                      unreliable

  Frontend impact                     Pages, components, hooks or state

  Backend impact                      Routes, controllers, services or
                                      middleware

  Database impact                     Models, fields, indexes or
                                      migrations

  Dependencies                        Required prior work

  Risk                                Security, compatibility,
                                      performance or operational risk

  Acceptance checks                   How completion will be verified
  -----------------------------------------------------------------------

Also include:

-   **Do not change:** Existing behavior that must remain intact.
-   **Decisions needed:** Questions only the project owner can answer.
-   **Not in scope:** Features not selected in this document.
-   **Safe implementation boundaries:** What must not be touched without
    additional approval.

## 12. Final instruction to OpenCode

Begin by inspecting the repository thoroughly. Use read-only commands
and searches. Do not modify the working tree.

Compare every selected requirement against the actual implementation. Do
not assume that the feature is missing, and do not assume that an
existing UI means the backend behavior is secure or complete.

Return the complete audit report and an ordered, dependency-aware master
roadmap. Clearly distinguish verified facts from assumptions and
recommendations.

**STOP after presenting the audit. Wait for the project owner's explicit
approval before editing any file or taking any implementation action.**
