# Ticket: Monorepo Scaffolding Setup

**Status**: 🔵 Ready
**Priority**: High
**Estimated Time**: 2-3 hours
**Created**: 2025-10-12

## Objective

Set up a fresh monorepo structure using npm workspaces with a working MCP server. This is a clean rebuild with MCP-first architecture - the existing `/server` code will be moved to `/archive` for reference as we build out new packages.

## Success Criteria

- ✅ Monorepo structure with `apps/` and `packages/` directories
- ✅ npm workspaces configured and working
- ✅ Shared TypeScript configuration
- ✅ MCP server app scaffold created
- ✅ Cross-package imports working (`@scraper/package-name`)
- ✅ Build and dev scripts working across workspace
- ✅ Basic MCP server running and responding to tool calls
- ✅ Existing `/server` code moved to `/archive` for reference

## Proposed Structure

```
scraper/
├── package.json                     # Root workspace config
├── tsconfig.base.json              # Shared TS config
├── .gitignore
├── .env.example
│
├── apps/
│   └── mcp-server/                 # MCP Server app
│       ├── package.json
│       ├── tsconfig.json
│       ├── src/
│       │   ├── index.ts            # Main entry point
│       │   └── tools/              # MCP tool implementations (stubs for now)
│       │       ├── index.ts
│       │       └── ping.ts         # Simple test tool
│       └── README.md
│
├── packages/
│   └── shared-types/               # Common TypeScript types
│       ├── package.json
│       ├── tsconfig.json
│       ├── src/
│       │   ├── index.ts
│       │   └── mcp.ts              # Basic MCP types
│       └── README.md
│
│   # NOTE: Other packages (scraping-engine, orchestration, storage, ai-utils)
│   # will be added in future tickets as we build out functionality
│
├── docs/                           # Keep existing
├── archive/                        # Renamed from /server - reference only
│   └── (existing server code)
│
└── configs/                        # NEW: Shared configs
    ├── eslint.config.js
    └── tsconfig.base.json
```

## Implementation Tasks

### 1. Root Workspace Setup

**Create root `package.json`:**
```json
{
  "name": "@scraper/root",
  "version": "0.1.0",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "npm run dev --workspace=apps/mcp-server",
    "build": "npm run build --workspaces --if-present",
    "clean": "npm run clean --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "typecheck": "npm run typecheck --workspaces --if-present"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.3.0",
    "tsx": "^4.7.0",
    "prettier": "^3.1.0",
    "eslint": "^8.56.0"
  }
}
```

**Create `tsconfig.base.json`:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "composite": true,
    "incremental": true
  },
  "exclude": ["node_modules", "dist"]
}
```

### 2. Package Setup (Each Package)

**Template `package.json` for packages:**
```json
{
  "name": "@scraper/package-name",
  "version": "0.1.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "clean": "rm -rf dist",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@scraper/shared-types": "*"
  },
  "devDependencies": {
    "typescript": "*"
  }
}
```

**Template `tsconfig.json` for packages:**
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "references": [
    { "path": "../shared-types" }
  ]
}
```

### 3. Package Creation Steps

**Create minimal packages to prove structure:**

1. **Move existing code to archive**
   ```bash
   git mv server archive
   ```

2. **Create `packages/shared-types`**
   - Add basic MCP types (tool request/response interfaces)
   - Keep it minimal - just what's needed for MCP server

3. **Create `apps/mcp-server`**
   - Implement basic MCP server using `@modelcontextprotocol/sdk`
   - Add one simple tool (e.g., `ping`) to test functionality
   - Should respond to tool calls and return proper MCP responses

### 4. Testing Strategy

After setup:
```bash
# Install all dependencies
npm install

# Build all packages
npm run build

# Run MCP server
npm run dev -w apps/mcp-server

# Test with MCP inspector or Claude Desktop config
# Should see server start and respond to ping tool
```

### 5. MCP Server Implementation

**Minimal working server:**

```typescript
// apps/mcp-server/src/index.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  {
    name: 'scraper-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'ping',
        description: 'Test tool that returns a pong message',
        inputSchema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Optional message to echo back'
            }
          }
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'ping') {
    const message = request.params.arguments?.message || 'pong';
    return {
      content: [
        {
          type: 'text',
          text: `🏓 ${message}`
        }
      ]
    };
  }

  throw new Error(`Unknown tool: ${request.params.name}`);
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Scraper MCP Server running on stdio');
}

main().catch(console.error);
```

### 6. Update Documentation

- Update `README.md` with new structure
- Update `CLAUDE.md` with workspace commands
- Add `CONTRIBUTING.md` with monorepo guidelines

## Package Dependencies Matrix

**Initial Setup (this ticket):**
```
apps/mcp-server
  └─ @scraper/shared-types

packages/shared-types
  (no dependencies)
```

**Future packages** (added in subsequent tickets):
- `packages/orchestration` - Intent parsing and execution planning
- `packages/scraping-engine` - Core scraping logic
- `packages/storage` - Data persistence
- `packages/ai-utils` - LLM helpers

## Common Commands After Setup

```bash
# Install dependencies
npm install

# Build everything
npm run build

# Run MCP server in dev mode
npm run dev --workspace=apps/mcp-server
# or
npm run dev -w apps/mcp-server

# Build specific package
npm run build -w packages/scraping-engine

# Add dependency to specific package
npm install openai -w apps/mcp-server

# Run tests across all packages
npm run test
```

## Implementation Checklist

- [ ] Move existing `/server` to `/archive`
- [ ] Create root `package.json` with workspaces config
- [ ] Create `tsconfig.base.json`
- [ ] Create `packages/shared-types` with basic MCP types
- [ ] Create `apps/mcp-server` with minimal working server
- [ ] Add `@modelcontextprotocol/sdk` dependency
- [ ] Implement simple `ping` tool in MCP server
- [ ] Verify builds work: `npm run build`
- [ ] Test MCP server starts: `npm run dev -w apps/mcp-server`
- [ ] Test with Claude Desktop config (optional but recommended)
- [ ] Update documentation (README, CLAUDE.md)
- [ ] Commit with clear setup message

## Notes

- Keep existing `docs/` directory at root
- `/archive` contains old code for reference only - scavenge patterns/logic as needed
- Use `*` for internal package versions (workspaces resolve locally)
- Each package should have its own `README.md` documenting API
- Can add Turborepo later for build caching (future optimization)
- Start minimal - only add packages as you need them

## Risks & Mitigations

**Risk**: Overbuilding too early
**Mitigation**: This ticket only creates structure + basic MCP server. Additional packages added later.

**Risk**: MCP SDK integration issues
**Mitigation**: Follow MCP SDK examples, start with simple ping tool

**Risk**: Losing reference to old implementation
**Mitigation**: Keep `/archive` in repo, reference as needed during development

## Follow-Up Tickets

After this is complete:
1. **Implement `plan_scrape` tool** - Add first real tool with intent parsing
2. **Create `packages/orchestration`** - Intent parser and execution planner
3. **Create `packages/scraping-engine`** - Firecrawl integration and core scraping
4. **Create `packages/storage`** - PostgreSQL + Redis data layer
5. **Implement remaining MCP tools** - `execute_scrape`, `fetch_scraped_data`, etc.

## References

- [npm Workspaces Documentation](https://docs.npmjs.com/cli/v10/using-npm/workspaces)
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
- `/docs/technical_architecture.md` - See detailed architecture design
