# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an **AI-Native Web Intelligence Platform** - an MCP-first scraping system that enables AI assistants to gather and analyze web data through natural conversation.

**Vision**: "Let your AI go get valuable data while handling queries/tasks for you"

**Architecture**: Monorepo using npm workspaces
- `/apps/mcp-server` - Main MCP server application
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
- ✅ Basic MCP server with ping tool working
- ⬜ Next: Implement `plan_scrape` tool with intent parsing

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

## Monorepo Commands

**Development:**
```bash
# Run MCP server in dev mode (hot reload)
npm run dev

# Run specific workspace
npm run dev -w apps/mcp-server

# Build all packages
npm run build

# Type check everything
npm run typecheck

# Clean all build artifacts
npm run clean
```

**Package Management:**
```bash
# Add dependency to specific package
npm install openai -w apps/mcp-server

# Add dependency to root (dev tools)
npm install -D prettier

# Install all workspace dependencies
npm install
```

**Testing:**
```bash
# Test MCP server starts
npm run dev -w apps/mcp-server

# Build and verify
npm run build && npm run typecheck
```

## Building LLM-based Workflows

Many features will be configured for natural language prompting by the user, including things like how to extract content from the page, or what button to click.

**MANDATORY**: When building an LLM-powered workflow into the application, DO NOT use static, hard-coded fallback options unless EXPLICITLY told to do so. These will generally be useless, and should NEVER be configured solely to match some testing example.