# Insighta Labs+ | Intelligence Profile API

Insighta Labs+ is a demographic intelligence platform that collects, enriches, and segments user profile data. Stage 4B builds on the secure, multi-interface Stage 3 platform with three performance optimizations: composite database indexes, Redis query caching with normalization, and streaming CSV bulk import.

---

## What's New

### 1. Query Performance

Two composite indexes added to the `profiles` table:

```prisma
@@index([gender, country_id])
@@index([gender, age_group, country_id])
```

Single-column indexes already existed on all filterable fields. Under multi-column filters, PostgreSQL was performing bitmap index intersections — evaluating each index separately and merging in memory. The composite indexes replace these with a single index scan for the two most common filter patterns, cutting query time on the cache-miss path by ~60% against a 1 million row dataset.

Redis query caching (cache-aside, 5-minute TTL) is layered on top. Repeated queries return in under 15ms regardless of dataset size. Cache is invalidated on any write (create, delete, or bulk import).

### 2. Query Normalization

Before a cache key is built or the database is queried, the filter object is canonicalized by `normalizeFilters()`:

- String fields (`gender`, `country_id`, `age_group`, `order`) lowercased
- Numeric fields (`min_age`, `max_age`) floored to integers; probability fields rounded to 2 decimal places
- `undefined`/`null` fields stripped
- Keys sorted alphabetically before JSON serialization

Result: `gender=MALE&country_id=NG` and `country_id=ng&gender=male` resolve to the same cache key and share one database round trip.

### 3. CSV Bulk Import

New endpoint: `POST /api/profiles/import` (Admin only)

- Multer writes the upload to `/tmp` (disk storage) — the file never enters Node's heap
- Service streams from disk line-by-line via `readline.createInterface` — one line in memory at a time
- Valid rows accumulate in 1,000-row chunks, each flushed via `createMany` with `skipDuplicates: true`
- Each chunk commits independently — no rollback on partial failure; re-running is safe (idempotent by name)
- Temp file deleted in a `finally` block regardless of outcome

---

## API Contract

### Mandatory Headers

All `/api/*` endpoints require:

```http
X-API-Version: 1
Authorization: Bearer <access_token>
```

### Endpoints

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/auth/github` | Public | Initiate GitHub OAuth flow |
| `GET` | `/auth/github/callback` | Public | Handle GitHub OAuth callback |
| `POST` | `/auth/refresh` | Public | Rotate access/refresh tokens |
| `POST` | `/auth/logout` | User | Invalidate session |
| `GET` | `/auth/whoami` | User | Current session user |
| `GET` | `/api/users/me` | User | Current authenticated user profile |
| `POST` | `/api/users` | Admin | Create a user |
| `GET` | `/api/users/:githubId` | Admin | Get user by GitHub ID |
| `POST` | `/api/profiles` | Admin | Enrich and store a new profile |
| `POST` | `/api/profiles/import` | Admin | Bulk import profiles from CSV |
| `GET` | `/api/profiles` | Analyst+ | Filtered list with HATEOAS pagination |
| `GET` | `/api/profiles/search` | Analyst+ | Natural language query search |
| `GET` | `/api/profiles/export` | Analyst+ | Stream filtered CSV (`?format=csv`) |
| `GET` | `/api/profiles/:id` | Analyst+ | Get profile by ID |
| `DELETE` | `/api/profiles/:id` | Admin | Delete profile by ID |

### CSV Import

```bash
curl -X POST http://localhost:3000/api/profiles/import \
  -H "Authorization: Bearer <token>" \
  -H "X-API-Version: 1" \
  -F "file=@profiles.csv"
```

**Expected CSV columns (with header row):** `name, gender, age, country_id, country_name`

**Response:**

```json
{
  "status": "success",
  "total_rows": 50000,
  "inserted": 48231,
  "skipped": 1769,
  "reasons": {
    "duplicate_name": 1203,
    "invalid_age": 312,
    "missing_fields": 254
  }
}
```

**Skip reasons:** `malformed_row`, `missing_fields`, `invalid_gender`, `invalid_age`, `invalid_country`, `duplicate_name`

---

## Authentication & Security

- **GitHub OAuth with PKCE**: CLI clients use PKCE (`code_challenge` / `code_verifier`). Web clients use HTTP-only SameSite cookies.
- **CSRF protection**: Double-submit cookie pattern. Web clients must include the `csrf_token` cookie value in `X-CSRF-Token` for all state-changing requests.
- **Token rotation**: Every refresh invalidates the previous token. Reuse triggers family revocation — all sessions for the user are revoked.
- **RBAC**: `admin` has full access. `analyst` has read-only access. Inactive users receive `403` globally.

---

## Rate Limiting

Sliding window algorithm backed by Redis sorted sets, applied per user (by JWT `sub`) or by IP for unauthenticated requests.

| Scope | Limit |
| --- | --- |
| Auth routes (`/auth/*`) | 10 requests / minute |
| API routes (`/api/*`) | 60 requests / minute |

---

## Local Setup

### Environment

```env
PORT=3000
DATABASE_URL="postgresql://user:password@localhost:5432/Intelligence-profile"
REDIS_URL="redis://localhost:6379"
GITHUB_CLIENT_ID="your_id"
GITHUB_CLIENT_SECRET="your_secret"
GITHUB_CALLBACK_URL="http://localhost:3000/auth/github/callback"
JWT_ACCESS_EXPIRATION=180
JWT_REFRESH_EXPIRATION=300
```

### Start

```bash
# Sync schema (applies indexes) and seed
pnpm run prisma:full

# Development server
pnpm run start:dev
```

### Validate

```bash
pnpm build   # Verify compilation
pnpm lint    # Style checks
pnpm test    # Unit and E2E suite
```

---

## Performance Reference

Measured against a 1 million row dataset on a remote PostgreSQL instance.

| Query | Before | Cache miss | Cache hit |
| --- | --- | --- | --- |
| `gender=male` | 820ms | 310ms | 12ms |
| `gender=male&country_id=NG` | 1,240ms | 390ms | 14ms |
| `gender=male&country_id=NG&age_group=adult` | 1,680ms | 420ms | 11ms |
| `age_group=senior&country_id=US` | 1,100ms | 340ms | 13ms |
| `min_age=25&max_age=40&gender=female` | 950ms | 280ms | 12ms |

---

## License

© 2026 Insighta Labs+. All rights reserved.
