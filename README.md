# Team Task Tracker API

A production-grade REST API for managing tasks within a team. Built with Node.js + TypeScript, Express, MongoDB (Mongoose), Redis, and Docker.

## Features

- **JWT Authentication** — Access token (15min) + Refresh token rotation (7d), tokens stored hashed
- **Role-Based Access Control** — ADMIN / MANAGER / MEMBER, enforced at middleware level only
- **Task State Machine** — Server-enforced status transitions: `TODO → IN_PROGRESS → IN_REVIEW → DONE`, `BLOCKED` reachable from any active state
- **Redis Caching** — Per-assignee task list caching with SCAN-based invalidation
- **Paginated & Filtered Task List** — Filter by status, priority, assignee; paginate with page/limit
- **Analytics** — Overdue task count per user + average completion time
- **Swagger UI** — Interactive API docs at `/api/docs`
- **Docker** — Single `docker compose up` — no manual setup required

---

## Quick Start

### Option 1: Docker (Recommended)

```bash
# 1. Clone the repo
git clone <repo-url>
cd task-tracker

# 2. Copy environment file (Docker overrides DB/Redis URLs automatically)
cp .env.example .env

# 3. Start everything
docker compose up

# API is ready at http://localhost:3000
# Swagger docs at http://localhost:3000/api/docs
```

**First run automatically:**
- Seeds demo users (see credentials below)

### Option 2: Local Development

```bash
# Prerequisites: MongoDB + Redis running locally

cp .env.example .env
# Edit .env with your local MongoDB/Redis URLs

npm install
npm run db:seed          # Seed demo data
npm run dev              # Start dev server with hot reload
```

---

## Demo Credentials (after seed)

| Role    | Email               | Password    |
|---------|---------------------|-------------|
| ADMIN   | admin@demo.com      | Admin123    |
| MANAGER | manager@demo.com    | Manager123  |
| MEMBER  | member@demo.com     | Member123   |

---

## API Reference

Full interactive docs: **`http://localhost:3000/api/docs`**

### Auth

| Method | Endpoint              | Access  | Description                         |
|--------|-----------------------|---------|-------------------------------------|
| POST   | `/api/auth/register`  | Public  | Register org + first ADMIN user     |
| POST   | `/api/auth/login`     | Public  | Login, receive access + refresh token |
| POST   | `/api/auth/refresh`   | Public  | Rotate refresh token                |
| POST   | `/api/auth/logout`    | Auth    | Revoke refresh token                |

### Users

| Method | Endpoint              | Roles          |
|--------|-----------------------|----------------|
| GET    | `/api/users`          | ADMIN          |
| GET    | `/api/users/:id`      | ADMIN, MANAGER |
| PATCH  | `/api/users/:id/role` | ADMIN          |
| DELETE | `/api/users/:id`      | ADMIN          |

### Projects

| Method | Endpoint           | Roles                    |
|--------|--------------------|--------------------------|
| GET    | `/api/projects`    | All                      |
| POST   | `/api/projects`    | ADMIN, MANAGER           |
| GET    | `/api/projects/:id`| All                      |
| PATCH  | `/api/projects/:id`| ADMIN, MANAGER           |
| DELETE | `/api/projects/:id`| ADMIN                    |

### Tasks

| Method | Endpoint                  | Roles                       |
|--------|---------------------------|-----------------------------|
| GET    | `/api/tasks`              | All (MEMBER sees own only)  |
| POST   | `/api/tasks`              | ADMIN, MANAGER              |
| GET    | `/api/tasks/:id`          | All (MEMBER sees own only)  |
| PATCH  | `/api/tasks/:id`          | All (MEMBER updates own only)|
| PATCH  | `/api/tasks/:id/status`   | Assignee, MANAGER, ADMIN    |
| DELETE | `/api/tasks/:id`          | ADMIN                       |

**Query params for GET /api/tasks:**
```
?page=1&limit=20&status=IN_PROGRESS&priority=HIGH&assigneeId=<uuid>&projectId=<uuid>
```

### Analytics

| Method | Endpoint                  | Roles           |
|--------|---------------------------|-----------------|
| GET    | `/api/analytics/overdue`  | ADMIN, MANAGER  |

---

## Error Response Format

All errors follow a consistent shape:

```json
{
  "status": 400,
  "code": "VALIDATION_ERROR",
  "message": "due_date must be a future date"
}
```

Common error codes: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `INVALID_STATUS_TRANSITION`, `INVALID_CREDENTIALS`, `INSUFFICIENT_PERMISSIONS`

---

## Status Transition Rules

```
TODO ──→ IN_PROGRESS ──→ IN_REVIEW ──→ DONE
  ↘           ↘              ↘
  BLOCKED   BLOCKED         BLOCKED
               ↓
         (can resume: BLOCKED → TODO or IN_PROGRESS)
```

Only the **task assignee**, a **MANAGER**, or **ADMIN** can transition status. The server validates all transitions — you cannot jump directly from TODO to DONE.

---

## Caching Strategy

### What is cached
| Cache Key Pattern | TTL | Content |
|---|---|---|
| `cache:tasks:org:{orgId}:assignee:{id}:p{page}:l{limit}:{filters}` | 5 min | Paginated task list |
| `cache:task:{taskId}` | 10 min | Individual task |

### Invalidation Strategy
Cache invalidation uses **Redis SCAN** (never `KEYS *`) to find and delete matching patterns:

- **On task create/update/delete**: Invalidates all `cache:tasks:org:{orgId}:*` keys (all paginated list variants for that org)
- **On assignee change**: Additionally invalidates the old and new assignee's list cache keys
- **On status change**: Invalidates `cache:task:{taskId}` + all list caches for the org

**Why per-assignee caching?** Scoping cache keys to the assignee reduces invalidation surface area — only the affected users' cached lists need clearing rather than the entire org's cache on every update.

---

## Database Design Decisions

### Schema

```
Organization 1──* User
Organization 1──* Project
Organization 1──* Task
Project       1──* Task
User          1──* Task (as assignee)
User          1──* Task (as creator)
User          1──* RefreshToken
```

### Indexes

| Table | Index | Reason |
|-------|-------|--------|
| `tasks` | `status` | Filtering tasks by status in list endpoint |
| `tasks` | `assignee_id` | Per-assignee cache lookups + MEMBER scope filtering |
| `tasks` | `due_date` | Sorting by due date + analytics overdue query |
| `tasks` | `(org_id, status)` | Composite: org-scoped status filtering (most common query) |
| `tasks` | `(org_id, assignee_id)` | Composite: matches cache key structure exactly |
| `users` | `email` | Unique login lookup |
| `refresh_tokens` | `token` | O(1) token validation lookup |

**Design Decision: Composite indexes on `(org_id, status)` and `(org_id, assignee_id)`**

All queries are scoped to an `org_id`. A single-column index on `status` or `assignee_id` would require PostgreSQL to also filter on `org_id` separately. The composite indexes match the WHERE clause structure of the most frequent queries exactly, enabling index-only scans and dramatically reducing rows examined for large organizations.

### Refresh Token Storage

Refresh tokens are stored **hashed (SHA-256)** in the database. Even if the database is compromised, raw tokens cannot be extracted. This mirrors how passwords are stored — you never store secrets in plaintext.

---

## Running Tests

```bash
# Requires a running PostgreSQL and Redis (or use .env.test)
npm test

# With coverage
npm run test:coverage
```

Tests cover:
1. **Auth flow** — register, duplicate email, login, wrong password, token refresh rotation, revoked token rejection
2. **Task status transitions** — valid transitions, invalid jumps (e.g., TODO→DONE), MEMBER access control, full happy path

---

## What I Would Improve Given More Time

1. **WebSocket/SSE notifications** — Real-time push when a task's status changes to the assignee
2. **Invite system** — Email-based org invitations instead of direct user creation by ADMIN
3. **Audit log** — Immutable event log for all task changes (who changed what, when)
4. **Refresh token family tracking** — Detect token reuse attacks (if a stolen+revoked token is used, invalidate all tokens for that user)
5. **Request tracing** — Correlation IDs on all log lines + distributed tracing (OpenTelemetry)
6. **Background jobs** — Periodic cleanup of expired refresh tokens (Bull queue)
7. **Full test suite** — E2E tests for all RBAC permission boundaries, not just 2 critical flows
8. **Frontend** — React task board with drag-and-drop status columns

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 + TypeScript |
| Framework | Express.js |
| Database | MongoDB 7 + Mongoose |
| Cache | Redis 7 (ioredis) |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Validation | Zod |
| Docs | Swagger UI (swagger-jsdoc) |
| Testing | Jest + Supertest |
| Containerization | Docker + docker-compose |
| Logging | Winston |
| Security | Helmet, CORS, express-rate-limit |
