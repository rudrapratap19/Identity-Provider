# Document 03: OAuth 2.0 & OIDC Specifications

## 1. Protocol Overview (RFC 6749)

This Identity Provider implements the **OAuth 2.0 Authorization Code Grant** flow as specified in [RFC 6749 Section 4.1](https://datatracker.ietf.org/doc/html/rfc6749#section-4.1), along with core OpenID Connect (OIDC) 1.0 extensions for identity assertion.

The Authorization Code Grant is the most secure grant type for traditional web applications and single-page applications because:
1. User credentials (email/password) are submitted **only** to the Identity Provider and never exposed to third-party clients.
2. The authorization code is transmitted via client browser redirection.
3. Access tokens are exchanged directly over a secure server-to-server channel (`POST /oauth/token`), preventing token exposure in browser history or HTTP referrer headers.

---

## 2. OAuth 2.0 Roles

* **Resource Owner (User):** An entity capable of granting access to a protected resource (the end-user).
* **Client (Third-Party Application):** An application making protected resource requests on behalf of the Resource Owner and with its authorization.
* **Authorization Server (Our IdP):** The server issuing access tokens to the client after successfully authenticating the resource owner and obtaining authorization.
* **Resource Server:** The server hosting protected resources, capable of accepting and responding to protected resource requests using access tokens.

---

## 3. Protocol Flow & Endpoint Specifications

### Step 1: Authorization Request (`GET /oauth/authorize`)

The Client directs the user's browser to the Authorization Endpoint.

#### Query Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `response_type` | String | **Yes** | Must be set to `code`. |
| `client_id` | String | **Yes** | The public identifier of the registered Client Application. |
| `redirect_uri` | String | **Yes** | The callback URL where the code will be sent. Must match a registered URI. |
| `scope` | String | Optional | Space-delimited string requesting access scopes (e.g., `openid profile email`). |
| `state` | String | **Yes** | An opaque value used by the client to prevent CSRF attacks. |

#### IdP Validation Steps:
1. Verify `client_id` exists in PostgreSQL `clients` table.
2. Verify `redirect_uri` exactly matches one of the client's registered `redirect_uris`.
3. Verify `response_type === 'code'`.
4. If validation fails, return HTTP 400 Bad Request immediately.
5. If validation succeeds, render the Login / Consent UI.

---

### Step 2: User Login & Consent Submission (`POST /oauth/authorize`)

The user authenticates with their credentials and reviews the requested scope permissions.

#### Form Body Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `email` | String | **Yes** | User's email address. |
| `password` | String | **Yes** | User's plaintext password. |
| `client_id` | String | **Yes** | Client ID passed from step 1. |
| `redirect_uri` | String | **Yes** | Redirect URI passed from step 1. |
| `state` | String | **Yes** | State parameter passed from step 1. |

#### IdP Validation & Code Generation Steps:
1. Authenticate user credentials against PostgreSQL using `bcrypt.compare()`.
2. Generate a cryptographically secure, random 32-character hex string as the `authorization_code`.
3. Store the code in **Redis** with a key schema: `auth_code:<code_string>`.
   * **Stored Value:** `{ userId, clientId, redirectUri, scopes }`
   * **TTL (Expiration):** 300 seconds (5 minutes).
4. Record or update user consent grant in PostgreSQL (`grants` table).
5. Send HTTP 302 Redirect response:
   ```http
   HTTP/1.1 302 Found
   Location: https://thirdparty.com/callback?code=e3b0c44298fc1c149afbf4c8996fb924&state=xyz123
   ```

---

### Step 3: Token Exchange Request (`POST /oauth/token`)

The Client application exchanges the authorization code for an Access Token. This request MUST be made server-to-server.

#### Request Headers
* `Content-Type: application/x-www-form-urlencoded` or `application/json`
* (Optional) `Authorization: Basic <base64(client_id:client_secret)>`

#### Request Body Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `grant_type` | String | **Yes** | Must be set to `authorization_code`. |
| `code` | String | **Yes** | The authorization code received from the authorization server. |
| `redirect_uri` | String | **Yes** | The same redirect URI used in Step 1. |
| `client_id` | String | **Yes** | Client ID (if not provided via Basic Auth). |
| `client_secret` | String | **Yes** | Client Secret (if not provided via Basic Auth). |

#### IdP Validation & Token Generation Steps:
1. Verify `grant_type === 'authorization_code'`.
2. Authenticate the Client: look up client by `client_id` and verify `bcrypt.compare(client_secret, client_secret_hash)`.
3. Retrieve code data from Redis (`auth_code:<code>`).
4. **Single-Use Enforcement:** Atomically delete `auth_code:<code>` from Redis. If the code does not exist or has expired, reject with `invalid_grant`.
5. Verify `redirect_uri` matches the `redirectUri` stored in Redis.
6. Generate Tokens:
   * **Access Token (JWT):** Signed with `JWT_SECRET`, valid for 1 hour.
   * **Refresh Token:** Cryptographic string stored in DB/Redis, valid for 7 days.
7. Return HTTP 200 OK Response:
   ```json
   {
     "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "token_type": "Bearer",
     "expires_in": 3600,
     "refresh_token": "r_9f8d7e6c5b4a3...",
     "scope": "openid profile email"
   }
   ```

---

## 4. OpenID Connect (OIDC) Scopes & Claims

When the `scope` parameter includes `openid`, the Access Token or UserInfo endpoint returns standard OIDC identity claims:

| Scope | Supported Claims | Description |
| :--- | :--- | :--- |
| `openid` | `sub`, `iss`, `aud`, `exp`, `iat` | Required for OIDC compliance. `sub` is the unique User UUID. |
| `profile` | `name`, `updated_at` | Provides basic user profile details. |
| `email` | `email`, `email_verified` | Provides user email identity. |

### JWT Claims Payload Example
```json
{
  "iss": "http://localhost:3000",
  "sub": "b3c9f21a-4d5e-4a6f-9812-1a2b3c4d5e6f",
  "aud": "client_app_123",
  "exp": 1722080000,
  "iat": 1722076400,
  "scope": "openid profile email",
  "email": "user@example.com"
}
```

---

## 5. Protocol Error Handling Specifications (RFC 6749 Sec 5.2)

All error responses from token endpoints return standard JSON error objects with HTTP 400 Bad Request or HTTP 401 Unauthorized:

```json
{
  "error": "invalid_grant",
  "error_description": "The authorization code has expired or has already been used."
}
```

### Standard Error Codes
* `invalid_request`: Missing required parameters or unsupported parameter values.
* `invalid_client`: Client authentication failed (invalid `client_id` or `client_secret`).
* `invalid_grant`: Invalid, expired, or revoked authorization code / refresh token.
* `unauthorized_client`: The client is not authorized to request an authorization code using this method.
* `unsupported_grant_type`: Grant type is not supported (`authorization_code` is required).
