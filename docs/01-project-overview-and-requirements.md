# Document 01: Project Overview and Requirements

## 1. Executive Summary
The **Custom Identity Provider (IdP)** is an enterprise-grade, standard-compliant authentication and authorization server built from the ground up using **Node.js, TypeScript, PostgreSQL, and Redis**. 

The primary purpose of this system is to act as a centralized identity hub (similar to Auth0, Keycloak, or Okta) that allows third-party client applications to authenticate users securely via the **OAuth 2.0 Authorization Code Grant** protocol.

---

## 2. Project Vision & Core Objectives

### 2.1 Vision
To create a transparent, self-hosted, highly secure identity management system that handles complete user lifecycle management, OAuth 2.0 protocol flows, token issuance/revocation, and credential delegation without reliance on closed-source third-party SaaS vendors.

### 2.2 Core Objectives
1. **Standards Compliance:** Implement RFC 6749 (OAuth 2.0 Framework) focused on the Authorization Code Grant type.
2. **Security-First Architecture:** Enforce strict password hashing (`bcrypt`), cryptographic token signing (JWT with HMAC-SHA256 / RSA), client secret hashing, and Redis-backed token revocation.
3. **Developer Empowerment:** Provide clean, intuitive interfaces and APIs for third-party developers to register apps, manage client credentials, and set secure redirect URIs.
4. **State Management & High Performance:** Utilize Redis for fast, short-lived Authorization Code verification (TTL < 10 mins) and request rate-limiting.

---

## 3. User Personas

| Persona | Description | Key Goals | Primary Interaction |
| :--- | :--- | :--- | :--- |
| **End User** | The individual human user who owns an account on the IdP. | Securely register, log in, manage consent, and sign into third-party apps without sharing password credentials. | Web Browser (Hosted Login & Consent UI) |
| **Third-Party App Developer** | Software developer building applications that want to use "Sign in with IdP". | Register third-party apps, receive `client_id` & `client_secret`, obtain access tokens to access user data. | REST APIs (`/api/clients/*`) & Developer Dashboard |
| **System Administrator** | Engineer managing the IdP infrastructure. | Monitor server health, manage database migrations, audit active sessions/tokens, enforce rate limits. | Server Logs, Docker CLI, Health Check Endpoint (`/health`) |

---

## 4. Functional Requirements

### 4.1 Identity & User Management
* **FR-1.1 User Registration:** Support user signup with unique email validation and secure password hashing using `bcrypt` (cost factor $\ge 10$).
* **FR-1.2 User Authentication:** Authenticate users via credentials (email + password) with error feedback preventing account enumeration.
* **FR-1.3 Profile Management:** Store user profile metadata (`id`, `email`, timestamp metrics) for token claims.

### 4.2 Client Application Management
* **FR-2.1 Client Registration:** Allow registered developers to create third-party client applications.
* **FR-2.2 Credential Generation:** Generate cryptographically secure `client_id` (UUIDv4 / random string) and `client_secret` (random 32+ byte string).
* **FR-2.3 Secret Hashing:** Store only hashed values of `client_secret` in PostgreSQL to mitigate data breach risks.
* **FR-2.4 Redirect URI Whitelisting:** Enforce registration and strict validation of allowed `redirect_uris` for every client application.

### 4.3 OAuth 2.0 Authorization Code Grant Flow
* **FR-3.1 Authorization Request (`GET /oauth/authorize`):** Validate incoming parameters (`client_id`, `redirect_uri`, `response_type=code`, `scope`, `state`).
* **FR-3.2 Consent Interface:** Display a consent screen indicating which permissions/scopes the third-party application is requesting.
* **FR-3.3 Authorization Code Issuance:** Upon consent, generate a short-lived (5-minute expiration), single-use `authorization_code` and redirect the user back to `redirect_uri?code=XYZ&state=ABC`.
* **FR-3.4 Token Exchange (`POST /oauth/token`):** 
  * Validate client identity via `client_id` + `client_secret` authentication.
  * Verify `authorization_code` from Redis.
  * Ensure matching `redirect_uri`.
  * Invalidate/delete the authorization code immediately after first use (single-use guarantee).
  * Issue signed Access Token (JWT) and Refresh Token.

### 4.4 Session & Token Management
* **FR-4.1 Access Tokens:** Issue short-lived JSON Web Tokens (JWT) containing standard claims (`iss`, `sub`, `aud`, `exp`, `iat`, `scope`).
* **FR-4.2 Refresh Tokens:** Issue opaque or signed long-lived refresh tokens for token renewal.
* **FR-4.3 Token Revocation:** Maintain a Redis blacklist to instantly revoke compromised access tokens or user sessions.

---

## 5. Non-Functional Requirements

### 5.1 Security & Cryptography (NFR-1)
* Passwords must NEVER be stored in plaintext.
* Client secrets must be hashed using strong hash functions before storage.
* Tokens must be digitally signed using HMAC-SHA256 (or RS256).
* Transport Security: All endpoints must operate over HTTPS in production.
* Prevention of OAuth attacks: CSRF protection via strict `state` parameter passing; open-redirector prevention via explicit URI match checking.

### 5.2 Performance & Latency (NFR-2)
* Token validation / verification latency must be $< 20\text{ms}$.
* Database lookups must leverage indexes on `email`, `client_id`, and foreign key relations (`user_id`, `client_id`).
* Authorization codes must be cached in Redis with strict Time-To-Live (TTL).

### 5.3 Scalability & Architecture (NFR-3)
* Stateless API layer: Express server must remain stateless so it can be horizontally scaled behind a reverse proxy (Nginx/HAProxy).
* Distributed session state: Redis serves as the shared state layer across multiple server instances.

### 5.4 Reliability & Health (NFR-4)
* Include a `/health` diagnostic endpoint checking database connection readiness.
* Graceful error handling returning standardized JSON error responses adhering to RFC 6749 Section 5.2 format (`{ "error": "invalid_request", "error_description": "..." }`).

---

## 6. Scope Boundaries

### In-Scope (Phase 1 to 4)
* OAuth 2.0 Authorization Code Grant Flow.
* Client Registration and Management.
* User Registration and Login.
* JWT Token Generation, Refresh, and Revocation.
* Docker Compose local infrastructure (PostgreSQL & Redis).
* Integration tests & Demo Consumer Client application.

### Out-of-Scope (Future Enhancements)
* Social Login / Federated Identity (Google/GitHub login integration into our IdP).
* Complex SAML 2.0 protocol support.
* Multi-factor Authentication (MFA/TOTP) - planned for v2.0.
