# Product Vision: AI-Native Web Intelligence Platform

## Vision Statement

**"Let your AI go get valuable data while handling queries and tasks for you"**

An MCP-first web scraping platform that transforms how AI assistants gather and analyze web data. Instead of users manually scraping, cleaning, and feeding data to AI - the AI itself orchestrates the entire intelligence-gathering workflow through natural conversation.

## Core Concept

### The Traditional Workflow (Broken)
```
User → Manual scraping → Data cleaning → Upload to AI → Ask questions → Get answers
```
**Problems**: Time-consuming, requires technical skills, breaks conversational flow, creates data silos

### Our Workflow (Seamless)
```
User: "What are some possible niches in the Amazon pet toys market?"
  ↓
AI: [Uses MCP to plan scrape] → [Executes scrape] → [Stores data] → [Analyzes] → Answers
```
**Benefits**: Natural conversation, AI handles complexity, contextual data persistence, intelligent caching

## Product Positioning

**Primary Interface**: Model Context Protocol (MCP) servers
**Primary User**: Claude (and other MCP-compatible AI assistants)
**End User Experience**: Conversational data intelligence - zero technical friction

### What We're NOT
- ❌ Another headless browser automation tool
- ❌ A scraping API with complex configuration
- ❌ A data pipeline platform requiring engineering knowledge
- ❌ A standalone application with its own UI

### What We ARE
- ✅ An AI-native intelligence gathering system
- ✅ A conversational interface to the entire web
- ✅ An autonomous data collection agent for AI assistants
- ✅ A memory layer for web-sourced knowledge

## Core User Experience

### Example Conversation 1: Market Research
```
User: What are some possible niches in the Amazon pet toys market?

[AI internally uses MCP tools:]
1. tool:plan_scrape({
     query: "Amazon pet toys market analysis",
     target: "amazon.com/s?k=pet+toys",
     extract: "products, categories, reviews, price ranges"
   })
2. [AI asks clarifying questions if needed]
3. tool:execute_scrape()
4. tool:analyze_data({ focus: "niche opportunities" })

AI: I've analyzed 200+ pet toys on Amazon. Here are 5 underserved niches:
    1. **Senior dog toys** (low competition, growing demographic)
       - Only 12 products specifically marketed for older dogs
       - High review volume on existing products (avg 4.6★)
       - Price range: $15-40
    [continues with analysis...]

User: Show me the top-rated products in the senior dog category

AI: [Uses tool:fetch_scraped_data with filters] Here are the 5 highest-rated...
```

### Example Conversation 2: Competitive Intelligence
```
User: Compare the pricing strategies of the top 3 CRM providers

AI: I'll need to scrape their pricing pages. Let me gather that data.
    [tool:plan_scrape for Salesforce, HubSpot, Pipedrive]
    [tool:execute_scrape with parallel execution]

    Based on their current pricing:
    - Salesforce: Tier-focused, $25-$300/user/month...
    - HubSpot: Freemium model with feature gates...
    - Pipedrive: Simplified 3-tier, $14-$99/user/month...

User: What features are behind the paywall in HubSpot's free tier?

AI: [tool:fetch_scraped_data from previous scrape] The free tier excludes...
```

### Example Conversation 3: Content Monitoring
```
User: Track changes to the YC startup advice page weekly

AI: I'll set that up as a monitoring job.
    [tool:create_monitor({
       url: "ycombinator.com/advice",
       schedule: "weekly",
       alert_on: "content_changes"
     })]

    Monitor created. I'll notify you when content changes are detected.

[One week later]
AI: The YC advice page was updated yesterday. Key changes:
    - New section added: "AI startup considerations"
    - Updated advice on fundraising timing
    - Would you like the full diff?
```

## Technical Architecture

### MCP Server Interface

**Core Tools Exposed to AI:**

```typescript
// Planning & Configuration
tool:plan_scrape({
  query: string,           // Natural language description
  target: string | url,    // Target website/search
  extract: string[],       // Data to extract (NL or structured)
  strategy?: "single" | "multi-page" | "monitor"
})

// Execution
tool:execute_scrape({
  plan_id: string,
  options?: {
    max_pages?: number,
    max_time?: number,
    proxy?: boolean
  }
})

// Data Access
tool:fetch_scraped_data({
  query: string,           // Natural language or structured query
  filters?: object,
  format?: "summary" | "detailed" | "raw"
})

// Historical & Monitoring
tool:list_scrapes({
  timeframe?: string,
  domain?: string
})

tool:create_monitor({
  plan_id: string,
  schedule: string,
  alert_conditions: object
})

// Interactive Refinement
tool:ask_clarification({
  question: string,
  context: string
})
```

### Intelligent Scraping Engine

**AI-Powered Components:**

1. **Intent Parser**: Converts natural language queries into scraping strategies
   - "Find all competitors in X market" → Multi-domain product scraping
   - "Track changes to pricing page" → Single-page monitoring with diff detection
   - "What are customers saying about Y?" → Review aggregation scraping

2. **Navigation Planner**: LLM-driven page interaction
   - Interprets page structure without hardcoded selectors
   - Handles dynamic content, infinite scroll, pagination
   - Adapts to layout changes automatically

3. **Data Extractor**: Schema-free extraction
   - Uses LLM to understand content structure
   - Returns data in conversation-ready formats
   - Automatic relevance filtering

4. **Memory Layer**: Contextual caching
   - Deduplicates requests across conversations
   - Maintains scrape history for reference
   - Tracks data freshness and suggests updates

### Data Flow Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     AI Assistant                        │
│                   (Claude, GPT, etc)                    │
└────────────────────┬────────────────────────────────────┘
                     │ MCP Protocol
                     ▼
┌─────────────────────────────────────────────────────────┐
│                   MCP Server Layer                      │
│  ┌────────────┐  ┌──────────┐  ┌──────────────┐       │
│  │ Tool       │  │ Context  │  │ Conversation │       │
│  │ Router     │  │ Manager  │  │ State        │       │
│  └────────────┘  └──────────┘  └──────────────┘       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Scraping Orchestration Engine              │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────┐ │
│  │ Intent       │→ │ Navigation    │→ │ Extraction  │ │
│  │ Parser       │  │ Planner       │  │ Engine      │ │
│  │ (LLM)        │  │ (LLM+Browser) │  │ (LLM)       │ │
│  └──────────────┘  └───────────────┘  └─────────────┘ │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                   Data Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Raw Scrapes  │  │ Processed    │  │ Vector Store │ │
│  │ (Historical) │  │ Results      │  │ (Semantic    │ │
│  │              │  │ (Cached)     │  │  Search)     │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Key Differentiators

### 1. Conversational First
Traditional scrapers require upfront configuration. We enable emergent, conversation-driven data collection where requirements evolve naturally.

### 2. AI is the User
We optimize for AI consumption, not human dashboards. Data formats, error handling, and caching are designed for LLM workflows.

### 3. Zero Technical Debt
No selectors to maintain. No brittle scripts. LLM-powered navigation adapts to site changes automatically.

### 4. Contextual Intelligence
The system learns from conversation context. "Get more details on that" or "Check if that's changed" work seamlessly because the AI maintains state.

### 5. Proactive Capabilities
AI can suggest data gathering: "Would you like me to check competitor pricing?" or "I can monitor that page for changes."

## Business Model Alignment

### Target Customers

**Primary**: Power users of AI assistants (Claude, ChatGPT Plus subscribers)
- Researchers, analysts, consultants
- Product managers, founders
- Writers, journalists
- Investors, due diligence teams

**Secondary**: Development teams building AI agents
- RAG pipeline developers
- AI automation builders
- Custom MCP server creators

### Pricing Model (Preliminary)

**Free Tier**:
- 100 pages/month
- 5 active monitors
- 7-day data retention

**Pro Tier** ($29/month):
- 5,000 pages/month
- 50 active monitors
- 90-day data retention
- Priority execution

**Enterprise**:
- Custom volume
- Dedicated proxies
- Unlimited retention
- API access

## Technical Milestones

### Phase 1: Core MCP Server (Months 1-2)
- ✅ Basic MCP server with tool definitions
- ✅ Simple scraping engine (Firecrawl integration)
- ✅ Data storage and retrieval
- ⬜ Intent parsing (LLM-powered query understanding)
- ⬜ Conversation state management

### Phase 2: Intelligent Navigation (Months 3-4)
- ⬜ LLM-driven page interaction
- ⬜ Multi-page scraping workflows
- ⬜ Authentication handling
- ⬜ Dynamic content support

### Phase 3: Memory & Monitoring (Months 4-5)
- ⬜ Historical data tracking
- ⬜ Change detection
- ⬜ Scheduled monitoring
- ⬜ Semantic search over scraped data

### Phase 4: Advanced Intelligence (Months 6+)
- ⬜ Proactive suggestions
- ⬜ Cross-domain data synthesis
- ⬜ Automated data quality validation
- ⬜ Cost optimization (caching strategy)

## Success Metrics

**User Experience**:
- Time from question to answer (target: <30 seconds for cached, <2 minutes for new scrapes)
- Conversation completion rate (% of queries successfully answered)
- Follow-up question rate (indicates conversational depth)

**Technical**:
- Scrape success rate (target: >95%)
- Data freshness (average age of cached data)
- Cache hit rate (efficiency metric)

**Business**:
- AI assistant adoption rate (% of Claude users who try MCP)
- Monthly active conversations
- Pages scraped per user (engagement)
- Conversion rate (free → paid)

## Competitive Landscape

| Product | Model | Weakness We Address |
|---------|-------|---------------------|
| Firecrawl | API-first | No conversational interface, requires integration |
| Browse.ai | No-code UI | Manual setup, not AI-native |
| Apify | Developer platform | Complex, not conversational |
| Scrapy | Code framework | Requires programming, maintenance burden |
| Built-in browser tools | Native to AI | Limited, slow, no memory/history |

**Our Moat**: We're not competing on scraping capability - we're competing on UX. The ability to have a natural conversation that seamlessly includes web data gathering is the product.

## Open Questions

1. **Rate Limiting**: How do we balance user experience with responsible scraping?
2. **Error Communication**: How should AI convey scraping failures conversationally?
3. **Privacy**: What data retention policies align with user expectations?
4. **Disambiguation**: When should the system ask clarifying questions vs. making smart defaults?
5. **Cost**: How do we price for AI token usage in navigation/extraction?

## Getting Started (Developer)

```bash
# Install MCP server
npm install -g @scraper/mcp-server

# Configure in Claude Desktop
code ~/Library/Application\ Support/Claude/claude_desktop_config.json

# Add:
{
  "mcpServers": {
    "web-scraper": {
      "command": "npx",
      "args": ["@scraper/mcp-server"]
    }
  }
}

# Restart Claude Desktop, then:
"What are the top posts on Hacker News today?"
```

## Conclusion

This is not a scraping tool. This is **conversational access to the entire web**.

By positioning AI as the user, we eliminate the friction of traditional data gathering. The question "What are some possible niches in the Amazon pet toys market?" should be answerable in a single conversation - not a multi-hour technical project.

We're building the infrastructure that makes AI assistants truly intelligent - not just about their training data, but about the real-time web.

---

**Next Steps**: See `/docs/technical_architecture.md` for implementation details and `/PROGRESS.md` for current development status.
