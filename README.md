# rio-social-platform

A full-stack social media platform built with React (Vite), Express, and MongoDB.

## Features

- **Auth** — register/login/logout with JWT (http-only cookies), bcrypt hashing, rate limiting, forgot/reset/change password
- **Profiles** — bio, avatar, cover image, followers/following counts, private accounts
- **Posts** — create/edit/delete, images, hashtags (auto-extracted), bookmarks, search
- **Comments** — nested replies (depth ≤ 3) with likes, edit, delete
- **Follow system** — follow/unfollow, follower/following lists
- **Notifications** — auto-generated for likes, comments, replies, follows (no self-notifications)
- **Messaging** — 1:1 conversations, real-time-feel chat pane
- **Image uploads** — avatar/cover/post images via multer (JPEG/PNG/GIF/WebP, 5MB max)

## Tech Stack

| Layer    | Tech                                      |
|----------|-------------------------------------------|
| Frontend | React 19, Vite, React Router, lucide-react |
| Backend  | Node.js, Express 5, Mongoose              |
| Database | MongoDB                                    |
| Auth     | JWT + bcrypt + http-only cookies           |

## Project Structure

```
project-1/
├── client/          # React frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── services/   # api.js — all endpoints
│   │   └── styles/
│   └── index.html
├── server/          # Express backend
│   ├── config/      # db, upload (multer)
│   ├── controllers/
│   ├── middleware/  # auth, error, rate-limit
│   ├── models/      # User, Post, Comment, Notification, Conversation, Message
│   ├── routes/
│   ├── uploads/     # uploaded images (gitignored)
│   ├── app.js
│   └── server.js
├── run_tests.js     # spawns a fresh server per test suite
└── test_*.js        # 170 backend tests
```

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB running locally (or a connection string)

### 1. Clone & install

```bash
git clone https://github.com/TheCollegeProgrammer/rio-social-platform.git
cd rio-social-platform

# Backend
cd server && npm install

# Frontend
cd ../client && npm install
```

### 2. Configure environment

Create `server/.env`:

```
PORT=3000
MONGO_URI=mongodb://localhost:27017/social_media_app
JWT_SECRET=your-secret-here
```

### 3. Seed demo data (optional)

```bash
cd server
npm run seed
```

Creates 10 demo users with a follow graph. Log in with `<username>@demo.com` / `pass1234`
(e.g. `aria_strings@demo.com`).

### 4. Run

```bash
# Terminal 1 — backend (http://localhost:3000)
cd server
npm run dev

# Terminal 2 — frontend (http://localhost:5173)
cd client
npm run dev
```

## Testing

170 backend tests across 4 suites, run via Node.js `http` scripts:

```bash
node run_tests.js
```

Spins up a fresh server (with `NODE_ENV=test`) for each suite and runs:
`test_m1` (auth), `test_m234` (profile/posts/comments/follows), `test_m56` (notifications/messaging), `test_images` (uploads).

## API Overview

Base URL: `http://localhost:3000/api`

| Group           | Endpoints                                                                 |
|-----------------|---------------------------------------------------------------------------|
| Auth            | `POST /auth/register`, `/login`, `/logout`, `GET /auth/me`, forgot/reset/change password |
| Posts           | `GET/POST /posts`, `GET/PUT/DELETE /posts/:id`, like, bookmark, search    |
| Comments        | `GET/POST /posts/:id/comments`, edit/delete, like, replies                |
| Profiles        | `GET/PUT /profile`, `GET /profile/:id`, search, delete account            |
| Users/Follows   | `POST /users/:id/follow`, `GET /users/:id/followers`/`following`          |
| Notifications   | `GET /notifications`, mark read, mark all read, delete                    |
| Messaging       | `GET /messages`, `GET/POST /messages/:id/messages`, get-or-create convo   |
| Uploads         | `POST /upload/avatar`, `/upload/cover`, `POST /posts/:id/image`           |

Errors return `{ "errors": ["message"] }`; success returns `{ "message": "...", ... }`.

## License

ISC
