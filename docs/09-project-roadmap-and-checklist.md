# Document 09: Project Roadmap and Checklist

## 1. Final Project Goal Statement

> **Final Goal:** Deliver a fully functional, self-hosted, production-ready **Custom Identity Provider (OAuth 2.0 Server)** built with Node.js, TypeScript, PostgreSQL, and Redis. The system will handle end-to-end user registration, client application onboarding, authorization code issuance, token exchange (JWT), and token revocation, complete with a working Demo Consumer Application demonstrating real-world integration.

---

## 2. Master Implementation Checklist

### Phase 1: Planning & System Design Documentation
- [x] Define project vision, requirements, and user personas (`01-project-overview-and-requirements.md`).
- [x] Design system architecture, component boundaries, and sequence diagrams (`02-system-architecture.md`).
- [x] Document OAuth 2.0 Authorization Code Grant protocol specs (`03-oauth2-oidc-specifications.md`).
- [x] Design relational database models and ER diagrams (`04-database-schema-and-data-models.md`).
- [x] Define RESTful and OAuth API contracts (`05-api-contract-and-endpoints.md`).
- [x] Formulate security, hashing, and token cryptography policies (`06-security-and-cryptography-design.md`).
- [x] Create developer onboarding and setup documentation (`07-developer-guide-and-setup.md`).
- [x] Outline complete testing and verification strategy (`08-testing-and-verification-plan.md`).
- [x] Establish master roadmap and Definition of Done (`09-project-roadmap-and-checklist.md`).

---

### Phase 2: Environment Infrastructure & Database Setup
- [x] Initialize Node.js TypeScript project in `D:\backend\identity-provider`.
- [x] Install dependencies (`express`, `dotenv`, `jsonwebtoken`, `bcrypt`, `pg`, `@prisma/client`, `@prisma/adapter-pg`, `ioredis`).
- [x] Configure TypeScript `tsconfig.json`.
- [x] Setup `docker-compose.yml` for PostgreSQL (port 5432) and Redis (port 6379).
- [x] Initialize Prisma 7, configure `prisma/schema.prisma` and `.env`.
- [x] Spin up Docker containers and apply initial database migration (`npx prisma migrate dev --name init`).

---

### Phase 3: Core Logic Implementation
- [x] Implement database client singleton and Redis connection helper in `src/config/`.
- [x] Create password hashing and CSPRNG utility functions in `src/utils/crypto.ts`.
- [x] Create JWT signing and verification service in `src/services/token.service.ts`.
- [x] Implement User Registration & Login routes (`/api/users/register`, `/api/users/login`).
- [x] Implement Client Application Registration route (`/api/clients/register`).
- [x] Build Authorization Code state manager using Redis (`src/services/authCode.service.ts`).
- [x] Implement OAuth `/oauth/authorize` GET & POST endpoints with consent form rendering.
- [x] Implement OAuth `/oauth/token` exchange endpoint.
- [x] Implement OIDC `/oauth/userinfo` profile endpoint.

---

### Phase 4: Security Hardening & Redis Integration
- [x] Add Redis-backed token revocation / blacklist logic (`/oauth/revoke`).
- [x] Add request validation middleware for mandatory parameters (`client_id`, `redirect_uri`, `state`).
- [x] Add open-redirect prevention (strict URI matching against whitelisted array).
- [x] Add single-use enforcement for authorization codes.

---

### Phase 5: Verification & E2E Demonstration
- [x] Verify health endpoint (`GET /health`).
- [x] Perform API endpoint testing via Postman / HTTP client.
- [x] Build Demo Consumer Web Application (Express app running on port 4000).
- [x] Execute full end-to-end "Sign in with Custom IdP" login flow.
- [x] Produce final project Walkthrough documentation.

---

## 3. Definition of Done (DoD)

A milestone is considered **DONE** only when:
1. All TypeScript code compiles cleanly (`npx tsc --noEmit` returns zero errors).
2. Database schema migrations run successfully without manual SQL patches.
3. Every API response strictly matches the contracts defined in `05-api-contract-and-endpoints.md`.
4. Cryptographic secrets and sensitive data are hashed before storage.
5. End-to-end authorization flow works seamlessly in a browser environment.
