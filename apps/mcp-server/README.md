# @scraper/mcp-server

MCP (Model Context Protocol) server for AI-native web scraping.

## Overview

This MCP server enables AI assistants like Claude to gather and analyze web data through natural conversation. It provides tools for planning scrapes, executing them, and querying historical data.

## Current Status

**Phase 1: Basic Infrastructure** ✅
- MCP server scaffolding
- Basic `ping` tool for testing

**Next Steps:**
- Implement `plan_scrape` tool
- Add intent parsing
- Integrate scraping engine

## Usage

### Running the Server

```bash
# Development mode
npm run dev

# Build and run
npm run build
npm start
```

### Testing with Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "scraper": {
      "command": "node",
      "args": ["/absolute/path/to/scraper/apps/mcp-server/dist/index.js"]
    }
  }
}
```

Or use in development mode:

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

### Testing the Ping Tool

Once connected in Claude Desktop:

```
User: Use the ping tool
Claude: [calls ping tool]
Response: 🏓 pong

User: Use the ping tool with message "hello"
Claude: [calls ping tool with message "hello"]
Response: 🏓 hello
```

## Architecture

The MCP server is built using the official `@modelcontextprotocol/sdk` and communicates over stdio with AI assistants.

**Current Tools:**
- `ping` - Simple test tool to verify server connectivity

**Planned Tools:**
- `plan_scrape` - Convert natural language query to scraping plan
- `execute_scrape` - Execute a scraping plan
- `fetch_scraped_data` - Query historical scraped data
- `list_scrapes` - Show scraping history
- `create_monitor` - Set up recurring scrapes
- `get_monitor_updates` - Check for detected changes

## Development

```bash
# Install dependencies
npm install

# Run in dev mode with hot reload
npm run dev

# Type check
npm run typecheck

# Build
npm run build
```

## See Also

- `/docs/product_vision.md` - Product overview and vision
- `/docs/technical_architecture.md` - Detailed technical design
- `/docs/tickets/` - Implementation tickets
