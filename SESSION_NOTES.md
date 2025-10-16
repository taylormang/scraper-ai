# Session Notes

## Session 2025-10-15: MCP Integration & Database Prep

### Session Goals
Build a functional scraping system callable via API and MCP server, then add database persistence.

### Completed This Session

#### 1. Minimal Scrape API (✅ Complete)
- Installed Firecrawl SDK in API server
- Created `ScraperService` class wrapping Firecrawl API
- Built `POST /api/scrapes` endpoint
- Returns markdown, HTML, and metadata
- Tested and working with production Firecrawl API

**Files Created:**
- `apps/api/src/services/scraper.ts` - Firecrawl service wrapper
- `apps/api/src/routes/scrapes.ts` - Scrape API endpoints
- `apps/api/.env` - Configuration with API keys

**Test:**
```bash
curl -X POST http://localhost:3001/api/scrapes \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

#### 2. MCP → API Integration (✅ Complete)
- Added `scrape_url` tool to MCP server
- MCP server calls API via fetch to localhost:3001
- Updated Claude Desktop config to include scraper MCP server
- Full end-to-end working

**Files Modified:**
- `apps/mcp-server/src/index.ts` - Added scrape_url tool
- `~/Library/Application Support/Claude/claude_desktop_config.json` - Added scraper server

**Architecture:**
```
User → Claude Desktop
     ↓ (MCP protocol)
     MCP Server (Node.js) - scrape_url tool
     ↓ (HTTP fetch to localhost:3001)
     API Server (Express)
     ↓ (Firecrawl SDK)
     Firecrawl API
     ↓
     Target Website
```

#### 3. Development Tooling (✅ Complete)
- Installed `concurrently` for multi-app development
- Created `npm run dev:all` command
- Runs API + Web with colored, prefixed logs
- Makes debugging much easier

**Added to root package.json:**
```json
"dev:all": "concurrently -n api,web -c blue,magenta \"npm run dev:api\" \"npm run dev:web\""
```

#### 4. Documentation Updates (✅ Complete)
- Updated `PROGRESS.md` with latest status
- Updated `apps/api/README.md` with dev:all command
- Rewrote `CLAUDE.md` with complete setup guide
- Updated session tracking in PROGRESS.md

### Current State

**Working:**
- ✅ Scrape any URL via API
- ✅ Scrape any URL via Claude Desktop (natural language)
- ✅ Returns markdown + HTML + metadata
- ✅ All apps run together with nice logs

**Not Yet Implemented:**
- ⬜ Results aren't saved to database
- ⬜ No scrape history/query endpoints
- ⬜ No job queue for async processing

### Database Schema (Already Exists)

The database schema is already defined in `apps/api/src/db/schema.ts`:

```typescript
scrapes {
  id: uuid (primary key)
  name: text (e.g., URL being scraped)
  status: text ('pending' | 'processing' | 'completed' | 'failed')
  config: jsonb (scrape configuration)
  results: jsonb (scraped data)
  error: text (error message if failed)
  createdAt: timestamp
  updatedAt: timestamp
}

jobs {
  id: uuid
  scrapeId: uuid (foreign key)
  status: text
  attempts: integer
  progress: integer (0-100)
  error: text
  createdAt: timestamp
  updatedAt: timestamp
}

datasets {
  id: uuid
  name: text
  description: text
  schema: jsonb
  items: jsonb
  itemCount: integer
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Next Phase: Database Persistence

**Goals:**
1. Connect API server to PostgreSQL
2. Save each scrape execution to database
3. Add GET endpoints to retrieve scrape history
4. Update MCP server to show recent scrapes (optional)

**Files to Modify:**
1. `apps/api/src/db/index.ts` - Initialize database connection
2. `apps/api/src/services/scraper.ts` - Add database save logic
3. `apps/api/src/routes/scrapes.ts` - Add GET endpoints for history

**Implementation Plan:**
- Use Drizzle ORM (already configured)
- Store scrape runs with status tracking
- Save results as JSONB for flexibility
- Add basic query endpoints (GET /api/scrapes, GET /api/scrapes/:id)

### Issues Encountered & Solutions

**Issue 1: API server crashed without visible errors**
- **Problem**: Running in background, errors not visible in terminal
- **Solution**: Installed `concurrently` to show all logs with prefixes

**Issue 2: MCP tool failed silently**
- **Problem**: API server wasn't running, MCP tool failed
- **Solution**: Document requirement to run `npm run dev:all` before testing

**Issue 3: Firecrawl response structure**
- **Problem**: Response format changed, had `result.data` wrapper
- **Solution**: Updated scraper service to handle both `result.data` and direct `result`

### Environment Setup

**Required Environment Variables** (`apps/api/.env`):
```env
FIRECRAWL_API_KEY=fc-xxx
OPENAI_API_KEY=sk-xxx
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
DATABASE_URL=postgresql://postgres:devpassword@localhost:5432/scraper_dev
REDIS_URL=redis://localhost:6379
```

### Testing Instructions

**Start All Apps:**
```bash
npm run dev:all
```

**Test API Directly:**
```bash
curl -X POST http://localhost:3001/api/scrapes \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

**Test via Claude Desktop:**
1. Ensure API server is running: `npm run dev:all`
2. Restart Claude Desktop to load MCP server
3. Ask: "Can you scrape https://example.com for me?"
4. Claude should use the `scrape_url` tool

### Key Learnings

1. **MCP Integration**: MCP servers communicate via stdio, so background processes need special handling
2. **Development UX**: `concurrently` is essential for monorepo development with multiple services
3. **Error Visibility**: Prefixed logs make debugging multi-app systems much easier
4. **API Integration**: MCP server can call localhost APIs, enabling clean separation of concerns

### Next Session Preparation

**To start next session:**
1. Run `npm run dev:all` to start API + Web
2. Verify PostgreSQL is running (Docker Compose)
3. Review database schema in `apps/api/src/db/schema.ts`
4. Begin implementing database connection and save logic

**Quick Start Commands:**
```bash
# Start databases
docker compose up -d

# Start all apps
npm run dev:all

# Test scrape endpoint
curl -X POST http://localhost:3001/api/scrapes \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```
