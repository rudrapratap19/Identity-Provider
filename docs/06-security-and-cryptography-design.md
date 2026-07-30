# Document 06: Security and Cryptography Design

## 1. Threat Model & Security Posture

Identity Providers are high-value targets for authentication bypass, credential stuffing, open-redirect attacks, and token forgery. This system implements defense-in-depth measures against common threat vectors:

| Threat Vector | Severity | Mitigation Strategy |
| :--- | :--- | :--- |
| **Credential Theft / Database Breach** | Critical | Passwords hashed using `bcrypt` (cost 10+); Client secrets stored as `bcrypt` hashes. |
| **Cross-Site Request Forgery (CSRF)** | High | Strict `state` parameter verification during `/oauth/authorize` flow. |
| **Open Redirect Attacks** | High | Whitelisted `redirect_uris` strict string matching; wildcards strictly forbidden. |
| **Replay Attacks** | High | Authorization codes stored in Redis with 5-min TTL and single-use deletion. |
| **Token Forgery** | Critical | Digitally signed JWT tokens with secret keys and claim validation (`iss`, `aud`, `exp`). |
| **Brute Force / Denial of Service** | High | Redis-backed sliding window rate-limiting on login and token endpoints. |

---

## 2. Password & Credential Hashing

### 2.1 Password Storage Standard
* **Algorithm:** `bcrypt` (Blowfish-based adaptive hashing algorithm).
* **Cost Factor (Salt Rounds):** `10` (balances security computation time $\approx 100\text{ms}$ with CPU load).
* **Salt Generation:** Unique 128-bit salt generated per password automatically by `bcrypt.hash()`.

```typescript
// Implementation Standard
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;
const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};
```

---

## 3. Client Secret Security & Cryptography

### 3.1 Client Secret Generation
Client secrets are generated using Cryptographically Secure Pseudorandom Number Generators (CSPRNG) via Node's native `crypto` module:

```typescript
import crypto from 'crypto';

export const generateClientCredentials = () => {
  const clientId = `client_${crypto.randomBytes(12).toString('hex')}`;
  const rawSecret = `sec_${crypto.randomBytes(24).toString('hex')}`;
  return { clientId, rawSecret };
};
```

### 3.2 Client Secret Storage
* The `rawSecret` is displayed **only once** to the developer upon registration.
* Only `bcrypt.hash(rawSecret, 10)` is saved to the `client_secret_hash` column in PostgreSQL.
* During `/oauth/token` requests, the incoming secret is verified using `bcrypt.compare()`.

---

## 4. Token Cryptography & Verification

### 4.1 Access Token Architecture (JWT)
Access Tokens are JSON Web Tokens (JWT) structured according to RFC 7519:

* **Header:** `{ "alg": "HS256", "typ": "JWT" }`
* **Signing Key:** Environment variable `JWT_SECRET` (Minimum 256 bits entropy).
* **Claims Structure:**
  * `iss` (Issuer): `http://localhost:3000`
  * `sub` (Subject): `user_id` (UUID)
  * `aud` (Audience): `client_id`
  * `exp` (Expiration): `epoch + 3600s` (1 hour)
  * `iat` (Issued At): `epoch`
  * `jti` (JWT ID): Unique identifier for token revocation tracking.

---

## 5. Redis Ephemeral State & Security Controls

### 5.1 Authorization Code Lifecycle
1. Code generated: `ac_` + 24 random bytes (`crypto.randomBytes(24).toString('hex')`).
2. Stored in Redis: `SET EX auth_code:<code_string> 300 <json_payload>`.
3. Verification:
   ```typescript
   // Atomic read & delete (Single-Use Guarantee)
   const dataStr = await redis.getdel(`auth_code:${code}`);
   if (!dataStr) {
     throw new Error('invalid_grant: Code expired or already used');
   }
   ```

### 5.2 Token Revocation & Blacklisting
When a token is revoked via `POST /oauth/revoke` or user logout:
1. Extract `jti` and remaining TTL from the JWT.
2. Store in Redis: `SET EX revoked_token:<jti> <remaining_seconds> "true"`.
3. Authentication middleware checks Redis:
   ```typescript
   const isRevoked = await redis.exists(`revoked_token:${payload.jti}`);
   if (isRevoked) {
     return res.status(401).json({ error: 'invalid_token', error_description: 'Token has been revoked' });
   }
   ```

---

## 6. Web & Network Security Hardening

### 6.1 Strict Redirect URI Matching
* Exact string equality matching between requested `redirect_uri` and registered `redirectUris` array.
* Wildcard matching (e.g. `*.domain.com`) is **explicitly disabled** to prevent open-redirect vulnerabilities.

### 6.2 CSRF Protection via `state` Parameter
* The `state` parameter passed to `GET /oauth/authorize` is strictly forwarded unchanged back to the client in the redirect URL `redirect_uri?code=X&state=S`.
* The client application is expected to verify that the returned `state` matches its local session state.
