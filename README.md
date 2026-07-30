# 🔐 Enterprise Identity Provider (IdP) & OAuth 2.0 / OIDC Server

![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-Express-green?logo=nodedotjs)
![Prisma](https://img.shields.io/badge/Prisma-7.9-1B222D?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?logo=postgresql)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis)
![React](https://img.shields.io/badge/React-Vite-61DAFB?logo=react)
![Security](https://img.shields.io/badge/OAuth_2.0-RS256-blueviolet)

An enterprise-grade, production-ready **Identity Provider (IdP) & Authorization Server** built with Node.js, Express, TypeScript, Prisma, PostgreSQL, Redis, and React. It acts as a centralized authentication authority (similar to Auth0 or Keycloak) implementing **OAuth 2.0 Authorization Code Flow**, **OpenID Connect (OIDC)**, and **RS256 Asymmetric Cryptographic JWT Signing**.

---

## 🌐 Live Production Links

* **⚡ Live Backend API & Landing Portal:** [https://identity-provider-backend-5jai.onrender.com](https://identity-provider-backend-5jai.onrender.com)
* **🎨 Live Admin Dashboard (Vercel):** *Deploy URL on Vercel*
* **🐙 GitHub Repository:** [https://github.com/rudrapratap19/Identity-Provider](https://github.com/rudrapratap19/Identity-Provider)

---

## ✨ Key Features

### 1. 🛡️ OAuth 2.0 & OpenID Connect Core
- **Authorization Code Grant:** Secure 3-legged authorization flow for web and mobile applications.
- **PKCE Support (Proof Key for Code Exchange):** Protection against authorization code interception attacks on public clients.
- **JWKS Endpoint (`/oauth/jwks.json`):** Serves public RSA key sets for microservices to verify JWT access tokens independently.
- **OIDC Profile Endpoint (`/oauth/userinfo`):** Returns authenticated user profile metadata.

### 2. 🔑 Cryptographic Token Engine (RS256)
- Signs JSON Web Tokens (JWTs) using asymmetric **RSA 2048-bit Private Key**.
- Allows third-party consumer services to verify token authenticity using only the **Public Key** without querying the DB on every request.

### 3. 🚀 High-Performance Caching & Data Layer
- **Redis Cache:** Ultra-fast storage for ephemeral authorization codes and rate-limiting counters.
- **Prisma ORM & PostgreSQL:** Relational schema managing OAuth clients, user accounts, and active refresh tokens.

### 4. 🎨 Modern Glassmorphism Admin Dashboard
- **OAuth Client Management:** Instantly register client applications, generate Client IDs and secrets, and configure allowed redirect URIs.
- **Interactive UI:** Built with React 18, Vite, Lucide Icons, and Toast Notifications.
- **Search & Filter:** Instant real-time search across client IDs and application names.
- **Copy-to-Clipboard:** One-click credential copying with visual feedback.

### 5. 🔒 Production Security & Hardening
- **HTTP Security Headers:** Configured with `helmet`.
- **Cross-Origin Control:** Configurable `cors` middleware for multi-domain deployments.
- **Rate Limiting:** Protects sensitive auth endpoints (`/oauth/token`, `/api/users/login`) from brute-force attacks.
- **Environment Isolation:** Secrets & private RSA keys isolated from version control (`.gitignore`).

---

## 📐 System Architecture & OAuth 2.0 Flow

```
┌─────────────────┐             ┌─────────────────────┐             ┌─────────────────────────┐
│   User Browser  │             │  Consumer App       │             │  Identity Provider (IdP)│
└────────┬────────┘             └──────────┬──────────┘             └────────────┬────────────┘
         │                                 │                                     │
         │ 1. Click "Login with IdP"       │                                     │
         ├────────────────────────────────►│                                     │
         │                                 │ 2. Redirect to /oauth/authorize     │
         │◄────────────────────────────────┴─────────────────────────────────────┤
         │                                                                       │
         │ 3. User enters credentials & approves consent                        │
         ├──────────────────────────────────────────────────────────────────────►│
         │                                                                       │
         │ 4. Redirect back to redirect_uri?code=AUTH_CODE                      │
         │◄──────────────────────────────────────────────────────────────────────┤
         │                                                                       │
         │ 5. Send AUTH_CODE to Consumer Backend                                 │
         ├────────────────────────────────►│                                     │
         │                                 │ 6. POST /oauth/token (Exchange code)│
         │                                 ├────────────────────────────────────►│
         │                                 │◄────────────────────────────────────┤
         │                                 │ 7. Returns RS256 JWT access_token   │
         │                                 │                                     │
         │                                 │ 8. GET /oauth/userinfo              │
         │                                 ├────────────────────────────────────►│
         │                                 │◄────────────────────────────────────┤
         │                                 │ 9. Returns authenticated profile    │
         │ 10. Login Complete!             │                                     │
         │◄────────────────────────────────┤                                     │
```

---

## 📁 Repository Structure

```text
Identity-Provider/
├── src/                        # Express Backend API
│   ├── config/                 # Database (Prisma) & Redis config
│   ├── controllers/            # OAuth2 & User route handlers
│   ├── middleware/             # Auth, CORS, validation, rate limiters
│   ├── routes/                 # Express route definitions
│   ├── services/               # Auth code caching service
│   ├── utils/                  # Cryptography & RS256 JWT signers
│   ├── app.ts                  # Express application setup
│   └── index.ts                # Server entry point
├── frontend/                   # Admin Dashboard (React + Vite)
│   ├── src/
│   │   ├── components/         # Sidebar, ClientModal, Stats, Settings
│   │   ├── App.tsx             # Main layout & auth state
│   │   └── index.css           # Glassmorphism design system
│   ├── package.json
│   └── vercel.json             # Vercel deployment rewrites
├── prisma/                     # Database schema & migrations
├── docker-compose.yml          # PostgreSQL & Redis containers
├── private_key.pem             # RSA Private key (git-ignored)
├── public_key.pem              # RSA Public key
└── package.json
```

---

## 🛠️ Local Development Setup

### Prerequisites
- [Node.js v18+](https://nodejs.org)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### Step 1: Clone Repository
```bash
git clone https://github.com/rudrapratap19/Identity-Provider.git
cd Identity-Provider
```

### Step 2: Start PostgreSQL & Redis Containers
```bash
docker-compose up -d
```

### Step 3: Install Dependencies & Run Database Migrations
```bash
# Install backend dependencies
npm install --legacy-peer-deps

# Push Prisma schema to local PostgreSQL
npx prisma db push
npx prisma generate
```

### Step 4: Start Backend & Frontend
```bash
# Terminal 1: Start Backend API (Port 3000)
cmd /c "npx tsx src/index.ts"

# Terminal 2: Start React Admin Dashboard (Port 5000)
cd frontend
npm install
npm run dev
```

Open `http://localhost:5000` in your browser and enter password `admin123` to access the Admin Dashboard!

---

## 📌 API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Live API Portal & Endpoint Information |
| `GET` | `/health` | Service and Database health check |
| `GET` | `/oauth/authorize` | Renders user login & consent screen |
| `POST` | `/oauth/authorize` | Processes user authentication and returns auth code |
| `GET` | `/oauth/signup` | Renders user registration page |
| `POST` | `/oauth/token` | Exchanges authorization code for RS256 JWT |
| `GET` | `/oauth/userinfo` | Returns user profile (Requires `Authorization: Bearer <token>`) |
| `GET` | `/oauth/jwks.json` | Public RSA JSON Web Key Set |
| `GET` | `/api/clients` | Fetches registered OAuth clients |
| `POST` | `/api/clients/register` | Registers a new OAuth client app |

---

## 💡 Interview Discussion Points & Highlights

When presenting this project in technical interviews:

1. **Why RS256 over HS256?**
   - *HS256 (Symmetric)* requires sharing the secret key with every microservice that needs to verify tokens. If one microservice is compromised, tokens can be forged.
   - *RS256 (Asymmetric)* uses a Private key to sign tokens (kept strictly inside this IdP) and a Public key (`/oauth/jwks.json`) that microservices use to verify tokens safely without secret sharing.

2. **Why use Redis for Authorization Codes?**
   - Authorization codes are single-use and short-lived (expiry ~10 minutes). Storing them in Redis with automatic TTL avoids database bloat and ensures sub-millisecond retrieval speeds.

3. **How does PKCE prevent Authorization Code Interception?**
   - PKCE enforces that public clients generate a high-entropy secret (`code_verifier`) and send its SHA256 hash (`code_challenge`) during authorization. When exchanging the code for a token, the client sends the `code_verifier`, which the IdP validates before issuing tokens.

---

## 📜 License
Distributed under the MIT License. See `LICENSE` for more information.
