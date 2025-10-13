# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Dynamic Scraping & Data Management Engine** - a modular system designed for AI-native data analysis through conversational interfaces (primarily Claude/ChatGPT integration).

Documentation: /docs
Tickets: /docs/tickets
Completed Tickets: /docs/tickets/done

**Key Architecture Components:**

1. **Scraping Engine**: Site-agnostic framework with pluggable extractors, authentication management, proxy rotation, and change detection
2. **Data Layer**: Unified schema for multi-source data with historical tracking and metadata management  
3. **Analysis Interface**: MCP server for conversational data analysis with Claude integration as the primary interface

## Project Status

**IMPORTANT**: Always check `/PROGRESS.md` for current development status and next steps. This file tracks completed features and prevents losing context between Claude sessions.

Basic TypeScript infrastructure exists:
- `/docs/product_overview.md` - Contains the complete architectural vision and implementation strategy
- `/server/src/` - Contains basic scraper, storage, and type definitions
- Build/test infrastructure established

## Development Approach

**Configuration Over Code**: New scrapers are added via configuration files rather than custom scripts. The system abstracts authentication flows, data mapping, and extraction logic into reusable components.

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

## Buiding LLM-based Workflows

Many features will be configured for natural language prompting by the user, including things like how to extract content from the page, or what button to click 

**MANDATORY**: When building an LLM-powered workflow into the application, DO NOT use static, hard-coded fallback options unless EXPLICITLY told to do so. These will generally be useless, and should NEVER be configured solely to match some testing example.
- use npm run dev to test the application