# Ticket: API Server Engine

**Status**: Ready to implement
**Priority**: High
**Created**: 2025-10-13

## Objective

Build a robust API server (`apps/api`) that serves as the core execution engine for web scraping operations and long-running background processes. This server will handle scrape execution, job queue management, data storage, and provide REST endpoints for the web application.

## Context

The API server is a critical piece of the architecture that bridges:
- **MCP Server** → Plans scrapes through conversational interface
- **API Server** → Executes scrapes and manages background jobs (THIS TICKET)
- **Web App** → Visualizes data and provides manual scraping interface

This server will handle:
- Asynchronous scrape execution
- Job queue management for long-running tasks
- Data persistence (PostgreSQL/Redis)
- REST API endpoints for web app integration
- Webhook support for external integrations

## Architecture

### Tech Stack
- **Framework**: Express.js with TypeScript
- **Queue**: BullMQ (Redis-based job queue)
- **Database**: PostgreSQL (via Prisma ORM)
- **Cache**: Redis
- **API Style**: REST (GraphQL optional future enhancement)
- **Process Management**: PM2 or built-in worker threads

### File Structure
```
apps/api/
├── src/
│   ├── index.ts              # Express app entry point
│   ├── server.ts             # HTTP server setup
│   ├── config/               # Configuration management
│   │   └── index.ts
│   ├── routes/               # API route handlers
│   │   ├── index.ts          # Route aggregation
│   │   ├── scrapes.ts        # Scrape CRUD operations
│   │   ├── jobs.ts           # Job status and management
│   │   └── health.ts         # Health check endpoints
│   ├── services/             # Business logic layer
│   │   ├── scraper.service.ts    # Scraping orchestration
│   │   ├── queue.service.ts      # Job queue management
│   │   └── storage.service.ts    # Data persistence
│   ├── workers/              # Background job processors
│   │   ├── scrape.worker.ts      # Scrape execution worker
│   │   └── monitor.worker.ts     # Change detection worker
│   ├── middleware/           # Express middleware
│   │   ├── auth.ts           # Authentication (future)
│   │   ├── error.ts          # Error handling
│   │   └── validation.ts     # Request validation
│   └── types/                # TypeScript types
│       └── index.ts
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Implementation Steps

### Phase 1: Basic Express Server ✅
- [x] Create `apps/api` directory structure
- [x] Set up `package.json` with Express and TypeScript dependencies
- [x] Create `tsconfig.json` extending base config
- [x] Implement basic Express server with health check endpoint
- [x] Add CORS, body parsing, error handling middleware
- [x] Create dev and build scripts
- [x] Test server starts and responds to requests

### Phase 2: Job Queue System
- [ ] Install BullMQ and configure Redis connection
- [ ] Create `queue.service.ts` for job management
- [ ] Implement basic job queue for scrape tasks
- [ ] Create scrape worker with simple logging
- [ ] Add job status tracking (pending, processing, completed, failed)
- [ ] Implement retry logic and error handling
- [ ] Add queue monitoring dashboard (Bull Board)

### Phase 3: API Routes
- [ ] Create `/api/scrapes` endpoints (POST, GET, GET/:id, DELETE/:id)
- [ ] Create `/api/jobs` endpoints (GET, GET/:id, POST/:id/retry, DELETE/:id)
- [ ] Implement request validation middleware
- [ ] Add API documentation (OpenAPI/Swagger)
- [ ] Create `/api/health` with detailed system status
- [ ] Add rate limiting middleware

### Phase 4: Database Integration (Future)
- [ ] Set up Prisma ORM with PostgreSQL
- [ ] Define schema for scrapes, jobs, datasets
- [ ] Create migration system
- [ ] Implement `storage.service.ts`
- [ ] Add connection pooling and query optimization

### Phase 5: Scraping Engine Integration (Future)
- [ ] Create `packages/scraping-engine` with Firecrawl client
- [ ] Integrate scraping engine with worker
- [ ] Implement navigation pattern detection
- [ ] Add content extraction logic
- [ ] Create result validation and storage

## API Endpoints (Initial)

### Scrapes
```
POST   /api/scrapes          # Create new scrape job
GET    /api/scrapes          # List all scrapes (paginated)
GET    /api/scrapes/:id      # Get scrape details
DELETE /api/scrapes/:id      # Cancel/delete scrape
POST   /api/scrapes/:id/retry # Retry failed scrape
```

### Jobs
```
GET    /api/jobs             # List all jobs with status
GET    /api/jobs/:id         # Get job details and progress
POST   /api/jobs/:id/cancel  # Cancel running job
DELETE /api/jobs/:id         # Delete completed job
```

### System
```
GET    /api/health           # Health check
GET    /api/status           # System status (queue length, workers, etc.)
GET    /api/metrics          # Performance metrics
```

## Environment Variables

```env
# Server
PORT=3001
NODE_ENV=development
API_KEY_SECRET=your-secret-key-here

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Database (future)
DATABASE_URL=postgresql://user:password@localhost:5432/scraper

# External Services (future)
FIRECRAWL_API_KEY=
OPENAI_API_KEY=
```

## Integration Points

### MCP Server → API Server
The MCP server will call the API server's REST endpoints to:
- Create scrape jobs via POST /api/scrapes
- Check job status via GET /api/jobs/:id
- Fetch results via GET /api/scrapes/:id

### Web App → API Server
The web application will consume the API for:
- Displaying scrape history
- Creating manual scrapes
- Monitoring job progress
- Managing datasets

### API Server → Packages
The API server will use internal packages:
- `@scraper/scraping-engine` - Firecrawl integration and scraping logic
- `@scraper/shared-types` - Common types across all apps
- `@scraper/ai-utils` (future) - LLM helpers for content analysis

## Success Criteria

**Phase 1 (This Ticket):**
- ✅ API server starts successfully
- ✅ Health check endpoint returns 200
- ✅ CORS configured for web app origin
- ✅ Error handling middleware catches errors
- ✅ TypeScript compiles without errors
- ✅ Dev mode with hot reload works

**Phase 2:**
- [ ] Can enqueue a scrape job
- [ ] Worker picks up and processes job
- [ ] Job status updates correctly
- [ ] Failed jobs retry automatically
- [ ] Bull Board UI accessible

**Phase 3:**
- [ ] All CRUD endpoints working
- [ ] Request validation prevents invalid data
- [ ] API documentation generated
- [ ] Rate limiting prevents abuse
- [ ] Integration tests pass

## Testing Strategy

### Unit Tests
- Service layer logic (queue, storage)
- Middleware functions (error handling, validation)
- Worker job processing logic

### Integration Tests
- API endpoint responses
- Job queue flow (enqueue → process → complete)
- Database operations (future)

### Manual Testing
- Use Thunder Client/Postman to test endpoints
- Monitor Bull Board for queue health
- Test error scenarios (Redis down, invalid requests)

## Future Enhancements

- GraphQL API alongside REST
- WebSocket support for real-time job updates
- API key authentication and rate limiting per user
- Webhook support for job completion notifications
- Multi-tenancy support
- Horizontal scaling with multiple workers
- Metrics and observability (Prometheus, Grafana)

## Dependencies

**Core:**
- `express` - Web framework
- `bullmq` - Job queue
- `ioredis` - Redis client
- `zod` - Request validation
- `cors` - CORS middleware
- `helmet` - Security headers
- `express-rate-limit` - Rate limiting

**Dev:**
- `tsx` - TypeScript execution
- `nodemon` - Hot reload
- `@types/express` - TypeScript types
- `@types/cors` - TypeScript types

**Future:**
- `prisma` - ORM for PostgreSQL
- `bull-board` - Queue monitoring UI
- `swagger-jsdoc` & `swagger-ui-express` - API docs
- `pino` - Structured logging

## Notes

- Start simple with in-memory or basic Redis storage for Phase 1
- Add Prisma + PostgreSQL only when needed for complex queries
- Keep the API stateless for horizontal scaling
- Use environment variables for all configuration
- Follow REST best practices (proper status codes, resource naming)
- Keep services focused and testable (single responsibility)

## Related Documents

- `/docs/technical_architecture.md` - Overall system architecture
- `/docs/product_vision.md` - Product goals and use cases
- `/PROGRESS.md` - Project status

---

**Ready to implement Phase 1**: Basic Express server with health check and error handling.
