# Document 02: System Architecture

## 1. High-Level Architecture Overview

The Identity Provider (IdP) system is engineered as a decoupled, layered micro-architecture. The server is completely stateless, relying on **PostgreSQL** for durable relational data (Users, Clients, Grants) and **Redis** for high-speed ephemeral data (Authorization Codes, Rate Limits, Token Blacklist).

```
                      +----------------------------------+
                      |         Client Browsers /        |
                      |   Third-Party Web Applications   |
                      +----------------------------------+
                                       |
                                  HTTP / HTTPS
                                       |
                                       v
                      +----------------------------------+
                      |         Express.js API           |
                      |    (Node.js / TypeScript App)    |
                      +----------------------------------+
                               /               \
                 Prisma ORM   /                 \  ioredis / redis
                             v                   v
                +-------------------+     +-------------------+
                | PostgreSQL (DB)   |     |   Redis (Cache)   |
                | - Users           |     | - Auth Codes      |
                | - Clients         |     | - Revoked Tokens  |
                | - Grants          |     | - Rate Limiting   |
                +-------------------+     +-------------------+
```

---

## 2. Component Boundaries & Subsystems

The backend application structure inside `src/` is logically divided into 5 modular subsystems:

```
src/
├── config/             # Environment variables, database, redis initialization
├── controllers/        # Request/Response handlers for Auth, OAuth, Clients
├── middleware/         # Auth verification, rate limiting, validation, error handling
├── routes/             # Express router definitions (/api/users, /api/clients, /oauth)
├── services/           # Business logic (Token generation, Auth code handling, Password hashing)
└── utils/              # Cryptography helpers, logger, formatters
```

### 2.1 API Gateway & Routing Layer
* **Express Router:** Handles HTTP routing, request parsing (`json`, `urlencoded`), and response formatting.
* **CORS & Security Headers:** Handles origin checks and cross-site protections.

### 2.2 Auth & Session Engine
* Handles user authentication, password verification using `bcrypt`, and user registration.
* Interacts with Prisma ORM to query user records from PostgreSQL.

### 2.3 OAuth 2.0 Engine
* Enforces the OAuth 2.0 specification RFC 6749.
* Evaluates request validity (`client_id`, `redirect_uri`, `scope`, `state`).
* Generates single-use `authorization_code` entries and stores them in Redis with a 5-minute Time-To-Live (TTL).
* Exchanges authorization codes for Access & Refresh tokens.

### 2.4 Data Persistence Layer (Prisma + PostgreSQL)
* Stores permanent transactional state.
* Utilizes **Prisma ORM 7** with `pg` pool connector for type-safe database queries.

### 2.5 Ephemeral State & Caching Layer (Redis)
* Stores transient authorization codes (`auth_code:<code_string>` $\rightarrow$ `{userId, clientId, redirectUri}`).
* Maintains token blacklist entries (`revoked_token:<jti>` $\rightarrow$ `true`).

---

## 3. Tech Stack Breakdown & Rationale

| Technology | Role | Choice Rationale |
| :--- | :--- | :--- |
| **Node.js (v20+)** | Runtime Environment | High concurrency non-blocking I/O model, ideal for fast API servers. |
| **TypeScript** | Primary Language | Provides strict static typing, preventing runtime type mismatches in security code. |
| **Express.js** | Web Framework | Lightweight, unopinionated framework with vast middleware ecosystem. |
| **Prisma (v7)** | ORM Layer | Provides auto-generated type-safe queries, schema migration management, and database safety. |
| **PostgreSQL (v15)** | Relational DB | Industry-standard relational DB offering ACID compliance, foreign keys, and unique indexes. |
| **Redis (v7)** | Cache & Memory Store | Ultra-fast in-memory key-value store with native TTL support for short-lived codes and token revocation. |
| **bcrypt** | Password Hashing | Key-stretching algorithm specifically designed for secure password storage against GPU attacks. |
| **jsonwebtoken** | Token Engine | Industry standard for signing and verifying JWT claims. |
| **Docker Compose** | Container Orchestration| Allows seamless local setup of PostgreSQL and Redis containers with persistent volume binding. |

---

## 4. System Sequence & Data Flow Diagrams

### 4.1 OAuth 2.0 Authorization Code Grant Sequence

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant App as Third-Party App
    participant IdP as Identity Provider (Express)
    participant Redis as Redis Cache
    participant DB as PostgreSQL DB

    User->>App: Click "Sign in with IdP"
    App->>User: Redirect to IdP /oauth/authorize?client_id=X&redirect_uri=Y&response_type=code&state=S
    User->>IdP: GET /oauth/authorize
    IdP->>DB: Validate client_id & redirect_uri
    DB-->>IdP: Client Valid
    IdP->>User: Render Login & Consent Screen
    User->>IdP: POST /oauth/authorize (Credentials + Consent)
    IdP->>DB: Verify User Credentials (bcrypt)
    DB-->>IdP: User Authenticated
    IdP->>Redis: Store Auth Code (TTL: 5m, user_id, client_id)
    IdP->>User: Redirect to redirect_uri?code=AUTH_CODE&state=S
    User->>App: Browser follows redirect to App callback
    App->>IdP: POST /oauth/token (client_id, client_secret, code, redirect_uri)
    IdP->>DB: Verify client_id & client_secret hash
    IdP->>Redis: Fetch & Delete Auth Code (Single-Use Check)
    Redis-->>IdP: Auth Code Valid
    IdP-->>App: Return JSON { access_token, refresh_token, token_type: "Bearer", expires_in: 3600 }
```

---

## 5. Deployment & Container Architecture

### 5.1 Docker Network Topology

```
+-------------------------------------------------------------------+
|                        Docker Host System                         |
|                                                                   |
|   +-------------------+     +-----------------+  +------------+   |
|   | Express App       |     | Postgres Container| |Redis Container|
|   | (Port 3000)       |     | (Port 5432)     |  | (Port 6379) |   |
|   |                   |     |                 |  |            |   |
|   +---------+---------+     +--------+--------+  +-----+------+   |
|             |                        |                 |          |
|             +----- bridge network ---+-----------------+          |
|                                                                   |
+-------------------------------------------------------------------+
```

### 5.2 Environment Configuration Schema
Environment variables are isolated inside `.env`:

```env
# Infrastructure Config
PORT=3000
NODE_ENV=development

# Database Config
DATABASE_URL="postgresql://admin:password123@localhost:5432/identity_provider?schema=public"

# Redis Config
REDIS_URL="redis://localhost:6379"

# Security & Secrets
JWT_SECRET="super-secret-development-key-change-in-production"
JWT_EXPIRES_IN="1h"
REFRESH_TOKEN_EXPIRES_IN="7d"
```
