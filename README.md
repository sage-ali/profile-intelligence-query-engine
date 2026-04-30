# Insighta Labs+ | Intelligence Profile API (Stage 3)

Insighta Labs+ is a demographic intelligence platform that collects, enriches, and segments user profile data. This Stage 3 release upgrades the system into a secure, multi-interface platform with robust Authentication (PKCE), Role-Based Access Control (RBAC), and advanced Querying capabilities.

---

## 🚀 Core Outcomes

- **Secure Access**: Mandatory authentication via GitHub OAuth with PKCE.
- **Session Management**: Secure lifecycle using Access (3m) and Refresh (5m) tokens with family rotation.
- **RBAC**: Strict role enforcement (`admin` vs `analyst`).
- **Modernized API**: Global versioning, HATEOAS pagination, and filtered CSV streaming.
- **Scalability**: Redis-backed sliding window rate limiting and structured logging.

---

## 🛠 Features & Technical Implementation

### 1. Authentication & Security (PKCE Flow)

We implement a high-security OAuth2 flow tailored for both Web and CLI clients:

- **CLI Flow**: Supports PKCE (Proof Key for Code Exchange). The CLI generates a `code_challenge`, and the backend verifies the `code_verifier` during the exchange.
- **Web Flow**: Uses secure, HTTP-only, SameSite=Lax cookies to prevent XSS and CSRF.
- **CSRF Protection**: Double-submit cookie pattern protects state-changing operations. Web clients must include the `csrf_token` cookie value in the `X-CSRF-Token` header for POST, PUT, DELETE, and PATCH requests.
- **Token Rotation**: On every refresh, the old refresh token is immediately invalidated, and a new pair is issued. Reusing an old token triggers a "Family Revocation," logging out all sessions for that user as a security precaution.

### 2. Role-Based Access Control (RBAC)

User permissions are managed through a structured decorator approach:

- **`admin`**: Full access. Can create, delete, and query profiles.
- **`analyst`**: Read-only access. Can list, search, and export profiles.
- **`ActiveUserGuard`**: A global guard that checks the `is_active` flag. Inactive users receive a `403 Forbidden` on all requests.

### 3. Intelligence Query Engine (Stage 2 Core)

- **Natural Language Query (NLQ)**: A rule-based parsing engine (No AI/LLM required) that converts plain English into structured filters.
  - *Example*: `young males from nigeria` → `gender=male, min_age=16, max_age=24, country_id=NG`.
- **Advanced Filtering**: Combine 7+ parameters (age ranges, probability thresholds, country codes) into a single query.
- **HATEOAS Pagination**: Responses include `total_pages` and a `links` object providing `self`, `next`, and `prev` navigation URLs.

### 4. CSV Export Engine

- **Endpoint**: `GET /api/profiles/export?format=csv`
- **Streaming**: Native Node.js stream implementation to handle large datasets without memory spikes.
- **Consistency**: Supports the exact same filtering and sorting parameters as the standard list endpoint.

---

## 📡 API Contract

### Mandatory Headers

All `/api/*` endpoints require:

```http
X-API-Version: 1
Authorization: Bearer <access_token>  (or valid session cookie)
```

### Key Endpoints

| Method | Endpoint | Access | Description |
|:--- |:--- |:--- |:--- |
| `GET` | `/auth/github` | Public | Initiates GitHub OAuth flow. |
| `GET` | `/auth/github/callback` | Public | Handles GitHub OAuth callback. |
| `POST` | `/auth/refresh` | Public | Rotates Access/Refresh tokens. |
| `POST` | `/auth/logout` | User | Invalidates refresh token and clears session. |
| `GET` | `/auth/whoami` | User | Returns the current session's user data. |
| `GET` | `/auth/csrf-token` | User | Retrieves CSRF token for web clients. |
| `GET` | `/api/users/me` | User | Returns the current authenticated user's profile. |
| `POST` | `/api/users` | Admin | Creates a new user. |
| `GET` | `/api/users/:githubId` | Admin | Retrieves a user by GitHub ID. |
| `POST` | `/api/profiles` | Admin | Enriches and stores a new profile. |
| `GET` | `/api/profiles` | Analyst+ | Advanced filtered search with HATEOAS. |
| `GET` | `/api/profiles/:id` | Analyst+ | Retrieves a single profile by ID. |
| `DELETE` | `/api/profiles/:id` | Admin | Deletes a profile by ID. |
| `GET` | `/api/profiles/search` | Analyst+ | Natural Language Query search. |
| `GET` | `/api/profiles/export` | Analyst+ | Streams filtered CSV (Requires `?format=csv`). |

---

## ⚙️ Rate Limiting & Observability

- **Auth Throttling**: 10 requests / minute (Prevents brute-force).
- **API Throttling**: 60 requests / minute / user (Ensures fair usage).
- **Logging**: Every request is captured by a `LoggingInterceptor` that records:
  - `Method`, `Path`, `Status Code`, `Response Time (ms)`, and `Correlation ID`.

---

## 🔒 CSRF Protection for Web Clients

The system implements the **double-submit cookie pattern** for CSRF protection:

1. **Token Generation**: Upon successful login or token refresh, the server issues a `csrf_token` cookie (readable by JavaScript).
2. **Token Submission**: Web clients must include this token in the `X-CSRF-Token` header for all state-changing requests (POST, PUT, DELETE, PATCH).
3. **Token Validation**: The server validates that the header value matches the cookie value before processing the request.

**JavaScript Example**:

```javascript
// Retrieve CSRF token from cookie
function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

// Make authenticated request with CSRF protection
fetch('/api/profiles', {
  method: 'POST',
  headers: {
    'X-API-Version': '1',
    'X-CSRF-Token': getCookie('csrf_token'),
    'Content-Type': 'application/json',
  },
  credentials: 'include', // Include cookies
  body: JSON.stringify({ name: 'Jane Doe' }),
});
```

**Note**: CLI and API clients using Bearer token authentication are **exempt** from CSRF protection as they don't use cookies.

**Token Retrieval**: If needed, web clients can fetch a fresh CSRF token via `GET /auth/csrf-token`.

---

## 🛠 Local Setup

### 1. Environment Configuration

Create a `.env` file based on `.env.example`:

```env
PORT=3000
DATABASE_URL="postgresql://sage:sage@12345@localhost:5432/Intelligence-profile"
REDIS_URL="redis://localhost:6379"

# GitHub OAuth
GITHUB_CLIENT_ID="your_id"
GITHUB_CLIENT_SECRET="your_secret"
GITHUB_CALLBACK_URL="http://localhost:3000/auth/github/callback"

# Token Expiry (Seconds)
JWT_ACCESS_EXPIRATION=180
JWT_REFRESH_EXPIRATION=300
```

### 2. Infrastructure

```bash
# Start Postgres & Redis
docker compose up -d

# Sync Schema & Seed 2026 Profiles
pnpm prisma db push
pnpm run db:seed

# Start Server
pnpm run start:dev
```

---

## 🧪 Validation

```bash
pnpm build  # Verify compilation
pnpm lint   # Enforce style standards
pnpm test   # Run Unit and E2E regression suite
```

---

## 📜 License

© 2026 Insighta Labs+. All rights reserved.
