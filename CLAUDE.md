# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an **AI-Native Web Intelligence Platform** - an MCP-first scraping system that enables AI assistants to gather and analyze web data through natural conversation.

**Vision**: "Let your AI go get valuable data while handling queries/tasks for you"

**Architecture**: Monorepo using npm workspaces
- `/apps/mcp-server` - Main MCP server application
- `/apps/api` - Express API server with Firecrawl integration
- `/apps/web` - Next.js web dashboard
- `/packages/shared-types` - Common TypeScript types
- `/packages/*` - Future packages (orchestration, scraping-engine, storage, ai-utils)
- `/archive` - Old server code (reference only, scavenge as needed)
- `/docs` - Product vision, technical architecture, tickets

**Key Documents:**
- `/docs/product_vision.md` - Complete product vision and UX examples
- `/docs/technical_architecture.md` - Detailed implementation guide
- `/PROGRESS.md` - Current status and next steps
- `/docs/tickets/` - Implementation tasks

## Project Status

**IMPORTANT**: Always check `/PROGRESS.md` for current development status and next steps. This file tracks completed features and prevents losing context between Claude sessions.

**Current Phase**: Phase 1 - MCP Server Foundation ✅
- ✅ Monorepo scaffolding complete
- ✅ Basic MCP server with `scrape_url` tool working
- ✅ API server with Firecrawl integration
- ✅ End-to-end flow: Claude Desktop → MCP → API → Firecrawl
- ⬜ Next: Data persistence and advanced scraping features

## Development Commands

**Run all apps together** (recommended):
```bash
npm run dev:all  # Runs API + Web with colored, prefixed logs
```

**Run individual apps**:
```bash
npm run dev:api  # API server only (http://localhost:3001)
npm run dev:web  # Web app only (http://localhost:3000)
npm run dev      # MCP server only (stdio)
```

**Build and test**:
```bash
npm run build      # Build all packages
npm run typecheck  # Type check everything
npm run clean      # Clean all build artifacts
```

## Development Approach

**MCP-First**: Primary interface is Model Context Protocol server. AI assistants orchestrate all scraping workflows through conversational interaction.

**Clean Rebuild**: The `/archive` directory contains old code for reference. We're rebuilding from scratch with MCP-first architecture. Scavenge patterns and logic as needed, but don't migrate wholesale.

**Incremental Packages**: Add packages to `/packages` only when needed. Start minimal, expand as features require.

**AI-Native Design**: Optimized for LLM interaction patterns with structured outputs designed for conversational analysis and natural language querying.

## Progress Tracking Requirements

**MANDATORY**: After completing ANY feature or significant work, you MUST update `/PROGRESS.md` with:
- Last completed step
- Current/next step
- Next 2 planned steps

This prevents losing context between Claude sessions and ensures continuous development progress.

## Key Design Principles

- Rapid deployment: New data sources should be addable in <5 minutes
- Modular architecture allowing independent scaling of scraping, storage, and analysis
- Built-in reliability with error handling, retry logic, and monitoring
- Primary interface through MCP server for Claude integration

## Building LLM-based Workflows

Many features will be configured for natural language prompting by the user, including things like how to extract content from the page, or what button to click.

**MANDATORY**: When building an LLM-powered workflow into the application, DO NOT use static, hard-coded fallback options unless EXPLICITLY told to do so. These will generally be useless, and should NEVER be configured solely to match some testing example.

## Current Architecture

**Working Flow**:
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

**Key Files**:
- `apps/mcp-server/src/index.ts` - MCP server with scrape_url tool
- `apps/api/src/services/scraper.ts` - Firecrawl service wrapper
- `apps/api/src/routes/scrapes.ts` - Scrape API endpoints
- `apps/api/.env` - Configuration (API keys)

## Testing

**Via Claude Desktop**:
1. Make sure API server is running: `npm run dev:all`
2. In Claude Desktop, ask: "Can you scrape https://example.com for me?"
3. Claude will use the `scrape_url` tool automatically

**Via API**:
```bash
curl -X POST http://localhost:3001/api/scrapes \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

## Environment Setup

Create `apps/api/.env` with:
```
FIRECRAWL_API_KEY=fc-your-key-here
OPENAI_API_KEY=sk-your-key-here
PORT=3001
NODE_ENV=development
```
