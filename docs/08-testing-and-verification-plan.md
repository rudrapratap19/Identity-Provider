# Document 08: Testing and Verification Plan

## 1. Testing Strategy Overview

To ensure the Identity Provider is production-ready, highly secure, and strictly compliant with OAuth 2.0 specifications, testing is structured across three complementary tiers:

```
                  +-----------------------------------+
                  |   Tier 3: E2E Consumer App Test   |
                  +-----------------------------------+
                  |   Tier 2: API Integration Tests   |
                  +-----------------------------------+
                  |   Tier 1: Unit & Crypto Tests     |
                  +-----------------------------------+
```

---

## 2. Tier 1: Unit Testing (Cryptographic & Logic Helpers)

Unit tests focus on core mathematical and cryptographic helper functions without requiring live database connections.

### Test Targets
1. **Password Hashing (`bcrypt` service):**
   * Verify password hash generation produces valid bcrypt string format (`$2b$10$...`).
   * Verify matching plaintext password yields `true`.
   * Verify incorrect password yields `false`.
2. **Client Secret CSPRNG:**
   * Verify generated `clientId` starts with `client_` prefix.
   * Verify generated `clientSecret` has $\ge 32$ bytes entropy.
3. **JWT Token Signing & Verification:**
   * Verify payload signature validation against `JWT_SECRET`.
   * Verify token expiry (`exp`) rejection.

---

## 3. Tier 2: Integration Testing (API Endpoints)

Integration tests verify full HTTP request/response handling, Prisma ORM database queries, and Redis key operations.

### Integration Test Workflow Matrix

| Test Suite | Endpoint | Method | Expected HTTP Status | Validation Assertions |
| :--- | :--- | :--- | :--- | :--- |
| **Health Check** | `/health` | `GET` | `200 OK` | `body.status === 'ok'`, DB query returns `1`. |
| **User Signup** | `/api/users/register` | `POST` | `201 Created` | User record created in PostgreSQL; password is hashed. |
| **Duplicate Signup**| `/api/users/register` | `POST` | `400 Bad Request` | Duplicate email returns error message. |
| **User Login** | `/api/users/login` | `POST` | `200 OK` | Valid credentials return session token. |
| **Client Register** | `/api/clients/register` | `POST` | `201 Created` | Returns raw `clientSecret`; database stores hashed secret. |
| **OAuth Authorize** | `/oauth/authorize` | `GET` | `200 OK` | Validates `client_id` & `redirect_uri`; renders login form. |
| **OAuth Consent** | `/oauth/authorize` | `POST` | `302 Found` | Stores auth code in Redis (5-min TTL); redirects with `?code=...`. |
| **Token Exchange** | `/oauth/token` | `POST` | `200 OK` | Exchanges code for Access Token; deletes code from Redis. |
| **Replay Attack** | `/oauth/token` | `POST` | `400 Bad Request` | Re-using same authorization code fails (`invalid_grant`). |

---

## 4. Tier 3: End-to-End (E2E) Verification with Demo App

To prove real-world usability, we will build a minimal **Demo Third-Party Client Application** running on a separate port (`http://localhost:4000`).

### E2E Test Flow Execution:
1. User opens Demo App at `http://localhost:4000`.
2. User clicks **"Sign in with Custom IdP"**.
3. Demo App redirects browser to `http://localhost:3000/oauth/authorize?client_id=...&redirect_uri=http://localhost:4000/callback&response_type=code&state=secret123`.
4. User fills login credentials and grants consent.
5. IdP redirects browser back to Demo App callback `http://localhost:4000/callback?code=AUTH_CODE&state=secret123`.
6. Demo App backend executes server-to-server POST to `http://localhost:3000/oauth/token`.
7. Demo App receives Access Token, fetches user profile from `http://localhost:3000/oauth/userinfo`, and displays logged-in user screen.
