# Intelligence Profile API

A NestJS-based REST API that predicts and stores profile data (gender, age, and nationality) for a given name using external services (Genderize, Agify, and Nationalize).

## Features

- **Profile Enrichment**: Automatically fetches and stores gender, age, and nationality data for any given name.
- **Idempotency**: Seamlessly handles duplicate requests by returning existing profiles.
- **Advanced Filtering**: Search stored profiles by gender, country, age group, age ranges, and probability thresholds.
- **Natural Language Query**: Interpret plain English queries and convert them into database filters.
- **Sorting & Pagination**: Flexible result ordering with configurable pagination (max 50 items per page).
- **Global Error Handling**: Standardized error responses following a strict format.
- **Persistence**: Managed PostgreSQL database with Prisma ORM.
- **API Documentation**: Integrated Swagger/OpenAPI UI.

## API Documentation

### Base URL

The API uses a global `/api` prefix for business logic, while health checks are available at the root.

```url
http://localhost:3000
```

### Endpoints

#### `GET /`

Health check endpoint.
**Response:** `Hello World!`

#### `GET /health`

Service health status.
**Response:** `{"status": "ok"}`

#### `GET /api/classify?name=<name>`

Predict gender for a name (read-only).
**Example:** `GET /api/classify?name=john`

#### `POST /api/profiles`

Create or retrieve an enriched profile.
**Body:** `{"name": "peter"}`
**Success Response (201/200):**

```json
{
  "status": "success",
  "data": {
    "id": "uuid-v7",
    "name": "peter",
    "gender": "male",
    "gender_probability": 0.99,
    "age": 42,
    "age_group": "adult",
    "country_id": "US",
    "country_name": "United States",
    "country_probability": 0.8,
    "created_at": "..."
  }
}
```

#### `GET /api/profiles/:id`

Retrieve a profile by its ID.

#### `GET /api/profiles`

List all profiles with optional filters, sorting, and pagination.

**Query Parameters:**

- **Filters:** `gender`, `country_id`, `age_group`, `min_age`, `max_age`, `min_gender_probability`, `min_country_probability`
- **Sorting:** `sort_by` (age | created_at | gender_probability), `order` (asc | desc)
- **Pagination:** `page` (default: 1), `limit` (default: 10, max: 50)

**Example:**

```
GET /api/profiles?gender=male&country_id=NG&min_age=25&sort_by=age&order=desc&page=1&limit=20
```

**Response:**

```json
{
  "status": "success",
  "page": 1,
  "limit": 20,
  "total": 2026,
  "data": [...]
}
```

#### `GET /api/profiles/search`

Search profiles using natural language queries.

**Query Parameters:**

- `q` (required): Natural language search query
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 50)

**Example:**

```
GET /api/profiles/search?q=young males from nigeria&page=1&limit=10
```

**Response:** Same format as `GET /api/profiles`

##### Natural Language Query Engine

The search endpoint uses **rule-based parsing** (no AI/LLMs) to interpret plain English queries and convert them into structured database filters.

**Supported Query Patterns:**

| Query Pattern | Interpretation |
|--------------|----------------|
| `"young males"` | `gender=male`, `min_age=16`, `max_age=24` |
| `"females above 30"` | `gender=female`, `min_age=30` |
| `"people from angola"` | `country_id=AO` |
| `"adult males from kenya"` | `gender=male`, `age_group=adult`, `country_id=KE` |
| `"male and female teenagers above 17"` | `age_group=teenager`, `min_age=17` |
| `"women under 25 from canada"` | `gender=female`, `max_age=25`, `country_id=CA` |

**Parsing Rules:**

- **Gender:** Extracts "male/males/man/men" or "female/females/woman/women" (both = no filter)
- **Age Groups:** Recognizes "child", "teenager", "adult", "senior"
- **Age Ranges:**
  - "young" → ages 16-24
  - "above/over/older than [N]" → `min_age=N`
  - "under/below/younger than [N]" → `max_age=N`
- **Countries:** Matches country names, ISO codes, and common aliases (e.g., "USA", "Nigeria", "UK")
- **Sorting:** Detects sort keywords and field names (e.g., "sorted by age descending")

**Error Handling:**

If the query cannot be interpreted, the API returns:

```json
{
  "status": "error",
  "message": "Unable to interpret query"
}
```

#### `DELETE /api/profiles/:id`

Delete a profile by its ID.

## Local Development

### Prerequisites

- Node.js v20+
- pnpm
- Docker

### Setup

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Configure environment variables**

   Copy `.env.example` to `.env` and set the required values, especially:

   - `DATABASE_URL`
   - `PROXY_URL`

3. **Start the local database**

   For the first run:

   ```bash
   pnpm run docker:up
   ```

   For subsequent runs, if the container already exists:

   ```bash
   pnpm run docker:start
   ```

4. **Generate the Prisma client**

   ```bash
   pnpm run prisma:generate
   ```

   This generates the Prisma client from `schema.prisma`. It does not usually require the database to be running, but it must succeed before the app can use `PrismaClient`.

5. **Sync the schema to the local database**

   ```bash
   pnpm run db:push
   ```

   This applies the current Prisma schema to your local database, so the database container must be running first.

6. **Start the development server**

   ```bash
   pnpm run start:dev
   ```

### Stop the database

```bash
pnpm run docker:stop
```

## Prisma Schema Updates

> **⚠️ IMPORTANT:** After **any** change to `prisma/schema.prisma`:

```bash
# Ensure DB is running
pnpm run prisma:update
# or
# to also re-run seeds if needed
pnpm run prisma:full
```

**Skip these steps =** `Cannot find module '.prisma/client'` or missing model fields.

### Common errors prevented

- `Could not resolve @prisma/client`
- TypeScript missing new model fields
- Seed script crashes on undefined fields
- Runtime `PrismaClient` initialization failures

## Data Seeding

The project includes a seed script to populate the database with 2026 sample profiles.

```bash
pnpm run db:seed
```

**Note:** Re-running the seed command will not create duplicates. The script uses `upsert` operations based on normalized (lowercase) names to ensure idempotency.

## Testing

```bash
pnpm run test        # Unit tests
pnpm run test:e2e    # E2E tests
```

## Deployment

### Render Deployment

This project is configured for seamless deployment to [Render](https://render.com) using the provided `render.yaml` blueprint.

**Deployment Steps:**

1. Connect your GitHub repository to Render.
2. Render will detect `render.yaml` and provision:
   - A managed PostgreSQL instance.
   - A Node.js Web Service.
3. The build command `pnpm build` automatically handles Prisma client generation and database schema synchronization (using `prisma db push` or `prisma migrate deploy`).

**Required Environment Variables:**

- `PROXY_URL`: Proxy URL for upstream API requests (required if using a proxy).
- `DATABASE_URL`: Automatically linked from the managed database.

## License

UNLICENSED
