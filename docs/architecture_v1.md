# Scraper AI - Technical Architecture

**Version:** 2.0  
**Last Updated:** November 2024  
**Status:** Phase 1 - Core Infrastructure

---

## Table of Contents

1. [Overview](#overview)
2. [Core Principles](#core-principles)
3. [System Architecture](#system-architecture)
4. [Data Model](#data-model)
5. [Execution Flow](#execution-flow)
6. [Tool Selection Strategy](#tool-selection-strategy)
7. [Multi-Source Scraping](#multi-source-scraping)
8. [AI-Driven Configuration](#ai-driven-configuration)
9. [Conversational Querying](#conversational-querying)
10. [API Design](#api-design)
11. [Infrastructure](#infrastructure)
12. [Observability](#observability)

---

## Overview

Scraper AI is an MCP-first web scraping platform that enables AI assistants to gather and analyze web data through natural conversation. Unlike traditional scraping tools, it's designed for **dynamic, AI-driven scraping** where configurations are generated automatically from user intent.

### Key Capabilities

- **AI-powered recipe generation**: Analyzes websites to determine structure, pagination, and extraction patterns
- **Multi-source orchestration**: Scrapes multiple websites (e.g., Amazon + Walmart) into unified datasets
- **Smart tool selection**: Automatically chooses between Firecrawl, ScrapingBee, or Browserless based on site requirements
- **Resumable executions**: Long-running scrapes can pause and resume from checkpoints
- **Conversational data access**: Natural language queries over scraped datasets using vector embeddings

---

## Core Principles

### 1. **Recipes Are Reusable Configurations**

A **Recipe** is not a one-time scrape—it's a reusable template that can be executed multiple times. Think of it as a "saved search" that captures:

- Which websites to scrape
- What data to extract
- How to paginate through results
- Which scraping tool to use

### 2. **Sources Are Domain-Level Knowledge**

A **Source** represents the technical characteristics of a website domain:

- Is it static HTML or SPA?
- What anti-bot protection does it use?
- What URL patterns indicate lists vs. items?

Sources are discovered once and reused across multiple recipes.

### 3. **Executions Are Runtime Instances**

An **Execution** is one run of a recipe. It tracks:

- Real-time progress (page 23 of 50)
- State for resumability (last URL scraped)
- Costs and performance metrics
- Which dataset it produced

### 4. **Datasets Are Versioned, Searchable Outputs**

A **Dataset** is the final scraped data with:

- Structured items conforming to a schema
- Vector embeddings for semantic search
- Metadata for quality tracking
- Lineage back to the execution and recipe

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        MCP Server Layer                         │
│  (Conversational interface for Claude Desktop integration)     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                ┌───────────┴──────────┐
                │                      │
    ┌───────────▼──────────┐   ┌──────▼─────────────┐
    │   Analysis Engine    │   │  Execution Engine  │
    │   (AI-powered)       │   │  (Multi-tool)      │
    └───────────┬──────────┘   └──────┬─────────────┘
                │                      │
                │              ┌───────┴────────┬──────────┬──────────┐
                │              │                │          │          │
                │       ┌──────▼──────┐  ┌─────▼────┐  ┌──▼────────┐ │
                │       │  Firecrawl  │  │ Scraping │  │Browserless│ │
                │       │   Executor  │  │   Bee    │  │ Executor  │ │
                │       └─────────────┘  │ Executor │  └───────────┘ │
                │                        └──────────┘                 │
                │                                                     │
    ┌───────────▼─────────────────────────────────────────────────────┘
    │
┌───▼────────────────────────────────────────────────────────────────┐
│                   Data Layer (PostgreSQL + Redis)                  │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐  ┌─────────────┐     │
│  │ Sources  │  │ Recipes  │  │ Executions │  │  Datasets   │     │
│  └──────────┘  └──────────┘  └────────────┘  └─────────────┘     │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ Vector Store (pgvector) - for conversational search      │    │
│  └──────────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

#### **MCP Server** (`apps/mcp-server`)

- Exposes tools to Claude Desktop
- Handles natural language intent parsing
- Streams execution progress back to user
- Manages conversational queries over datasets

#### **Analysis Engine**

- **Input**: URL + user intent (e.g., "scrape HN posts")
- **Process**:
  1. Fetches sample page using Firecrawl
  2. Uses LLM to analyze HTML structure
  3. Determines pagination strategy
  4. Generates extraction selectors
  5. Identifies URL patterns (includePaths/excludePaths)
- **Output**: Recipe configuration

#### **Execution Engine**

- **Input**: Recipe ID
- **Process**:
  1. Selects appropriate tool (Firecrawl/ScrapingBee/Browserless)
  2. Executes scrape with progress tracking
  3. Handles pagination (URL patterns, next button, etc.)
  4. Extracts data according to recipe schema
  5. Writes structured logs (SCRAPE_RUN events)
- **Output**: Dataset

#### **Tool Executors**

- **Firecrawl**: Static HTML, URL-based pagination (~70% of cases)
- **ScrapingBee**: SPAs, infinite scroll (~25% of cases)
- **Browserless**: Complex interactions, auth flows (~5% of cases)

---

## Data Model

### Entity Relationship Diagram

```
SOURCE (domain knowledge)
  ↓ 1:many
RECIPE (scraping configuration)
  ↓ 1:many
EXECUTION (runtime instance)
  ↓ 1:1
DATASET (final output)
  ↓ 1:many
DATA_ITEM (individual records)
```

### Core Entities

#### **Source**

Represents technical characteristics of a website domain.

```typescript
type Source = {
  id: string;
  domain: string; // 'news.ycombinator.com'
  baseUrl: string; // 'https://news.ycombinator.com'

  // Rendering characteristics
  rendering: 'static' | 'spa' | 'hybrid';
  antiBot: 'none' | 'cloudflare' | 'recaptcha' | 'perimeter_x';

  // URL patterns (AI-determined)
  urlPatterns: {
    list: string[]; // ['/', '/news?p=*']
    item: string[]; // ['/item?id=*']
    exclude: string[]; // ['/user?id=*', '/login', '/submit']
  };

  // Performance metadata
  metadata: {
    lastAnalyzed: Date;
    analysisVersion: string; // Track analysis model version
    successRate: number; // 0-1, across all recipes
    avgResponseTime: number; // milliseconds
    totalExecutions: number;
  };

  createdAt: Date;
  updatedAt: Date;
};
```

**Indexing:**

- Unique index on `domain`
- Index on `rendering` for executor selection

---

#### **Recipe**

Reusable scraping configuration supporting single or multiple sources.

```typescript
type Recipe = {
  id: string;
  name: string; // "HN front page posts"
  description: string; // User's original intent
  userId: string; // Creator

  version: number; // For recipe evolution

  // Multi-source support
  sources: RecipeSource[];

  // What to extract (unified schema across all sources)
  extraction: {
    schema: JSONSchema; // Target data structure

    // Source-specific selectors
    selectorsBySource: Record<string, Selectors>;

    // Optional: field name mappings
    // e.g., { amazon: { cost: 'price' }, walmart: { amount: 'price' } }
    fieldMappings?: Record<string, Record<string, string>>;

    // Validation rules
    validation?: {
      required: string[]; // Required fields
      minItems?: number; // Minimum items per execution
      customRules?: ValidationRule[];
    };
  };

  // How to paginate
  pagination: {
    strategy: 'none' | 'url_pattern' | 'next_button' | 'infinite_scroll' | 'api';
    config: PaginationConfig;
    maxPages?: number; // Safety limit
    maxItems?: number; // Alternative limit
  };

  // Which tool to use
  executor: 'firecrawl' | 'scrapingbee' | 'browserless';

  // Performance tracking
  metrics: {
    totalExecutions: number;
    successRate: number; // 0-1
    avgDuration: number; // milliseconds
    avgCost: number; // USD
    avgItemsPerExecution: number;
  };

  // Recipe lifecycle
  status: 'active' | 'deprecated' | 'archived';

  createdAt: Date;
  updatedAt: Date;
};

type RecipeSource = {
  sourceId: string;
  label?: string; // Optional: 'amazon', 'walmart'

  // Source-specific overrides
  filters?: {
    maxPages?: number;
    includePaths?: string[]; // Override source defaults
    excludePaths?: string[];
  };

  // Optional: for weighted sampling
  weight?: number; // 0-1, relative priority
};

type Selectors = {
  [fieldName: string]: {
    css?: string; // CSS selector
    xpath?: string; // XPath selector
    regex?: string; // Regex pattern
    transform?: string; // Post-processing (e.g., 'trim', 'lowercase')
  };
};

type PaginationConfig =
  | NextButtonConfig
  | UrlPatternConfig
  | InfiniteScrollConfig
  | ApiPaginationConfig;

type NextButtonConfig = {
  selector: string; // CSS selector for next button
  maxRetries: number; // If button not found
};

type UrlPatternConfig = {
  template: string; // 'https://example.com/page={n}'
  startPage: number; // Usually 1
  pageParam: string; // 'page' or 'p' or 'offset'
};

type InfiniteScrollConfig = {
  scrolls: number; // Number of scroll actions
  waitTime: number; // Wait between scrolls (ms)
  scrollSelector?: string; // Element to scroll
};

type ApiPaginationConfig = {
  nextKey: string; // JSON path to next cursor
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
};
```

**Indexing:**

- Index on `userId` for user recipes
- Index on `status` for active recipes
- Index on `executor` for tool usage analytics
- Composite unique index on `(name, userId, version)` for versioning

---

#### **Execution**

Runtime instance of a recipe with progress tracking and resumability.

```typescript
type Execution = {
  id: string;
  recipeId: string;
  recipeVersion: number; // Snapshot which version was used
  userId: string;

  // Execution status
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

  // Multi-source progress tracking
  sourceProgress: Record<string, SourceProgress>;

  // Overall progress
  progress: {
    totalPages: number;
    completedPages: number;
    totalItems: number;
    estimatedCompletion?: Date; // ETA based on current rate
  };

  // Resumability state
  state: {
    checkpoints: Checkpoint[]; // Periodic save points
    lastCheckpoint?: Date;
  };

  // Results
  datasetId?: string; // FK to Dataset (created on completion)

  // Resource usage
  resources: {
    totalRequests: number;
    failedRequests: number;
    retries: number;
    cost: number; // USD
    creditsUsed?: number; // If using credit system
  };

  // Execution context
  trigger: {
    type: 'manual' | 'schedule' | 'webhook' | 'mcp';
    initiator?: string; // User ID or system identifier
    metadata?: Record<string, any>; // Additional context
  };

  // Error tracking
  error?: {
    code: string; // ERROR_RATE_LIMIT, ERROR_AUTH, etc.
    message: string;
    retryable: boolean;
    failedAt?: Date;
    stackTrace?: string;
  };

  startedAt: Date;
  completedAt?: Date;
  duration?: number; // milliseconds
};

type SourceProgress = {
  sourceId: string;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'failed';

  progress: {
    currentPage: number;
    itemsScraped: number;
    lastUrl?: string;
  };

  error?: {
    message: string;
    failedUrl?: string;
  };
};

type Checkpoint = {
  timestamp: Date;
  completedPages: number;
  lastUrl: string;
  state: Record<string, any>; // Tool-specific state
};
```

**Indexing:**

- Index on `recipeId` for recipe history
- Index on `userId` for user executions
- Index on `status` for monitoring active jobs
- Index on `startedAt` for time-based queries

---

#### **Dataset**

Final scraped data with metadata for quality tracking and conversational search.

```typescript
type Dataset = {
  id: string;
  executionId: string; // Which execution created this
  recipeId: string; // For easy lookup
  userId: string;

  // Multi-source tracking
  sources: DatasetSource[];

  // Schema (snapshot from recipe)
  schema: JSONSchema;

  // Data storage
  itemCount: number;
  storageLocation: {
    type: 'postgres' | 's3' | 'hybrid';
    path?: string; // S3 path if using blob storage
  };

  // Conversational search support
  embedding?: number[]; // Vector embedding (1536 dims for OpenAI)
  summary?: string; // AI-generated summary
  sampleItems: any[]; // First 3-5 items for LLM context

  // Quality metrics
  metadata: {
    completeness: number; // 0-1, % of fields populated
    quality: number; // 0-1, validation score
    freshness: Date; // When data was scraped
    tags: string[]; // User or AI-generated tags
  };

  // Lifecycle
  status: 'active' | 'archived' | 'deleted';
  expiresAt?: Date; // Optional TTL

  createdAt: Date;
  updatedAt: Date;
};

type DatasetSource = {
  sourceId: string;
  label: string; // 'amazon', 'walmart'
  itemCount: number; // Items from this source
  cost: number; // Cost attributed to this source
};
```

**Indexing:**

- Index on `recipeId` for recipe datasets
- Index on `userId` for user datasets
- Index on `status` for active datasets
- Vector index on `embedding` (pgvector ivfflat)
- Full-text index on `summary` for text search

---

#### **DataItem**

Individual scraped records within a dataset.

```typescript
type DataItem = {
  id: string;
  datasetId: string;

  // Actual scraped data
  data: Record<string, any>; // Conforms to dataset schema

  // Provenance
  sourceUrl: string; // Original URL
  sourceLabel: string; // Which source (for multi-source recipes)

  // Metadata
  scrapedAt: Date;
  position?: number; // Order in original list

  // Optional: for debugging
  _debug?: {
    rawHtml?: string; // Original HTML (if stored)
    extractionLog?: string; // Selector matching log
  };
};
```

**Indexing:**

- Index on `datasetId` for dataset queries
- Index on `sourceLabel` for filtering by source
- JSONB index on `data` for field-specific queries

---

## Execution Flow

### 1. User Request → Recipe Creation

```
User: "Get podcasts about AI from Spotify, YouTube, and Apple Podcasts"
  ↓
[MCP Server] Parses intent
  ↓
[Analysis Engine] Checks for existing recipes
  ↓
NOT FOUND → Create new recipe
  ↓
[Analysis Engine] Analyzes each source:
  • Spotify: static HTML, URL pattern pagination
  • YouTube: SPA, API pagination via next token
  • Apple: static HTML, next button pagination
  ↓
[Recipe Builder] Creates multi-source recipe:
  sources: [
    { sourceId: 'spotify', label: 'spotify' },
    { sourceId: 'youtube', label: 'youtube' },
    { sourceId: 'apple', label: 'apple' }
  ]
  extraction: {
    schema: { title, author, duration, link, source }
    selectorsBySource: { ... }
  }
  executor: 'firecrawl' (Spotify/Apple), 'scrapingbee' (YouTube)
  ↓
[Response] "Recipe created: multi-podcast-search"
```

### 2. Recipe Execution

```
[Execution Engine] Creates execution record
  status: 'pending'
  ↓
[Tool Selection] Determines executors per source:
  • Spotify → Firecrawl
  • YouTube → ScrapingBee (requires JS)
  • Apple → Firecrawl
  ↓
[Parallel Execution] Spawns workers per source:

  Worker 1 (Spotify):
    ├─ Page 1: 50 items
    ├─ Page 2: 50 items
    └─ Page 3: 50 items
    Total: 150 items

  Worker 2 (YouTube):
    ├─ API call 1: 25 items
    ├─ API call 2: 25 items
    └─ API call 3: 25 items
    Total: 75 items

  Worker 3 (Apple):
    ├─ Page 1: 30 items
    └─ Page 2: 30 items
    Total: 60 items

  ↓
[Merge Handler] Combines results:
  • Total: 285 items
  • Schema: adds 'source' field to each item
  • Deduplication: by 'title' (fuzzy match)
  • Final: 270 unique items
  ↓
[Dataset Creation] Stores:
  • Items in data_items table
  • Metadata in datasets table
  • Vector embedding of summary
  ↓
[Execution Update]
  status: 'completed'
  datasetId: 'dataset_abc123'
  ↓
[Response] "Scraped 270 podcasts from 3 sources"
```

### 3. Progress Streaming (Real-time)

```
[MCP Server] Establishes WebSocket or SSE connection
  ↓
[Execution Engine] Emits events:

  EVENT: execution.started
  { executionId, sources: ['spotify', 'youtube', 'apple'] }

  EVENT: source.progress
  { source: 'spotify', page: 1, items: 50 }

  EVENT: source.progress
  { source: 'youtube', page: 1, items: 25 }

  EVENT: source.completed
  { source: 'spotify', totalItems: 150 }

  EVENT: execution.merging
  { totalItems: 285, deduplicating: true }

  EVENT: execution.completed
  { datasetId: 'dataset_abc123', finalItems: 270 }
  ↓
[MCP Server] Streams to Claude Desktop
  ↓
Claude displays: "Scraped 150 from Spotify... 75 from YouTube... Done!"
```

---

## Tool Selection Strategy

### Decision Tree

```typescript
function selectExecutor(recipe: Recipe, source: Source): Executor {
  // Force specific tool if recipe specifies
  if (recipe.executor !== 'auto') {
    return recipe.executor;
  }

  // Check if requires JavaScript
  if (source.rendering === 'spa' || recipe.pagination.strategy === 'infinite_scroll') {
    // Check if simple SPA or complex interactions
    if (recipe.pagination.strategy === 'api') {
      return 'firecrawl'; // Can handle JSON APIs
    }

    return 'scrapingbee'; // JS rendering needed
  }

  // Check anti-bot complexity
  if (source.antiBot === 'recaptcha' || source.antiBot === 'perimeter_x') {
    return 'scrapingbee'; // Stronger proxy network
  }

  // Default to cheapest option
  return 'firecrawl';
}
```

### Cost Optimization

```typescript
class ExecutionEngine {
  async execute(recipe: Recipe): Promise<Dataset> {
    let executor = this.selectExecutor(recipe);

    try {
      // Try cheapest first
      return await this.executors[executor].execute(recipe);
    } catch (error) {
      // Automatic fallback on specific errors
      if (error.code === 'JS_REQUIRED' && executor === 'firecrawl') {
        console.log('Falling back to ScrapingBee for JS rendering');
        return await this.executors.scrapingbee.execute(recipe);
      }

      if (error.code === 'CLOUDFLARE_BLOCKED' && executor === 'firecrawl') {
        console.log('Falling back to ScrapingBee for stronger proxies');
        return await this.executors.scrapingbee.execute(recipe);
      }

      throw error;
    }
  }
}
```

### Tool Comparison Matrix

| Feature             | Firecrawl                 | ScrapingBee           | Browserless         |
| ------------------- | ------------------------- | --------------------- | ------------------- |
| **Cost/request**    | $0.001                    | $0.01-0.03            | $0.02-0.05          |
| **JavaScript**      | ❌ No                     | ✅ Yes                | ✅ Yes              |
| **Infinite scroll** | ❌ No                     | ✅ Yes                | ✅ Yes              |
| **Anti-bot**        | Medium                    | Strong                | Strongest           |
| **Speed**           | Fastest                   | Medium                | Slower              |
| **Use cases**       | Static HTML, URL patterns | SPAs, dynamic content | Complex flows, auth |

---

## Multi-Source Scraping

### Source-Specific Configuration

When a recipe targets multiple sources, each source can have:

1. **Different selectors** (different HTML structure)
2. **Different pagination** (one uses next button, another uses URL pattern)
3. **Different tool requirements** (one is static, another requires JS)

```typescript
// Example: Amazon + Walmart product scraping
const recipe: Recipe = {
  name: 'Pet toy prices',
  sources: [
    {
      sourceId: 'amazon_source_id',
      label: 'amazon',
      filters: { maxPages: 5 },
    },
    {
      sourceId: 'walmart_source_id',
      label: 'walmart',
      filters: { maxPages: 3 },
    },
  ],

  extraction: {
    // Unified schema
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        price: { type: 'number' },
        rating: { type: 'number' },
        image: { type: 'string' },
        url: { type: 'string' },
        source: { type: 'string' }, // Added automatically
      },
    },

    // Source-specific selectors
    selectorsBySource: {
      amazon: {
        title: { css: '[data-component-type="s-search-result"] h2' },
        price: { css: '.a-price-whole', transform: 'parseFloat' },
        rating: { css: '.a-icon-alt', regex: '(\d\.\d)' },
        image: { css: '.s-image', attr: 'src' },
        url: { css: 'h2 a', attr: 'href' },
      },
      walmart: {
        title: { css: '[data-automation-id="product-title"]' },
        price: { css: '[itemprop="price"]', attr: 'content' },
        rating: { css: '.rating-number', transform: 'parseFloat' },
        image: { css: '[data-automation-id="product-image"]', attr: 'src' },
        url: { css: '[data-automation-id="product-title"]', attr: 'href' },
      },
    },

    // Optional: field name mappings if sources use different names
    fieldMappings: {
      amazon: { cost: 'price' }, // Map 'cost' → 'price'
      walmart: { amount: 'price' }, // Map 'amount' → 'price'
    },
  },

  pagination: {
    strategy: 'url_pattern',
    config: {
      // Can vary per source, handled by executor
      template: 'page={n}',
      startPage: 1,
    },
  },
};
```

### Execution for Multi-Source Recipes

```typescript
class ExecutionEngine {
  async executeMultiSource(recipe: Recipe): Promise<Dataset> {
    const execution = await this.createExecution(recipe);

    // Execute sources in parallel
    const sourceResults = await Promise.allSettled(
      recipe.sources.map((recipeSource) => this.executeSource(recipe, recipeSource, execution.id))
    );

    // Track per-source progress
    const successfulSources = sourceResults
      .filter((r) => r.status === 'fulfilled')
      .map((r) => r.value);

    const failedSources = sourceResults.filter((r) => r.status === 'rejected');

    // Merge results
    const mergedItems = this.mergeSourceResults(successfulSources, recipe.extraction);

    // Create dataset
    const dataset = await this.createDataset({
      executionId: execution.id,
      items: mergedItems,
      sources: successfulSources.map((s) => ({
        sourceId: s.sourceId,
        label: s.label,
        itemCount: s.items.length,
        cost: s.cost,
      })),
    });

    // Update execution
    await this.completeExecution(execution.id, {
      status: failedSources.length > 0 ? 'partial' : 'completed',
      datasetId: dataset.id,
    });

    return dataset;
  }

  private mergeSourceResults(
    sourceResults: SourceResult[],
    extraction: Recipe['extraction']
  ): DataItem[] {
    const allItems = sourceResults.flatMap((source) =>
      source.items.map((item) => ({
        ...item,
        source: source.label, // Add source identifier
      }))
    );

    // Optional: deduplicate if configured
    // (e.g., fuzzy match on 'title' field)

    return allItems;
  }
}
```

---

## AI-Driven Configuration

### Analysis Engine Workflow

```typescript
class AnalysisEngine {
  async analyzeAndCreateRecipe(url: string, intent: string, userId: string): Promise<Recipe> {
    // Step 1: Fetch sample page
    const sample = await this.firecrawl.scrape(url, {
      formats: ['html', 'markdown'],
    });

    // Step 2: Determine if source exists
    const domain = new URL(url).hostname;
    let source = await this.db.sources.findByDomain(domain);

    if (!source) {
      // Step 3: Analyze source characteristics
      source = await this.analyzeSource(sample, domain);
      await this.db.sources.create(source);
    }

    // Step 4: Generate recipe configuration
    const recipeConfig = await this.generateRecipe(sample, source, intent);

    // Step 5: Validate and save recipe
    const recipe = await this.db.recipes.create({
      ...recipeConfig,
      userId,
      version: 1,
      status: 'active',
    });

    return recipe;
  }

  private async analyzeSource(sample: ScrapeResult, domain: string): Promise<Source> {
    const analysis = await this.llm.analyze({
      model: 'gpt-4',
      messages: [
        {
          role: 'user',
          content: `Analyze this website and determine:
        
1. Is this static HTML or a SPA?
2. What anti-bot protection is present?
3. What URL patterns indicate:
   - List pages (e.g., search results, category pages)
   - Item pages (e.g., product detail, article page)
   - Pages to exclude (e.g., user profiles, auth pages)

HTML sample:
${sample.html.substring(0, 10000)}

Return JSON matching this schema:
{
  "rendering": "static" | "spa" | "hybrid",
  "antiBot": "none" | "cloudflare" | "recaptcha",
  "urlPatterns": {
    "list": ["pattern1", "pattern2"],
    "item": ["pattern1"],
    "exclude": ["pattern1", "pattern2"]
  }
}`,
        },
      ],
    });

    return {
      id: generateId(),
      domain,
      baseUrl: `https://${domain}`,
      ...JSON.parse(analysis.content),
      metadata: {
        lastAnalyzed: new Date(),
        analysisVersion: 'v1',
        successRate: 0,
        avgResponseTime: 0,
        totalExecutions: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private async generateRecipe(
    sample: ScrapeResult,
    source: Source,
    intent: string
  ): Promise<Partial<Recipe>> {
    const analysis = await this.llm.analyze({
      model: 'gpt-4',
      messages: [
        {
          role: 'user',
          content: `Generate a scraping recipe for this intent: "${intent}"

Website: ${source.domain}
Rendering: ${source.rendering}

HTML sample:
${sample.html.substring(0, 10000)}

Markdown sample:
${sample.markdown}

Determine:
1. What data fields to extract (create JSON schema)
2. CSS selectors for each field
3. Pagination strategy (none, url_pattern, next_button, infinite_scroll)
4. If url_pattern, what is the template?
5. If next_button, what is the selector?

Return JSON matching this schema:
{
  "name": "descriptive name",
  "extraction": {
    "schema": { /* JSON Schema */ },
    "selectors": {
      "fieldName": { "css": "selector", "transform": "trim" }
    }
  },
  "pagination": {
    "strategy": "url_pattern",
    "config": { "template": "page={n}", "startPage": 1 }
  },
  "executor": "firecrawl" | "scrapingbee"
}`,
        },
      ],
    });

    return JSON.parse(analysis.content);
  }
}
```

### Prompt Engineering Guidelines

**Source Analysis Prompt:**

- Include HTML structure (first 10KB)
- Ask for specific anti-bot indicators (Cloudflare challenge, reCAPTCHA)
- Request URL pattern analysis with wildcards
- Use structured JSON output with schema

**Recipe Generation Prompt:**

- Include both HTML and Markdown views
- Show user's intent verbatim
- Request field-level CSS selectors
- Ask for pagination strategy with confidence score
- Include example output format

---

## Conversational Querying

Enable natural language queries over scraped datasets using vector embeddings.

### Dataset Embedding Generation

```typescript
class DatasetManager {
  async createDataset(executionId: string, items: DataItem[]): Promise<Dataset> {
    const recipe = await this.getRecipe(executionId);

    // Generate AI summary
    const summary = await this.generateSummary(recipe, items);

    // Generate vector embedding
    const embedding = await this.generateEmbedding(summary, recipe);

    // Sample items for LLM context
    const sampleItems = items.slice(0, 5);

    return {
      id: generateId(),
      executionId,
      recipeId: recipe.id,
      schema: recipe.extraction.schema,
      itemCount: items.length,
      embedding,
      summary,
      sampleItems,
      // ... rest of fields
    };
  }

  private async generateSummary(recipe: Recipe, items: DataItem[]): string {
    const prompt = `Summarize this dataset in 2-3 sentences:

Recipe: ${recipe.name}
Description: ${recipe.description}
Sources: ${recipe.sources.map((s) => s.label).join(', ')}
Item count: ${items.length}
Date scraped: ${new Date().toISOString()}

Sample items:
${JSON.stringify(items.slice(0, 3), null, 2)}`;

    const response = await this.llm.complete({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
    });

    return response.content;
  }

  private async generateEmbedding(summary: string, recipe: Recipe): Promise<number[]> {
    // Combine multiple signals for better search
    const text = [
      recipe.name,
      recipe.description,
      summary,
      recipe.sources.map((s) => s.label).join(' '),
    ].join('\n');

    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    return response.data[0].embedding;
  }
}
```

### Conversational Search

```typescript
class DatasetSearch {
  async search(query: string, userId: string): Promise<Dataset[]> {
    // Generate embedding for query
    const queryEmbedding = await this.generateEmbedding(query);

    // Vector similarity search
    const results = await this.db.query(
      `
      SELECT 
        d.*,
        1 - (d.embedding <=> $1) as similarity
      FROM datasets d
      WHERE d.user_id = $2
        AND d.status = 'active'
      ORDER BY d.embedding <=> $1
      LIMIT 10
    `,
      [queryEmbedding, userId]
    );

    return results.filter((r) => r.similarity > 0.7); // Threshold
  }

  async queryDataset(datasetId: string, query: string): Promise<QueryResult> {
    const dataset = await this.db.datasets.findById(datasetId);
    const items = await this.db.dataItems.findByDatasetId(datasetId);

    // Use LLM to answer query over items
    const response = await this.llm.complete({
      model: 'gpt-4',
      messages: [
        {
          role: 'user',
          content: `Answer this query about a dataset:

Query: ${query}

Dataset: ${dataset.summary}
Schema: ${JSON.stringify(dataset.schema, null, 2)}

Items (showing first 100):
${JSON.stringify(items.slice(0, 100), null, 2)}

Provide a direct answer to the query based on the data.`,
        },
      ],
    });

    return {
      answer: response.content,
      datasetId,
      itemsAnalyzed: Math.min(100, items.length),
    };
  }
}
```

### MCP Search Tool

```typescript
// In MCP Server
server.tool('search_datasets', async (args: { query: string }) => {
  const datasets = await datasetSearch.search(args.query, userId);

  return {
    content: [
      {
        type: 'text',
        text:
          `Found ${datasets.length} relevant datasets:\n\n` +
          datasets.map((d) => `• ${d.name} (${d.itemCount} items)\n  ${d.summary}`).join('\n\n'),
      },
    ],
  };
});

server.tool('query_dataset', async (args: { datasetId: string; query: string }) => {
  const result = await datasetSearch.queryDataset(args.datasetId, args.query);

  return {
    content: [
      {
        type: 'text',
        text: result.answer,
      },
    ],
  };
});
```

---

## API Design

### REST Endpoints

```typescript
// Sources
GET    /api/sources                    // List all sources
GET    /api/sources/:id                // Get source details
POST   /api/sources                    // Create source (via analysis)
PATCH  /api/sources/:id                // Update source
DELETE /api/sources/:id                // Delete source

// Recipes
GET    /api/recipes                    // List recipes (filtered by user)
GET    /api/recipes/:id                // Get recipe details
POST   /api/recipes                    // Create recipe
PATCH  /api/recipes/:id                // Update recipe
DELETE /api/recipes/:id                // Archive recipe
POST   /api/recipes/:id/versions       // Create new version

// Executions
GET    /api/executions                 // List executions
GET    /api/executions/:id             // Get execution details
POST   /api/executions                 // Start execution
PATCH  /api/executions/:id/pause       // Pause execution
PATCH  /api/executions/:id/resume      // Resume execution
DELETE /api/executions/:id             // Cancel execution
GET    /api/executions/:id/logs        // Get execution logs (SCRAPE_RUN)

// Datasets
GET    /api/datasets                   // List datasets
GET    /api/datasets/:id               // Get dataset metadata
GET    /api/datasets/:id/items         // Get dataset items (paginated)
POST   /api/datasets/search            // Semantic search
POST   /api/datasets/:id/query         // Query specific dataset
DELETE /api/datasets/:id               // Delete dataset

// Analysis (AI-powered)
POST   /api/analyze                    // Analyze URL and create recipe
POST   /api/analyze/source             // Analyze just source
POST   /api/analyze/preview            // Preview extraction (no save)
```

### WebSocket Events

```typescript
// Execution progress streaming
ws://api/executions/:id/stream

// Server → Client events:
{
  "type": "execution.started",
  "executionId": "exec_123",
  "sources": ["amazon", "walmart"]
}

{
  "type": "source.progress",
  "source": "amazon",
  "page": 3,
  "totalPages": 10,
  "itemsScraped": 150
}

{
  "type": "source.completed",
  "source": "amazon",
  "totalItems": 500,
  "cost": 0.05
}

{
  "type": "execution.merging",
  "totalItems": 1000,
  "deduplicating": true
}

{
  "type": "execution.completed",
  "datasetId": "dataset_456",
  "finalItems": 950,
  "totalCost": 0.12
}

{
  "type": "execution.failed",
  "error": "Rate limit exceeded",
  "retryable": true
}
```

---

## Infrastructure

### Database Schema (PostgreSQL)

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Sources table
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  domain TEXT UNIQUE NOT NULL,
  base_url TEXT NOT NULL,
  rendering TEXT NOT NULL CHECK (rendering IN ('static', 'spa', 'hybrid')),
  anti_bot TEXT NOT NULL CHECK (anti_bot IN ('none', 'cloudflare', 'recaptcha', 'perimeter_x')),
  url_patterns JSONB NOT NULL,
  metadata JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sources_domain ON sources(domain);
CREATE INDEX idx_sources_rendering ON sources(rendering);

-- Recipes table
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  user_id TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  sources JSONB NOT NULL,
  extraction JSONB NOT NULL,
  pagination JSONB NOT NULL,
  executor TEXT NOT NULL CHECK (executor IN ('firecrawl', 'scrapingbee', 'browserless')),
  metrics JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deprecated', 'archived')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(name, user_id, version)
);

CREATE INDEX idx_recipes_user_id ON recipes(user_id);
CREATE INDEX idx_recipes_status ON recipes(status);
CREATE INDEX idx_recipes_executor ON recipes(executor);

-- Executions table
CREATE TABLE executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID NOT NULL REFERENCES recipes(id),
  recipe_version INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed', 'cancelled')),
  source_progress JSONB NOT NULL DEFAULT '{}',
  progress JSONB NOT NULL,
  state JSONB NOT NULL,
  dataset_id UUID REFERENCES datasets(id),
  resources JSONB NOT NULL,
  trigger JSONB NOT NULL,
  error JSONB,
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  duration INTEGER
);

CREATE INDEX idx_executions_recipe_id ON executions(recipe_id);
CREATE INDEX idx_executions_user_id ON executions(user_id);
CREATE INDEX idx_executions_status ON executions(status);
CREATE INDEX idx_executions_started_at ON executions(started_at);

-- Datasets table
CREATE TABLE datasets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  execution_id UUID NOT NULL REFERENCES executions(id),
  recipe_id UUID NOT NULL REFERENCES recipes(id),
  user_id TEXT NOT NULL,
  sources JSONB NOT NULL,
  schema JSONB NOT NULL,
  item_count INTEGER NOT NULL,
  storage_location JSONB NOT NULL,
  embedding vector(1536),
  summary TEXT,
  sample_items JSONB NOT NULL,
  metadata JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  expires_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_datasets_recipe_id ON datasets(recipe_id);
CREATE INDEX idx_datasets_user_id ON datasets(user_id);
CREATE INDEX idx_datasets_status ON datasets(status);
CREATE INDEX idx_datasets_embedding ON datasets USING ivfflat (embedding vector_cosine_ops);

-- Data items table
CREATE TABLE data_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  source_url TEXT NOT NULL,
  source_label TEXT NOT NULL,
  scraped_at TIMESTAMP NOT NULL,
  position INTEGER
);

CREATE INDEX idx_data_items_dataset_id ON datasets(id);
CREATE INDEX idx_data_items_source_label ON data_items(source_label);
CREATE INDEX idx_data_items_data ON data_items USING gin(data);
```

### Redis (Job Queue & Caching)

```typescript
// Job queue structure (BullMQ)
{
  queue: 'executions',
  jobs: {
    'exec_123': {
      data: {
        executionId: 'exec_123',
        recipeId: 'recipe_456',
        priority: 'normal'
      },
      opts: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 }
      }
    }
  }
}

// Caching structure
{
  cache: {
    'source:amazon.com': { /* source data */ },
    'recipe:recipe_123': { /* recipe data */ },
    'execution:exec_456:progress': { /* progress data */ }
  },
  ttl: {
    'source:*': 3600,        // 1 hour
    'recipe:*': 1800,        // 30 minutes
    'execution:*': 300       // 5 minutes
  }
}
```

---

## Observability

### Structured Logging (SCRAPE_RUN)

Instead of storing SCRAPE_RUN in database, write to structured log files:

```typescript
// Log format (JSONL)
{
  "timestamp": "2024-11-06T10:30:45.123Z",
  "level": "info",
  "type": "scrape_run",
  "executionId": "exec_123",
  "runId": "run_456",
  "source": "amazon",
  "url": "https://amazon.com/s?k=dog+toys&page=1",
  "executor": "firecrawl",
  "status": "success",
  "duration": 1234,
  "itemsExtracted": 50,
  "cost": 0.001,
  "request": {
    "method": "GET",
    "options": { "formats": ["html", "markdown"] }
  },
  "response": {
    "statusCode": 200,
    "contentLength": 45678
  }
}
```

### Logging Strategy

```typescript
class ExecutionLogger {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      format: winston.format.json(),
      transports: [
        // File transport for SCRAPE_RUN events
        new winston.transports.File({
          filename: 'logs/scrape-runs.jsonl',
          level: 'info',
        }),
        // Separate file for errors
        new winston.transports.File({
          filename: 'logs/errors.jsonl',
          level: 'error',
        }),
        // Console for development
        new winston.transports.Console({
          format: winston.format.simple(),
        }),
      ],
    });
  }

  logScrapeRun(run: ScrapeRunEvent) {
    this.logger.info('scrape_run', {
      type: 'scrape_run',
      ...run,
    });
  }

  logError(error: Error, context: Record<string, any>) {
    this.logger.error('execution_error', {
      type: 'error',
      message: error.message,
      stack: error.stack,
      ...context,
    });
  }
}
```

### Metrics Collection

```typescript
// Prometheus metrics
const metrics = {
  // Execution metrics
  executionsTotal: new Counter({
    name: 'scraper_executions_total',
    help: 'Total number of executions',
    labelNames: ['status', 'executor'],
  }),

  executionDuration: new Histogram({
    name: 'scraper_execution_duration_seconds',
    help: 'Execution duration',
    labelNames: ['recipe_id', 'executor'],
    buckets: [1, 5, 10, 30, 60, 120, 300],
  }),

  executionCost: new Histogram({
    name: 'scraper_execution_cost_usd',
    help: 'Execution cost in USD',
    labelNames: ['recipe_id', 'executor'],
    buckets: [0.001, 0.01, 0.1, 1, 10],
  }),

  // Scrape run metrics
  scrapeRunsTotal: new Counter({
    name: 'scraper_runs_total',
    help: 'Total number of scrape runs',
    labelNames: ['executor', 'status'],
  }),

  scrapeRunDuration: new Histogram({
    name: 'scraper_run_duration_seconds',
    help: 'Individual scrape run duration',
    labelNames: ['executor'],
    buckets: [0.1, 0.5, 1, 2, 5, 10],
  }),

  // Dataset metrics
  datasetsCreated: new Counter({
    name: 'scraper_datasets_created_total',
    help: 'Total datasets created',
  }),

  datasetItems: new Histogram({
    name: 'scraper_dataset_items',
    help: 'Number of items per dataset',
    buckets: [10, 50, 100, 500, 1000, 5000],
  }),
};
```

### Log Analysis Tools

```bash
# Query scrape runs by execution
cat logs/scrape-runs.jsonl | jq 'select(.executionId == "exec_123")'

# Calculate average cost per executor
cat logs/scrape-runs.jsonl | jq -s 'group_by(.executor) | map({executor: .[0].executor, avg_cost: (map(.cost) | add / length)})'

# Find failed runs
cat logs/scrape-runs.jsonl | jq 'select(.status == "failed")'

# Count runs by source
cat logs/scrape-runs.jsonl | jq -s 'group_by(.source) | map({source: .[0].source, count: length})'
```

---

## Migration & Deployment

### Phase 1: Core Infrastructure (Current)

- ✅ Monorepo setup
- ✅ Database schema
- ✅ Basic MCP server
- ⬜ Analysis engine
- ⬜ Execution engine with Firecrawl

### Phase 2: Multi-Source & AI (Next)

- ⬜ Multi-source recipe support
- ⬜ AI-powered analysis
- ⬜ ScrapingBee integration
- ⬜ Progress streaming

### Phase 3: Advanced Features

- ⬜ Conversational querying
- ⬜ Vector search
- ⬜ Recipe versioning
- ⬜ Execution resumability

### Phase 4: Production Hardening

- ⬜ Browserless integration
- ⬜ Rate limiting
- ⬜ Cost optimization
- ⬜ Monitoring & alerting

---

## Appendices

### A. Example Recipes

#### Single-Source: HackerNews Front Page

```json
{
  "name": "HN front page posts",
  "sources": [
    {
      "sourceId": "hn_source_id",
      "label": "hackernews"
    }
  ],
  "extraction": {
    "schema": {
      "type": "object",
      "properties": {
        "title": { "type": "string" },
        "url": { "type": "string" },
        "points": { "type": "integer" },
        "author": { "type": "string" },
        "comments": { "type": "integer" }
      }
    },
    "selectorsBySource": {
      "hackernews": {
        "title": { "css": ".titleline > a" },
        "url": { "css": ".titleline > a", "attr": "href" },
        "points": { "css": ".score", "regex": "(\\d+)" },
        "author": { "css": ".hnuser" },
        "comments": { "css": ".subtext a:last-child", "regex": "(\\d+)" }
      }
    }
  },
  "pagination": {
    "strategy": "url_pattern",
    "config": {
      "template": "https://news.ycombinator.com/?p={n}",
      "startPage": 1
    },
    "maxPages": 3
  },
  "executor": "firecrawl"
}
```

#### Multi-Source: Product Price Comparison

```json
{
  "name": "Pet toy prices",
  "sources": [
    { "sourceId": "amazon_source_id", "label": "amazon" },
    { "sourceId": "walmart_source_id", "label": "walmart" }
  ],
  "extraction": {
    "schema": {
      "type": "object",
      "properties": {
        "title": { "type": "string" },
        "price": { "type": "number" },
        "rating": { "type": "number" },
        "reviews": { "type": "integer" },
        "url": { "type": "string" },
        "source": { "type": "string" }
      }
    },
    "selectorsBySource": {
      "amazon": {
        "title": { "css": "h2 .a-text-normal" },
        "price": { "css": ".a-price-whole", "transform": "parseFloat" },
        "rating": { "css": ".a-icon-alt", "regex": "(\\d\\.\\d)" },
        "reviews": { "css": ".a-size-base", "regex": "(\\d+)" },
        "url": { "css": "h2 a", "attr": "href" }
      },
      "walmart": {
        "title": { "css": "[data-automation-id=\"product-title\"]" },
        "price": { "css": "[itemprop=\"price\"]", "attr": "content" },
        "rating": { "css": ".rating-number" },
        "reviews": { "css": ".rating-count", "regex": "(\\d+)" },
        "url": { "css": "[data-automation-id=\"product-title\"]", "attr": "href" }
      }
    }
  },
  "pagination": {
    "strategy": "url_pattern",
    "config": {
      "template": "page={n}",
      "startPage": 1
    },
    "maxPages": 5
  },
  "executor": "firecrawl"
}
```

### B. Tool Configuration

#### Firecrawl Setup

```typescript
import Firecrawl from '@mendable/firecrawl-js';

const firecrawl = new Firecrawl({
  apiKey: process.env.FIRECRAWL_API_KEY,
});

// URL pattern pagination
const urls = Array.from({ length: maxPages }, (_, i) =>
  template.replace('{n}', String(startPage + i))
);

const results = await firecrawl.batchScrape(urls, {
  options: { formats: ['markdown', 'html'] },
});
```

#### ScrapingBee Setup

```typescript
import ScrapingBee from 'scrapingbee';

const client = new ScrapingBee({
  apiKey: process.env.SCRAPINGBEE_API_KEY,
});

// Infinite scroll
const response = await client.get({
  url: targetUrl,
  params: {
    render_js: true,
    wait: 2000,
    scroll: true,
    scroll_to: 'end',
    premium_proxy: true,
  },
});
```

#### Browserless Setup

```typescript
import puppeteer from 'puppeteer';

const browser = await puppeteer.connect({
  browserWSEndpoint: `wss://chrome.browserless.io?token=${process.env.BROWSERLESS_TOKEN}`,
});

const page = await browser.newPage();
await page.goto(url);

// Complex interactions
await page.click('.load-more');
await page.waitForSelector('.items');
```

---

## Version History

- **v2.0** (Nov 2024): Multi-source support, AI-driven analysis, SCRAPE_RUN logging
- **v1.0** (Oct 2024): Initial architecture with single-source recipes

---

**End of Document**
