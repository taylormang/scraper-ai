# Database Setup Guide

This project uses **PostgreSQL** (with Drizzle ORM) and **Redis** for data storage and job queue management.

## Quick Start

### 1. Start Databases with Docker Compose

```bash
# From project root
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

This starts:
- **PostgreSQL 16** on port `5432`
- **Redis 7** on port `6379`

### 2. Run Database Migrations

```bash
# Generate migration from schema
npm run db:generate -w apps/api

# Apply migration to database
npm run db:migrate -w apps/api

# Alternative: Push schema directly (for rapid prototyping)
npm run db:push -w apps/api
```

### 3. Verify Connection

```bash
# Start API server
npm run dev:api

# Check health
curl http://localhost:3001/api/status
```

You should see `database: "connected"` in the response.

##  3-Stage Strategy

### Stage 1: Local Docker (Current - Free)

**Use for**: Development and prototyping

```env
DATABASE_URL=postgresql://postgres:devpassword@localhost:5432/scraper_dev
REDIS_URL=redis://localhost:6379
```

**Benefits**:
- Zero cost
- Fast iteration
- Matches production environment
- No vendor lock-in

**Commands**:
```bash
# Start
docker compose up -d

# Stop
docker compose down

# Reset data (⚠️ deletes everything)
docker compose down -v
```

### Stage 2: Self-Hosted VPS (Optional - Free)

**Use for**: Personal production, demos, testing with real traffic

**Deploy**:
```bash
# Copy docker-compose.yml to your VPS
scp docker-compose.yml user@your-vps:/path/to/scraper/

# On VPS
cd /path/to/scraper
docker compose up -d

# Set environment variables
export DATABASE_URL="postgresql://postgres:SECURE_PASSWORD@localhost:5432/scraper_prod"
export REDIS_URL="redis://localhost:6379"
```

**Automated Backups**:
```bash
# Add to crontab (daily backup at 2 AM)
0 2 * * * pg_dump scraper_prod | gzip > /backups/scraper-$(date +\%Y\%m\%d).sql.gz
```

### Stage 3: Managed Production (When Scaling - Paid)

**Recommended**: **Supabase** (PostgreSQL) + **Upstash** (Redis)

#### Supabase Setup (PostgreSQL)

1. Sign up at [supabase.com](https://supabase.com)
2. Create new project
3. Copy connection string from Settings → Database
4. Update `.env`:

```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@[PROJECT].supabase.co:5432/postgres
```

**Cost**: $0 (free tier) or $25/month (paid)

**Benefits**:
- Auto-backups included
- Realtime subscriptions
- Built-in auth
- PostgREST API
- Dashboard and SQL editor

#### Upstash Setup (Redis)

1. Sign up at [upstash.com](https://upstash.com)
2. Create new database
3. Copy connection string
4. Update `.env`:

```env
REDIS_URL=redis://default:[PASSWORD]@[ENDPOINT].upstash.io:6379
```

**Cost**: $0 (10K commands/day free) or ~$5-10/month

**Benefits**:
- Serverless (pay per use)
- Global edge caching
- Durable Redis

#### Migration to Managed Services

```bash
# 1. Run migrations on new database
DATABASE_URL="your-supabase-url" npm run db:migrate -w apps/api

# 2. Update environment variables
export DATABASE_URL="your-supabase-url"
export REDIS_URL="your-upstash-url"

# 3. Restart API server
npm start -w apps/api
```

No code changes required - just update connection strings!

## Database Schema

### Scrapes Table
Stores scraping operations and their results.

```typescript
{
  id: UUID (PK),
  name: TEXT,
  status: TEXT, // 'pending' | 'processing' | 'completed' | 'failed'
  config: JSONB, // ScraperConfig (flexible configuration)
  results: JSONB, // Extracted data (flexible schema)
  error: TEXT?,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP
}
```

### Jobs Table
Tracks background job queue (BullMQ integration).

```typescript
{
  id: UUID (PK),
  scrapeId: UUID (FK → scrapes),
  status: TEXT, // 'pending' | 'active' | 'completed' | 'failed'
  attempts: INTEGER,
  progress: INTEGER, // 0-100 percentage
  error: TEXT?,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP
}
```

### Datasets Table
Organizes scraped data collections.

```typescript
{
  id: UUID (PK),
  name: TEXT,
  description: TEXT?,
  schema: JSONB, // Auto-generated schema metadata
  items: JSONB, // Array of scraped items
  itemCount: INTEGER,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP
}
```

## Drizzle ORM Commands

### Migrations

```bash
# Generate migration from schema changes
npm run db:generate -w apps/api

# Apply migrations to database
npm run db:migrate -w apps/api

# Push schema directly (skip migration files)
npm run db:push -w apps/api
```

### Drizzle Studio (Visual DB Browser)

```bash
# Open visual database browser
npm run db:studio -w apps/api

# Opens at https://local.drizzle.studio
```

Drizzle Studio provides a web-based UI to:
- Browse tables and data
- Edit records visually
- Run queries
- View relationships

## Type-Safe Queries with Drizzle

```typescript
import { db } from './db/index.js';
import { scrapes } from './db/schema.js';
import { eq, desc } from 'drizzle-orm';

// Select all completed scrapes
const completed = await db
  .select()
  .from(scrapes)
  .where(eq(scrapes.status, 'completed'))
  .orderBy(desc(scrapes.createdAt));

// Insert new scrape
const [newScrape] = await db
  .insert(scrapes)
  .values({
    name: 'My Scrape',
    status: 'pending',
    config: { baseUrl: 'https://example.com' },
  })
  .returning();

// Query inside JSON (powerful for scraped data!)
const maxPages5 = await db
  .select()
  .from(scrapes)
  .where(sql`config->>'maxPages' = '5'`);
```

## Troubleshooting

### Docker Not Running

**Error**: `Cannot connect to the Docker daemon`

**Solution**:
```bash
# macOS: Start Docker Desktop
open -a Docker

# Linux: Start Docker service
sudo systemctl start docker

# Verify Docker is running
docker ps
```

### Database Connection Failed

**Error**: `connection refused` or `database does not exist`

**Check**:
```bash
# Verify containers are running
docker compose ps

# Check PostgreSQL logs
docker compose logs postgres

# Test connection manually
docker exec -it scraper-postgres psql -U postgres -d scraper_dev
```

### Migration Errors

**Error**: `relation "scrapes" already exists`

**Solution**:
```bash
# Drop all tables and re-run migrations
docker compose down -v  # ⚠️ Deletes all data!
docker compose up -d
npm run db:push -w apps/api
```

### Redis Not Connecting

**Check**:
```bash
# Test Redis connection
docker exec -it scraper-redis redis-cli ping
# Should return: PONG

# Check Redis logs
docker compose logs redis
```

## Cost Comparison

| Stage | PostgreSQL | Redis | Total/Month |
|-------|-----------|-------|-------------|
| **Local Docker** | $0 | $0 | **$0** |
| **VPS (Self-Hosted)** | $0 (included) | $0 (included) | **$0** |
| **Light Production** | $0 (Supabase free) | $0 (Upstash free) | **$0** |
| **Production** | $25 (Supabase) | $5-10 (Upstash) | **$30-35** |

## Next Steps

1. ✅ **Install Docker** if not already installed
2. ✅ **Start databases**: `docker compose up -d`
3. ✅ **Run migrations**: `npm run db:push -w apps/api`
4. ✅ **Verify connection**: Check `/api/status`
5. ⬜ **Implement Phase 2**: Job queue with BullMQ (see #1)
6. ⬜ **Build API endpoints**: CRUD operations (see #2)

## Related Documentation

- [API Server README](/apps/api/README.md) - API server documentation
- [GitHub Issue #6](https://github.com/taylormang/scraper-ai/issues/6) - Database setup ticket
- [Drizzle ORM Docs](https://orm.drizzle.team) - Official Drizzle documentation
- [PostgreSQL Docs](https://www.postgresql.org/docs/) - PostgreSQL reference

---

**Built with**: Drizzle ORM · PostgreSQL 16 · Redis 7 · Docker Compose
