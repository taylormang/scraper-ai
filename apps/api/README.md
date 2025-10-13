# @scraper/api

REST API server and execution engine for web scraping operations and background job processing.

## Overview

The API server is the core execution engine that handles:
- Asynchronous scrape job execution
- Background task processing via job queues
- Data persistence and retrieval
- REST API endpoints for web app and MCP server integration

## Features

**Current (Phase 1):**
- ✅ Express server with TypeScript
- ✅ Health check and status endpoints
- ✅ CORS configuration
- ✅ Error handling middleware
- ✅ Request validation with Zod
- ✅ Environment configuration
- ✅ Hot reload development mode

**Coming Soon:**
- Job queue system (BullMQ + Redis)
- Scrape execution endpoints
- Database integration (Prisma + PostgreSQL)
- Scraping engine integration
- API documentation (Swagger)
- Rate limiting and authentication

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Redis (for job queue - Phase 2)
- PostgreSQL (for database - Phase 4)

### Installation

Dependencies are managed at the monorepo level:

```bash
# From repo root
npm install
```

### Configuration

Copy the example environment file:

```bash
cd apps/api
cp .env.example .env
```

Edit `.env` with your configuration:

```env
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

### Development

```bash
# Run API server only
npm run dev -w apps/api

# From apps/api directory
npm run dev
```

Server will start at [http://localhost:3001](http://localhost:3001)

### Build

```bash
# Build for production
npm run build -w apps/api

# Start production server
npm start -w apps/api
```

## Project Structure

```
apps/api/
├── src/
│   ├── index.ts              # Express app entry point
│   ├── config/               # Configuration management
│   │   └── index.ts          # Environment variable loading
│   ├── routes/               # API route handlers
│   │   ├── index.ts          # Route aggregation
│   │   └── health.ts         # Health check endpoints
│   ├── middleware/           # Express middleware
│   │   └── error.ts          # Error handling
│   └── types/                # TypeScript types
│       └── index.ts          # Shared types
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## API Endpoints

### System Endpoints

```
GET  /                        # API information
GET  /api/health              # Health check
GET  /api/status              # Detailed system status
```

### Example Responses

**Health Check:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-10-13T10:00:00.000Z",
    "uptime": 123.45,
    "environment": "development",
    "version": "0.1.0"
  },
  "timestamp": "2025-10-13T10:00:00.000Z"
}
```

**System Status:**
```json
{
  "success": true,
  "data": {
    "server": {
      "status": "running",
      "uptime": 123.45,
      "memory": { ... },
      "pid": 12345
    },
    "services": {
      "database": "not_configured",
      "redis": "not_configured",
      "queue": "not_configured"
    }
  },
  "timestamp": "2025-10-13T10:00:00.000Z"
}
```

## Tech Stack

- **Framework**: Express.js
- **Language**: TypeScript
- **Validation**: Zod
- **Security**: Helmet, CORS
- **Process Management**: Built-in with graceful shutdown
- **Hot Reload**: tsx watch mode

## Error Handling

All errors are caught and formatted consistently:

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": { ... }
  },
  "timestamp": "2025-10-13T10:00:00.000Z"
}
```

Custom errors can be thrown using the `ApiError` class:

```typescript
import { ApiError } from './types/index.js';

throw new ApiError('Resource not found', 404, 'NOT_FOUND');
```

## Development Tips

### Hot Reload

The dev server uses `tsx watch` for automatic restart on file changes. No manual rebuild needed.

### TypeScript

All code is TypeScript. Use `npm run typecheck` to verify types without building.

### Adding New Routes

1. Create route file in `src/routes/your-route.ts`
2. Define route handlers with proper types
3. Import and mount in `src/routes/index.ts`

Example:

```typescript
// src/routes/example.ts
import { Router } from 'express';
import { ApiResponse } from '../types/index.js';

const router = Router();

router.get('/example', (req, res) => {
  const response: ApiResponse = {
    success: true,
    data: { message: 'Hello!' },
    timestamp: new Date().toISOString(),
  };
  res.json(response);
});

export default router;
```

```typescript
// src/routes/index.ts
import exampleRoutes from './example.js';

router.use('/example', exampleRoutes);
```

## Integration

### Web App → API
The web application will consume this API for all data operations.

### MCP Server → API
The MCP server will call API endpoints to execute scrapes and fetch results.

### API → Packages
The API uses internal packages:
- `@scraper/shared-types` - Common TypeScript types
- `@scraper/scraping-engine` (future) - Firecrawl integration
- `@scraper/ai-utils` (future) - LLM helpers

## Testing

### Manual Testing

Test endpoints with curl:

```bash
# Health check
curl http://localhost:3001/api/health

# Status
curl http://localhost:3001/api/status
```

Or use tools like:
- Postman
- Thunder Client (VSCode extension)
- Bruno
- Insomnia

### Automated Testing

Coming soon:
- Unit tests with Vitest
- Integration tests for endpoints
- E2E tests for full workflows

## Deployment

### Environment Variables

Required for production:
```env
PORT=3001
NODE_ENV=production
CORS_ORIGIN=https://your-domain.com
```

### Docker (Future)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY apps/api ./apps/api
COPY package*.json ./
RUN npm install
RUN npm run build -w apps/api
EXPOSE 3001
CMD ["npm", "start", "-w", "apps/api"]
```

## Next Steps

See `/docs/tickets/api-server.md` for implementation roadmap:
- Phase 2: Job queue system (BullMQ)
- Phase 3: Full REST API (scrapes, jobs)
- Phase 4: Database integration (Prisma)
- Phase 5: Scraping engine integration

## See Also

- `/docs/technical_architecture.md` - Overall architecture
- `/docs/tickets/api-server.md` - Implementation ticket
- [Express Documentation](https://expressjs.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
