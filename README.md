# Scraper - AI-Native Web Intelligence Platform

**"Let your AI go get valuable data while handling queries and tasks for you"**

An MCP-first web scraping platform that enables AI assistants to gather and analyze web data through natural conversation.

## 🎯 Vision

This is not a scraping tool - it's **conversational access to the entire web**. Instead of manually scraping, cleaning, and feeding data to AI, the AI itself orchestrates the entire intelligence-gathering workflow.

**Traditional workflow:**
```
User → Manual scraping → Data cleaning → Upload to AI → Ask questions
```

**Our workflow:**
```
User: "What are some possible niches in the Amazon pet toys market?"
AI: [Plans scrape] → [Executes] → [Analyzes] → Answers with insights
```

See `/docs/product_vision.md` for full details.

## 📁 Project Structure

This is a **monorepo** using npm workspaces:

```
scraper/
├── apps/
│   ├── mcp-server/          # MCP server for conversational scraping
│   ├── api/                 # API server for scrape execution and background jobs
│   └── web/                 # Web app for visual data management
├── packages/
│   └── shared-types/        # Common TypeScript types
├── archive/                 # Old server code (reference only)
└── docs/                    # Documentation
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Installation

```bash
# Install all workspace dependencies
npm install

# Build all packages
npm run build
```

### Running the Applications

**MCP Server** (for Claude Desktop integration):
```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm start -w apps/mcp-server
```

**API Server** (execution engine):
```bash
# Run API server
npm run dev:api
# Access at http://localhost:3001

# Test health endpoint
curl http://localhost:3001/api/health
```

**Web Application** (visual dashboard):
```bash
# Run web app
npm run dev:web
# Access at http://localhost:3000

# Run all apps together
npm run dev:all
```

### Testing with Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "scraper": {
      "command": "npm",
      "args": ["run", "dev", "-w", "apps/mcp-server"],
      "cwd": "/absolute/path/to/scraper"
    }
  }
}
```

Then in Claude Desktop:
```
User: Use the ping tool
Claude: 🏓 pong
```

## 🏗️ Architecture

**MCP Server** (`apps/mcp-server`) - Conversational scraping via Claude:
- `ping` - Test tool (currently implemented) ✅
- `plan_scrape` - Convert natural language to scraping strategy (planned)
- `execute_scrape` - Run scrapes with progress streaming (planned)
- `fetch_scraped_data` - Query historical data (planned)
- `create_monitor` - Set up change detection (planned)

**API Server** (`apps/api`) - Execution engine and background job processor:
- ✅ Express REST API with TypeScript
- ✅ Health check and system status endpoints
- ✅ Error handling and request validation
- ⬜ Job queue system (BullMQ + Redis)
- ⬜ Scrape execution endpoints
- ⬜ Database integration (Prisma + PostgreSQL)

**Web App** (`apps/web`) - Visual data management dashboard:
- 🏠 Dashboard with overview and quick stats
- 📊 Datasets page for viewing scraped data
- ⚙️ Settings for API keys and preferences
- 🎨 Responsive design with dark mode

**Packages** (to be added):
- `orchestration` - Intent parsing and execution planning
- `scraping-engine` - Firecrawl integration and core scraping logic
- `storage` - PostgreSQL + Redis data layer
- `ai-utils` - LLM helpers and utilities

## 📚 Documentation

- [Product Vision](/docs/product_vision.md) - Complete product overview
- [Technical Architecture](/docs/technical_architecture.md) - Implementation details
- [Progress Tracking](/PROGRESS.md) - Current status and next steps
- [Tickets](/docs/tickets/) - Implementation tasks

## 🛠️ Development

### Workspace Commands

```bash
# Run MCP server
npm run dev

# Run API server
npm run dev:api

# Run web app
npm run dev:web

# Run all apps
npm run dev:all

# Build all packages
npm run build

# Type check all packages
npm run typecheck

# Clean all build artifacts
npm run clean

# Format code
npm run format

# Add dependency to specific package
npm install express -w apps/api
```

### Adding New Packages

1. Create package directory: `packages/your-package`
2. Add `package.json` with name `@scraper/your-package`
3. Add to workspace dependencies where needed
4. Update this README

### Project Status

**Current Phase:** Phase 1 - Core Infrastructure ✅

**Completed:**
- ✅ Monorepo scaffolding with npm workspaces
- ✅ Basic MCP server with ping tool
- ✅ Web app with dashboard, datasets, and settings pages
- ✅ API server with Express, health endpoints, and error handling
- ✅ TypeScript build pipeline
- ✅ Product vision and technical architecture docs

**Next Steps:**
1. Add job queue system to API server (BullMQ + Redis)
2. Implement scrape execution endpoints
3. Create `packages/scraping-engine` with Firecrawl integration
4. Implement `plan_scrape` tool with intent parsing

See `/PROGRESS.md` for detailed status.

## 📝 License

Private project - all rights reserved.

## 🤝 Contributing

This project follows a structured development approach:

1. Check `/PROGRESS.md` for current focus
2. Look at `/docs/tickets/` for planned work
3. Follow monorepo conventions (see `/docs/technical_architecture.md`)
4. Update `/PROGRESS.md` after completing features

## 🔗 Key Concepts

**MCP (Model Context Protocol):** Standard protocol for AI assistants to interact with external tools and data sources. Our server implements MCP to enable conversational web scraping.

**Intent Parser:** LLM-powered component that converts natural language queries into structured scraping strategies.

**Orchestration Layer:** High-level logic that plans and coordinates scraping workflows based on user intent.

---

**Built for the future of AI-native development** 🤖
