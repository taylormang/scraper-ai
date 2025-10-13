# Technical Architecture: MCP-First Web Intelligence Platform

## Overview

This document details the technical implementation strategy for building an AI-native web scraping platform with Model Context Protocol (MCP) as the primary interface.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        AI Assistant Layer                       │
│                    (Claude, ChatGPT, etc.)                      │
└────────────────────────────┬────────────────────────────────────┘
                             │ MCP Protocol (JSON-RPC)
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                         MCP Server                              │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────────┐    │
│  │ Tool Router  │  │ State Manager │  │ Response Builder │    │
│  │              │  │               │  │                  │    │
│  │ - Validates  │  │ - Conversation│  │ - Human-readable │    │
│  │ - Routes     │  │   context     │  │   formatting     │    │
│  │ - Transforms │  │ - User prefs  │  │ - Error messages │    │
│  └──────────────┘  └───────────────┘  └──────────────────┘    │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    Orchestration Layer                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Intent Parser                         │  │
│  │  - Natural language → Scraping strategy                 │  │
│  │  - Uses GPT-4o for query understanding                  │  │
│  │  - Outputs structured ScrapePlan                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Execution Planner                       │  │
│  │  - ScrapePlan → Execution steps                         │  │
│  │  - Handles pagination, multi-page, monitoring           │  │
│  │  - Resource estimation (time, cost)                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                      Scraping Engine                            │
│  ┌───────────────┐  ┌────────────────┐  ┌──────────────────┐  │
│  │ Navigation    │  │ Content        │  │ Data Extraction  │  │
│  │ Planner       │  │ Fetcher        │  │ Engine           │  │
│  │               │  │                │  │                  │  │
│  │ - LLM-driven  │  │ - Firecrawl    │  │ - Schema-free    │  │
│  │   interaction │  │   integration  │  │ - LLM-powered    │  │
│  │ - Pattern     │  │ - Playwright   │  │ - Auto-validation│  │
│  │   caching     │  │   fallback     │  │                  │  │
│  └───────────────┘  └────────────────┘  └──────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                         Data Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │ Scrape Store │  │ Cache Layer  │  │ Vector Store         │ │
│  │              │  │              │  │                      │ │
│  │ - PostgreSQL │  │ - Redis      │  │ - Embeddings for     │ │
│  │ - Full       │  │ - Recent     │  │   semantic search    │ │
│  │   history    │  │   results    │  │ - Query over history │ │
│  │ - Metadata   │  │ - Dedup      │  │                      │ │
│  └──────────────┘  └──────────────┘  └──────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## MCP Server Implementation

### Tool Definitions

All tools follow MCP specification format:

```typescript
// server/src/mcp/tools/plan-scrape.ts
export const planScrapeTool: MCPTool = {
  name: "plan_scrape",
  description: "Create a scraping plan from natural language query",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Natural language description of what to scrape"
      },
      target: {
        type: "string",
        description: "Target website URL or search query"
      },
      extract: {
        type: "array",
        items: { type: "string" },
        description: "Fields/data to extract (natural language)"
      },
      strategy: {
        type: "string",
        enum: ["single", "multi-page", "monitor", "auto"],
        default: "auto",
        description: "Scraping strategy (auto-detected if not specified)"
      },
      options: {
        type: "object",
        properties: {
          max_pages: { type: "number" },
          max_time: { type: "number" },
          use_cache: { type: "boolean", default: true }
        }
      }
    },
    required: ["query", "target"]
  }
};

// Handler
export async function handlePlanScrape(
  params: PlanScrapeParams,
  context: MCPContext
): Promise<MCPResponse> {
  // 1. Parse intent using LLM
  const intent = await intentParser.parse(params.query, params.target);

  // 2. Generate scrape plan
  const plan = await executionPlanner.createPlan(intent, params);

  // 3. Store plan with conversation context
  await stateManager.storePlan(plan, context.conversationId);

  // 4. Return human-readable response
  return {
    content: [
      {
        type: "text",
        text: formatPlanForAI(plan)
      }
    ],
    metadata: {
      plan_id: plan.id,
      estimated_time: plan.estimatedTime,
      estimated_cost: plan.estimatedCost,
      needs_clarification: plan.ambiguities.length > 0
    }
  };
}

// Example formatted response
function formatPlanForAI(plan: ScrapePlan): string {
  return `
I've created a scraping plan:

**Target**: ${plan.target.url}
**Strategy**: ${plan.strategy} (${plan.estimatedPages} pages)
**Data to extract**: ${plan.extractionFields.join(", ")}

**Execution plan**:
${plan.steps.map((s, i) => `${i + 1}. ${s.description}`).join("\n")}

**Estimates**:
- Time: ~${plan.estimatedTime}s
- Cost: ~$${plan.estimatedCost.toFixed(4)}
- Pages: ${plan.estimatedPages}

${plan.ambiguities.length > 0 ? `
**⚠️ Clarification needed**:
${plan.ambiguities.map(a => `- ${a.question}`).join("\n")}

Would you like me to proceed with defaults, or should we refine the plan?
` : "Ready to execute. Use \`execute_scrape\` to proceed."}
  `.trim();
}
```

### Complete Tool Suite

#### 1. `plan_scrape`
**Purpose**: Convert natural language query into executable scraping plan
**Input**: Query, target, extraction fields
**Output**: Structured plan with estimates, clarification questions
**AI Processing**: Intent parsing, strategy selection

#### 2. `execute_scrape`
**Purpose**: Execute a scraping plan
**Input**: Plan ID (or inline plan), execution options
**Output**: Execution ID, real-time progress updates
**AI Processing**: Navigation planning, content extraction

```typescript
export const executeScrapeTool: MCPTool = {
  name: "execute_scrape",
  description: "Execute a scraping plan and return results",
  inputSchema: {
    type: "object",
    properties: {
      plan_id: {
        type: "string",
        description: "ID from plan_scrape, or omit to use last plan"
      },
      options: {
        type: "object",
        properties: {
          max_pages: { type: "number" },
          timeout: { type: "number" },
          streaming: { type: "boolean", default: false }
        }
      }
    }
  }
};

// Returns streaming updates for long-running scrapes
export async function* handleExecuteScrape(
  params: ExecuteScrapeParams,
  context: MCPContext
): AsyncGenerator<MCPResponse> {
  const plan = await stateManager.getPlan(params.plan_id);
  const execution = await scrapeEngine.execute(plan, params.options);

  // Yield progress updates
  for await (const update of execution.progress()) {
    yield {
      content: [
        {
          type: "text",
          text: `Progress: ${update.completed}/${update.total} pages (${update.status})`
        }
      ],
      metadata: { execution_id: execution.id, ...update }
    };
  }

  // Final result
  const results = await execution.getResults();
  yield {
    content: [
      {
        type: "text",
        text: formatResultsForAI(results)
      }
    ],
    metadata: {
      execution_id: execution.id,
      total_items: results.data.length,
      success_rate: results.successRate
    }
  };
}
```

#### 3. `fetch_scraped_data`
**Purpose**: Query historical scraped data
**Input**: Natural language query or structured filters
**Output**: Relevant data from past scrapes
**AI Processing**: Semantic search, relevance ranking

```typescript
export const fetchScrapedDataTool: MCPTool = {
  name: "fetch_scraped_data",
  description: "Query previously scraped data",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Natural language query (semantic search)"
      },
      filters: {
        type: "object",
        properties: {
          domain: { type: "string" },
          date_range: {
            type: "object",
            properties: {
              start: { type: "string" },
              end: { type: "string" }
            }
          },
          execution_id: { type: "string" }
        }
      },
      format: {
        type: "string",
        enum: ["summary", "detailed", "raw"],
        default: "summary"
      },
      limit: { type: "number", default: 50 }
    }
  }
};
```

#### 4. `list_scrapes`
**Purpose**: Show scraping history
**Input**: Time range, filters
**Output**: List of past scrapes with metadata

#### 5. `create_monitor`
**Purpose**: Set up recurring scrapes with change detection
**Input**: Plan ID, schedule, alert conditions
**Output**: Monitor ID, next run time

```typescript
export const createMonitorTool: MCPTool = {
  name: "create_monitor",
  description: "Create a recurring scrape with change detection",
  inputSchema: {
    type: "object",
    properties: {
      plan_id: { type: "string" },
      schedule: {
        type: "string",
        description: "Cron expression or natural language (e.g., 'daily', 'every 6 hours')"
      },
      alert_on: {
        type: "array",
        items: {
          type: "string",
          enum: ["content_changes", "new_items", "price_changes", "all"]
        }
      },
      notify: {
        type: "boolean",
        default: true,
        description: "Whether to proactively notify in conversation"
      }
    },
    required: ["plan_id", "schedule"]
  }
};
```

#### 6. `get_monitor_updates`
**Purpose**: Check for changes detected by monitors
**Input**: Monitor ID (optional - returns all updates if omitted)
**Output**: Changes detected since last check

### State Management

```typescript
// server/src/mcp/state/manager.ts
export class MCPStateManager {
  private conversations: Map<string, ConversationState>;
  private redis: Redis;

  async storePlan(plan: ScrapePlan, conversationId: string): Promise<void> {
    const state = await this.getConversationState(conversationId);
    state.plans.push(plan);
    state.lastPlan = plan;
    await this.saveState(state);
  }

  async getLastPlan(conversationId: string): Promise<ScrapePlan | null> {
    const state = await this.getConversationState(conversationId);
    return state.lastPlan;
  }

  async getConversationContext(conversationId: string): Promise<Context> {
    const state = await this.getConversationState(conversationId);
    return {
      recentScrapes: state.executions.slice(-5),
      activeMonitors: state.monitors,
      preferences: state.preferences
    };
  }
}

interface ConversationState {
  id: string;
  plans: ScrapePlan[];
  executions: Execution[];
  monitors: Monitor[];
  lastPlan: ScrapePlan | null;
  preferences: UserPreferences;
}
```

## Intent Parser

The Intent Parser converts natural language queries into structured scraping strategies.

```typescript
// server/src/orchestration/intent-parser.ts
export class IntentParser {
  private llm: OpenAI;

  async parse(query: string, target: string): Promise<ScrapingIntent> {
    const prompt = `
You are analyzing a web scraping request. Convert the user's natural language query into a structured scraping strategy.

Query: "${query}"
Target: "${target}"

Determine:
1. **Strategy**: single-page, multi-page, or monitoring
2. **Data fields**: What specific data should be extracted?
3. **Navigation**: What interactions are needed (search, pagination, clicks)?
4. **Filters**: Any filtering or sorting requirements?
5. **Ambiguities**: What needs clarification?

Output JSON following this schema:
{
  "strategy": "single" | "multi-page" | "monitor",
  "extractionFields": ["field1", "field2"],
  "navigationSteps": [
    { "action": "search" | "paginate" | "click", "target": "...", "description": "..." }
  ],
  "filters": { /* any filtering requirements */ },
  "estimatedPages": number,
  "ambiguities": [
    { "question": "...", "suggestion": "..." }
  ]
}
    `;

    const response = await this.llm.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content);
  }
}

// Example inputs/outputs:

// Input: "What are some possible niches in the Amazon pet toys market"
// Target: "amazon.com"
// Output:
{
  "strategy": "multi-page",
  "extractionFields": ["product_name", "category", "price", "rating", "review_count"],
  "navigationSteps": [
    { "action": "search", "target": "pet toys", "description": "Search for pet toys" },
    { "action": "paginate", "target": "all results", "description": "Collect all search results" }
  ],
  "estimatedPages": 5,
  "ambiguities": []
}

// Input: "Track changes to the YC advice page"
// Target: "ycombinator.com/advice"
// Output:
{
  "strategy": "monitor",
  "extractionFields": ["full_content", "sections", "last_updated"],
  "navigationSteps": [],
  "estimatedPages": 1,
  "ambiguities": [
    {
      "question": "How often should I check for changes?",
      "suggestion": "Weekly is common for blog content, daily for time-sensitive info"
    }
  ]
}
```

## Execution Planner

Converts ScrapingIntent into concrete execution steps.

```typescript
// server/src/orchestration/execution-planner.ts
export class ExecutionPlanner {
  async createPlan(
    intent: ScrapingIntent,
    params: PlanScrapeParams
  ): Promise<ScrapePlan> {
    const steps: ExecutionStep[] = [];

    // 1. Initial page load
    steps.push({
      type: "navigate",
      url: params.target,
      description: "Load initial page"
    });

    // 2. Navigation steps from intent
    for (const nav of intent.navigationSteps) {
      if (nav.action === "search") {
        steps.push({
          type: "interact",
          action: "search",
          params: { query: nav.target },
          description: nav.description
        });
      } else if (nav.action === "paginate") {
        steps.push({
          type: "paginate",
          max_pages: params.options?.max_pages || 10,
          description: "Collect results across pages"
        });
      }
    }

    // 3. Extraction step
    steps.push({
      type: "extract",
      fields: intent.extractionFields,
      description: "Extract data from pages"
    });

    // 4. Cost estimation
    const estimatedCost = this.estimateCost(steps, intent.estimatedPages);
    const estimatedTime = this.estimateTime(steps, intent.estimatedPages);

    return {
      id: generateId(),
      intent,
      steps,
      estimatedPages: intent.estimatedPages,
      estimatedCost,
      estimatedTime,
      ambiguities: intent.ambiguities
    };
  }

  private estimateCost(steps: ExecutionStep[], pages: number): number {
    // Firecrawl: $0.005/page (approx)
    const scrapingCost = pages * 0.005;

    // LLM costs (navigation + extraction)
    const navigationCalls = steps.filter(s => s.type === "interact").length;
    const extractionCalls = pages;

    // GPT-4o: ~$0.005 per call (input) + $0.015 per call (output)
    const llmCost = (navigationCalls + extractionCalls) * 0.02;

    return scrapingCost + llmCost;
  }

  private estimateTime(steps: ExecutionStep[], pages: number): number {
    // Average 2s per page load + 1s per LLM call
    const scrapingTime = pages * 2;
    const llmTime = (steps.length + pages) * 1;
    return scrapingTime + llmTime;
  }
}
```

## Data Layer

### Database Schema

```sql
-- PostgreSQL schema
-- server/src/storage/schema.sql

-- Scraping plans
CREATE TABLE scrape_plans (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  intent JSONB NOT NULL,
  steps JSONB NOT NULL,
  estimated_cost DECIMAL(10, 4),
  estimated_time INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Executions
CREATE TABLE scrape_executions (
  id TEXT PRIMARY KEY,
  plan_id TEXT REFERENCES scrape_plans(id),
  status TEXT NOT NULL, -- 'running', 'completed', 'failed'
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  pages_scraped INTEGER DEFAULT 0,
  items_extracted INTEGER DEFAULT 0,
  actual_cost DECIMAL(10, 4),
  error_message TEXT
);

-- Scraped data (main table)
CREATE TABLE scraped_data (
  id TEXT PRIMARY KEY,
  execution_id TEXT REFERENCES scrape_executions(id),
  source_url TEXT NOT NULL,
  data JSONB NOT NULL,
  metadata JSONB,
  scraped_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_scraped_data_execution ON scraped_data(execution_id);
CREATE INDEX idx_scraped_data_source ON scraped_data(source_url);
CREATE INDEX idx_scraped_data_scraped_at ON scraped_data(scraped_at);
CREATE INDEX idx_scrape_plans_conversation ON scrape_plans(conversation_id);

-- Monitors
CREATE TABLE monitors (
  id TEXT PRIMARY KEY,
  plan_id TEXT REFERENCES scrape_plans(id),
  schedule TEXT NOT NULL, -- cron expression
  alert_conditions JSONB NOT NULL,
  last_run TIMESTAMP,
  next_run TIMESTAMP NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Monitor results (for change detection)
CREATE TABLE monitor_results (
  id TEXT PRIMARY KEY,
  monitor_id TEXT REFERENCES monitors(id),
  execution_id TEXT REFERENCES scrape_executions(id),
  changes_detected JSONB,
  notified BOOLEAN DEFAULT false,
  detected_at TIMESTAMP DEFAULT NOW()
);
```

### Caching Strategy

```typescript
// server/src/storage/cache.ts
export class CacheLayer {
  private redis: Redis;

  // Cache scrape results
  async cacheResults(
    url: string,
    data: any[],
    ttl: number = 3600
  ): Promise<void> {
    const key = this.getCacheKey(url);
    await this.redis.setex(key, ttl, JSON.stringify({
      data,
      cached_at: Date.now()
    }));
  }

  // Check cache before scraping
  async getCached(url: string): Promise<CachedResult | null> {
    const key = this.getCacheKey(url);
    const cached = await this.redis.get(key);
    if (!cached) return null;

    const result = JSON.parse(cached);
    const age = Date.now() - result.cached_at;

    return {
      data: result.data,
      age_seconds: Math.floor(age / 1000),
      fresh: age < 3600000 // 1 hour
    };
  }

  private getCacheKey(url: string): string {
    return `scrape:${Buffer.from(url).toString('base64')}`;
  }
}

// Integration in execute_scrape handler
async function handleExecuteScrape(params: ExecuteScrapeParams) {
  const plan = await stateManager.getPlan(params.plan_id);

  // Check cache first
  if (params.options?.use_cache !== false) {
    const cached = await cacheLayer.getCached(plan.target.url);
    if (cached && cached.fresh) {
      return {
        content: [{
          type: "text",
          text: `Using cached data from ${cached.age_seconds}s ago:\n\n${formatResults(cached.data)}`
        }],
        metadata: {
          from_cache: true,
          age: cached.age_seconds
        }
      };
    }
  }

  // Execute fresh scrape...
}
```

### Vector Store for Semantic Search

```typescript
// server/src/storage/vector-store.ts
import { OpenAI } from "openai";

export class VectorStore {
  private openai: OpenAI;
  private pinecone: PineconeClient;

  async indexScrapedData(executionId: string, data: any[]): Promise<void> {
    // Generate embeddings for each item
    const embeddings = await Promise.all(
      data.map(item => this.generateEmbedding(item))
    );

    // Store in vector DB
    await this.pinecone.upsert({
      vectors: embeddings.map((embedding, i) => ({
        id: `${executionId}-${i}`,
        values: embedding,
        metadata: {
          execution_id: executionId,
          data: JSON.stringify(data[i])
        }
      }))
    });
  }

  async semanticSearch(query: string, limit: number = 10): Promise<any[]> {
    // Generate query embedding
    const queryEmbedding = await this.generateEmbedding({ query });

    // Search vector store
    const results = await this.pinecone.query({
      vector: queryEmbedding,
      topK: limit,
      includeMetadata: true
    });

    // Return matched data
    return results.matches.map(match =>
      JSON.parse(match.metadata.data)
    );
  }

  private async generateEmbedding(item: any): Promise<number[]> {
    const text = JSON.stringify(item);
    const response = await this.openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text
    });
    return response.data[0].embedding;
  }
}
```

## Technology Stack

### Core Dependencies

```json
{
  "dependencies": {
    // MCP Server
    "@modelcontextprotocol/sdk": "^1.0.0",

    // Scraping
    "playwright": "^1.40.0",
    "firecrawl-js": "^1.0.0",

    // AI/LLM
    "openai": "^4.20.0",

    // Storage
    "pg": "^8.11.0",
    "ioredis": "^5.3.0",
    "@pinecone-database/pinecone": "^2.0.0",

    // Utilities
    "zod": "^3.22.0",           // Schema validation
    "bullmq": "^5.0.0",         // Job queue for monitoring
    "node-cron": "^3.0.0",      // Scheduling
    "uuid": "^9.0.0"
  }
}
```

### Project Structure

```
server/
├── src/
│   ├── mcp/                    # MCP Server implementation
│   │   ├── server.ts           # Main MCP server entry point
│   │   ├── tools/              # Tool implementations
│   │   │   ├── plan-scrape.ts
│   │   │   ├── execute-scrape.ts
│   │   │   ├── fetch-scraped-data.ts
│   │   │   ├── list-scrapes.ts
│   │   │   ├── create-monitor.ts
│   │   │   └── get-monitor-updates.ts
│   │   ├── state/              # Conversation state management
│   │   │   └── manager.ts
│   │   └── formatters/         # Response formatting for AI
│   │       └── responses.ts
│   │
│   ├── orchestration/          # High-level logic
│   │   ├── intent-parser.ts    # NL → Strategy
│   │   └── execution-planner.ts # Strategy → Steps
│   │
│   ├── scraping/               # Existing scraping engine
│   │   ├── scraper.ts          # Main scraper (refactor to use Firecrawl)
│   │   ├── navigator.ts        # Page navigation (LLM-powered)
│   │   ├── extractor.ts        # Data extraction (LLM-powered)
│   │   └── pattern-cache.ts    # Navigation caching
│   │
│   ├── storage/                # Data persistence
│   │   ├── database.ts         # PostgreSQL client
│   │   ├── cache.ts            # Redis cache layer
│   │   ├── vector-store.ts     # Pinecone integration
│   │   └── schema.sql
│   │
│   ├── monitoring/             # Scheduled scraping
│   │   ├── scheduler.ts        # Cron-based scheduler
│   │   ├── change-detector.ts  # Diff detection
│   │   └── notifier.ts         # Alert system
│   │
│   ├── types/                  # TypeScript types
│   │   ├── mcp.ts
│   │   ├── scraping.ts
│   │   └── storage.ts
│   │
│   └── utils/                  # Shared utilities
│       ├── llm.ts              # OpenAI helpers
│       └── errors.ts           # Error handling
│
├── package.json
└── tsconfig.json
```

## Implementation Phases

### Phase 1: MCP Server Foundation (Week 1-2)

**Goal**: Working MCP server with basic scraping capability

**Tasks**:
1. ✅ Set up MCP SDK and server boilerplate
2. ✅ Implement `plan_scrape` tool (basic version - direct URL scraping)
3. ✅ Implement `execute_scrape` tool (integrate existing scraper)
4. ✅ Implement `fetch_scraped_data` tool (simple query by execution ID)
5. ✅ Basic state management (in-memory for now)
6. ✅ Test with Claude Desktop integration

**Success Criteria**:
- User can ask "Scrape the top posts from Hacker News"
- AI creates plan, executes, returns results
- Follow-up query "Show me that data again" works

### Phase 2: Intent Parser & Smart Planning (Week 3-4)

**Goal**: Natural language understanding and intelligent planning

**Tasks**:
1. ⬜ Build IntentParser with GPT-4o
2. ⬜ Implement strategy detection (single vs multi-page vs monitor)
3. ⬜ Add clarification question generation
4. ⬜ Enhance `plan_scrape` to use IntentParser
5. ⬜ Add cost/time estimation
6. ⬜ Implement plan refinement flow

**Success Criteria**:
- User asks "What are niches in Amazon pet toys market?"
- AI understands this needs multi-page scraping
- AI asks clarifying questions if needed
- Provides accurate cost/time estimates

### Phase 3: Data Layer & Caching (Week 4-5)

**Goal**: Persistent storage with intelligent caching

**Tasks**:
1. ⬜ Set up PostgreSQL with schema
2. ⬜ Implement Redis caching layer
3. ⬜ Add cache-first execution strategy
4. ⬜ Build query interface for historical data
5. ⬜ Implement data deduplication
6. ⬜ Add `list_scrapes` tool

**Success Criteria**:
- Repeated queries use cache (< 1s response)
- Historical data queryable across conversations
- Cache invalidation works correctly

### Phase 4: Firecrawl Integration (Week 5-6)

**Goal**: Production-ready scraping with anti-bot protection

**Tasks**:
1. ⬜ Integrate Firecrawl API
2. ⬜ Implement fallback to Playwright
3. ⬜ Add proxy support
4. ⬜ Handle rate limiting
5. ⬜ Add retry logic
6. ⬜ Cost tracking and alerts

**Success Criteria**:
- Successfully scrapes protected sites
- Handles 1000+ page scrapes reliably
- Accurate cost tracking

### Phase 5: Monitoring System (Week 7-8)

**Goal**: Scheduled scraping with change detection

**Tasks**:
1. ⬜ Implement `create_monitor` tool
2. ⬜ Build scheduler with BullMQ
3. ⬜ Add change detection (diff algorithm)
4. ⬜ Implement `get_monitor_updates` tool
5. ⬜ Build notification system
6. ⬜ Add monitor management (pause, delete, edit)

**Success Criteria**:
- User can set up "Track YC advice page weekly"
- AI proactively notifies of changes
- Monitors run reliably in background

### Phase 6: Semantic Search (Week 9-10)

**Goal**: Query historical data with natural language

**Tasks**:
1. ⬜ Integrate Pinecone vector store
2. ⬜ Generate embeddings for all scraped data
3. ⬜ Implement semantic search in `fetch_scraped_data`
4. ⬜ Add relevance ranking
5. ⬜ Support cross-execution queries

**Success Criteria**:
- User asks "What have I learned about pricing strategies?"
- AI searches across all past scrapes
- Returns relevant data with context

## Configuration & Deployment

### Claude Desktop Integration

```json
// ~/Library/Application Support/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "web-scraper": {
      "command": "node",
      "args": ["/path/to/scraper/server/dist/mcp/server.js"],
      "env": {
        "OPENAI_API_KEY": "sk-...",
        "FIRECRAWL_API_KEY": "fc-...",
        "DATABASE_URL": "postgresql://...",
        "REDIS_URL": "redis://...",
        "PINECONE_API_KEY": "..."
      }
    }
  }
}
```

### Environment Variables

```bash
# .env
# AI Services
OPENAI_API_KEY=sk-...
FIRECRAWL_API_KEY=fc-...

# Storage
DATABASE_URL=postgresql://user:pass@localhost:5432/scraper
REDIS_URL=redis://localhost:6379
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=us-west1-gcp

# Configuration
MAX_CONCURRENT_SCRAPES=3
DEFAULT_CACHE_TTL=3600
MAX_PAGES_PER_SCRAPE=100
```

## Performance Considerations

### Scraping Performance

- **Target**: < 2s per page (with cache)
- **Target**: < 5s per page (fresh scrape with Firecrawl)
- **Concurrency**: 3-5 parallel page loads

### LLM Performance

- **Intent Parsing**: < 2s (GPT-4o)
- **Navigation Planning**: < 3s per page
- **Data Extraction**: < 2s per page

### Overall UX Targets

- **Cached query**: < 1s
- **Simple scrape** (1-5 pages): < 30s
- **Complex scrape** (50+ pages): < 3min
- **Large scrape** (500+ pages): Background job with progress updates

## Cost Optimization

### Caching Strategy

1. **Navigation patterns**: Cache successful navigation (existing)
2. **Scrape results**: Cache for 1 hour (configurable)
3. **LLM responses**: Cache intent parsing for similar queries

### Token Usage

- Use `gpt-4o-mini` for simple intent parsing
- Use `gpt-4o` for complex navigation/extraction
- Implement prompt compression for large pages

### Scraping Costs

- Use Firecrawl for protected sites only
- Fall back to Playwright for simple pages
- Implement smart deduplication to avoid re-scraping

**Estimated monthly costs** (1000 scrapes/month):
- Scraping: $50-100 (Firecrawl)
- LLM: $30-60 (OpenAI)
- Storage: $10-20 (PostgreSQL + Redis + Pinecone)
- **Total**: ~$90-180/month

## Security Considerations

1. **Rate Limiting**: Respect robots.txt and rate limits
2. **Data Privacy**: Anonymize/encrypt sensitive scraped data
3. **User Auth**: Implement user-level access control for MCP server
4. **Cost Controls**: Hard limits on pages/cost per execution
5. **Content Filtering**: Detect and reject malicious/NSFW content

## Error Handling

### Error Categories

```typescript
enum ErrorCategory {
  SCRAPING_ERROR = "scraping_error",        // Site unreachable, timeout
  EXTRACTION_ERROR = "extraction_error",    // Failed to parse data
  RATE_LIMIT = "rate_limit",                // Hit rate limit
  AUTH_REQUIRED = "auth_required",          // Login required
  COST_LIMIT = "cost_limit",                // User exceeded budget
  INVALID_TARGET = "invalid_target"         // Malformed URL/query
}

// AI-friendly error messages
function formatErrorForAI(error: ScrapingError): string {
  switch (error.category) {
    case ErrorCategory.SCRAPING_ERROR:
      return `I couldn't reach ${error.url}. The site might be down or blocking scrapers. Would you like me to try again or use a different approach?`;

    case ErrorCategory.EXTRACTION_ERROR:
      return `I successfully loaded ${error.url} but couldn't extract the data you requested. The page structure might have changed. Can you clarify what data you're looking for?`;

    case ErrorCategory.AUTH_REQUIRED:
      return `${error.url} requires authentication. I can't log in automatically yet. Would you like me to scrape publicly accessible pages instead?`;

    // ... other categories
  }
}
```

## Monitoring & Observability

### Metrics to Track

- Scrape success rate (by domain)
- Average scrape time
- LLM token usage
- Cache hit rate
- Cost per scrape
- User conversation completion rate

### Logging

```typescript
// Structured logging for analysis
logger.info("scrape_executed", {
  execution_id: execution.id,
  plan_id: plan.id,
  pages: execution.pagesScraped,
  items: execution.itemsExtracted,
  duration_ms: execution.durationMs,
  cost: execution.actualCost,
  success: execution.status === "completed"
});
```

---

## Next Steps

1. **Immediate**: Set up MCP server boilerplate (Phase 1, Task 1)
2. **Week 1**: Implement core tools (plan/execute/fetch)
3. **Week 2**: Test with Claude Desktop integration
4. **Week 3+**: Follow phased roadmap

See `/PROGRESS.md` for current implementation status.
