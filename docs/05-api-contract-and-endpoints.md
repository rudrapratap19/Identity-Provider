# Document 05: API Contract and Endpoints

## 1. Overview & General Conventions

This document specifies the RESTful and OAuth 2.0 HTTP API contracts for the Identity Provider.

### Base URL
* Development: `http://localhost:3000`

### Headers
* Requests with body payload must include: `Content-Type: application/json` or `application/x-www-form-urlencoded`.
* Protected endpoints require: `Authorization: Bearer <access_token>`.

### Standard HTTP Status Codes
* `200 OK`: Request succeeded.
* `201 Created`: Resource successfully created.
* `302 Found`: OAuth authorization redirect.
* `400 Bad Request`: Invalid parameters or validation error.
* `401 Unauthorized`: Authentication failed or invalid token/credentials.
* `403 Forbidden`: Insufficient permissions/scopes.
* `500 Internal Server Error`: Unhandled server exception.

---

## 2. Health & System Endpoints

### 2.1 GET `/health`
Check server readiness and database connectivity.

#### Response `200 OK`
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-07-27T11:20:00.000Z"
}
```

---

## 3. User Management Endpoints

### 3.1 POST `/api/users/register`
Register a new end-user account on the IdP.

#### Request Body (`application/json`)
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

#### Response `201 Created`
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "e4b2d1c0-5a3f-4b6e-8d9c-0f1a2b3c4d5e",
    "email": "user@example.com",
    "createdAt": "2026-07-27T11:20:00.000Z"
  }
}
```

#### Error Response `400 Bad Request`
```json
{
  "error": "invalid_request",
  "error_description": "User with this email already exists."
}
```

---

### 3.2 POST `/api/users/login`
Authenticate a user with password credentials to obtain a direct IdP session token.

#### Request Body (`application/json`)
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

#### Response `200 OK`
```json
{
  "message": "Authentication successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "e4b2d1c0-5a3f-4b6e-8d9c-0f1a2b3c4d5e",
    "email": "user@example.com"
  }
}
```

---

## 4. Client Application Management Endpoints

### 4.1 POST `/api/clients/register`
Register a third-party client application to get OAuth credentials (`client_id` & `client_secret`).

#### Request Body (`application/json`)
```json
{
  "name": "Awesome Portfolio App",
  "redirectUris": [
    "http://localhost:4000/callback",
    "https://awesomeapp.com/oauth/callback"
  ]
}
```

#### Response `201 Created`
> **Important:** The `client_secret` is returned **only once** at creation. The client must store it securely.

```json
{
  "message": "Client registered successfully",
  "client": {
    "id": "c1f2e3d4-5a6b-7c8d-9e0f-1a2b3c4d5e6f",
    "name": "Awesome Portfolio App",
    "clientId": "client_abc123xyz789",
    "clientSecret": "sec_8f9e0d1c2b3a4f5e6d7c8b9a0f1e2d3c",
    "redirectUris": [
      "http://localhost:4000/callback",
      "https://awesomeapp.com/oauth/callback"
    ],
    "createdAt": "2026-07-27T11:20:00.000Z"
  }
}
```

---

## 5. Core OAuth 2.0 Endpoints

### 5.1 GET `/oauth/authorize`
Initial endpoint called by third-party applications to start the authorization flow.

#### Query Parameters
* `client_id` (required): Registered client ID.
* `redirect_uri` (required): Callback URL matching client's registered list.
* `response_type` (required): Must be `code`.
* `scope` (optional): Requested permissions (e.g. `openid profile email`).
* `state` (required): Opaque client state string for CSRF prevention.

#### Behavior:
Renders the HTML Login & Consent Form.

---

### 5.2 POST `/oauth/authorize`
Submits user credentials and consent choice from the HTML form.

#### Form Body (`application/x-www-form-urlencoded`)
```
email=user@example.com&password=SecurePassword123!&client_id=client_abc123xyz789&redirect_uri=http://localhost:4000/callback&state=xyz123
```

#### Response `302 Found` (Redirect)
```http
HTTP/1.1 302 Found
Location: http://localhost:4000/callback?code=ac_8f9e0d1c2b3a4f5e6d7c&state=xyz123
```

---

### 5.3 POST `/oauth/token`
Exchanges the short-lived authorization code for Access & Refresh tokens.

#### Request Body (`application/x-www-form-urlencoded` or `application/json`)
```json
{
  "grant_type": "authorization_code",
  "code": "ac_8f9e0d1c2b3a4f5e6d7c",
  "redirect_uri": "http://localhost:4000/callback",
  "client_id": "client_abc123xyz789",
  "client_secret": "sec_8f9e0d1c2b3a4f5e6d7c8b9a0f1e2d3c"
}
```

#### Response `200 OK`
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwOi8vbG9jYWxob3N0OjMwMDAiLCJzdWIiOiJlNGIyZDFjMC01YTNmLTRiNmUtOGQ5Yy0wZjFhMmIzYzRkNWUiLCJhdWQiOiJjbGllbnRfYWJjMTIzeHl6Nzg5IiwiZXhwIjoxNzIyMDg2NDAwLCJpYXQiOjE3MjIwODIwMDAsInNjb3BlIjoib3BlbmlkIHByb2ZpbGUgZW1haWwiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20ifQ...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "rt_0a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p",
  "scope": "openid profile email"
}
```

#### Error Response `400 Bad Request`
```json
{
  "error": "invalid_grant",
  "error_description": "Authorization code has expired or is invalid."
}
```

---

### 5.4 GET `/oauth/userinfo`
OIDC standard endpoint returning user profile claims for a valid Access Token.

#### Headers
* `Authorization: Bearer <access_token>`

#### Response `200 OK`
```json
{
  "sub": "e4b2d1c0-5a3f-4b6e-8d9c-0f1a2b3c4d5e",
  "email": "user@example.com",
  "email_verified": true
}
```

---

### 5.5 POST `/oauth/revoke`
Revokes an Access or Refresh Token, adding its JTI to the Redis revocation blacklist.

#### Request Body (`application/json`)
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "client_id": "client_abc123xyz789",
  "client_secret": "sec_8f9e0d1c2b3a4f5e6d7c8b9a0f1e2d3c"
}
```

#### Response `200 OK`
```json
{
  "message": "Token revoked successfully"
}
```
