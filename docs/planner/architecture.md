# Prompt-to-Scrape Planner Architecture

This document captures the current design of the prompt-driven scraping workflow and highlights the remaining steps.

## High-Level Flow

```
User Prompt
   ↓
1. Planner Service (LLM → structured plan)
   ↓
2. Recon Service (Firecrawl recon scrape)
   ↓
3. Pagination Inference (LLM over structured summary)
   ↓
4. Extraction Schema Planning (LLM + Firecrawl extract)
   ↓
5. Job Config Assembly + Validation
   ↓
6. Full Crawl & Persistence (existing scraper service)
```

The planner UI (`/planner`) walks through the first five steps today, providing visibility into inputs, outputs, traces, and job previews at each stage.

## Components

### Planner Service
- **File:** `apps/api/src/services/planner.ts`
- **Endpoint:** `POST /api/planner`
- **Purpose:** Convert a natural-language request into a structured scrape plan (base URL, extraction fields, pagination intent, etc.)
- **Implementation:**
  - Calls OpenAI (GPT-4o mini) with a strict JSON schema.
  - Validates output with Zod (`apps/api/src/types/planner.ts`).
  - Records each call in the `traces` table (`type = create-scrape-plan`).
- **UI:** Step 1 of `/planner` page summarises the plan and provides raw JSON.

### Recon Service
- **File:** `apps/api/src/services/recon.ts`
- **Endpoint:** `POST /api/planner/recon`
- **Purpose:** Fetch a single page via Firecrawl to understand structure.
- **Features:**
  - Two-pass scrape (3s wait, retry with 7s) to handle loading spinners.
  - Returns markdown, HTML, metadata, and a **pagination summary** (see below).
- **Traces:** Recon itself is not traced (Firecrawl call), but downstream inference is.
- **UI:** Step 2 shows recon metadata, truncated markdown/HTML, and the generated summary JSON.

### Pagination Summary & Inference
- **Summary Builder:** `apps/api/src/utils/paginationSummary.ts`
  - Uses Cheerio to sanitise HTML.
  - Extracts ranked anchors/buttons (keyword + href heuristics), navigation fragments, head/tail text.
  - Produces a concise JSON document fed to the LLM and displayed in the UI.
- **Inference Service:** `apps/api/src/services/pagination.ts`
  - **Endpoint:** `POST /api/planner/pagination`
  - Accepts recon output + summary, calls OpenAI (GPT-4o mini).  
  - Returns strategy (`next_link`, `load_more`, `unknown`), confidence, selectors, action hints, notes, reasoning.
  - Attaches the summary to the response and records a trace (`type = infer-pagination`).
- **UI:** Step 3 displays strategy, confidence, selectors/actions, and raw inference JSON.

### Extraction Schema Service
- **File:** `apps/api/src/services/extraction.ts`
- **Endpoint:** `POST /api/planner/extraction`
- **Purpose:** Refine the Firecrawl extraction prompt, then run a single-page extract to infer schema.
- **Implementation:**
  - Calls OpenAI (GPT-4o mini) with recon context + user instructions to craft a refined extraction prompt and field list.
  - Executes `firecrawl.extract` on the recon URL, capturing a JSON sample for schema inference.
  - Merges LLM-suggested fields with inferred fields from the sample (`apps/api/src/types/extraction.ts`) and records a trace (`type = plan-extraction-schema`).
- **UI:** Step 4 surfaces the refined prompt, LLM fields, inferred fields, and a sample payload with expandable raw data.

### Job Assembly Service
- **File:** `apps/api/src/services/jobAssembly.ts`
- **Endpoint:** `POST /api/planner/job`
- **Purpose:** Assemble a Firecrawl crawl configuration by combining plan metadata, pagination strategy, and extraction schema.
- **Implementation:**
  - Validates input (`apps/api/src/types/job.ts`) combining plan, pagination, and extraction outputs.
  - Produces a Firecrawl crawl payload (URL, refined prompt, scrape options, pagination actions) plus a merged field schema and warnings.
  - Records a trace entry (`type = assemble-job-config`) capturing the assembled payload.
- **UI:** Step 5 previews crawl configuration JSON, aggregated schema, and any warnings/notes, with re-run support.

### Trace Infrastructure
- **Tables:** `traces` defined for both Postgres & SQLite (`apps/api/src/db/schema.ts` and `sqliteClient.ts`).
- **Repositories:** `apps/api/src/repositories/*TraceRepository.ts` with lazy wiring in `repositories/index.ts`.
- **Service:** `apps/api/src/services/trace.ts`
- **Endpoint:** `GET /api/traces`
- **UI:** `/traces` page lists all LLM interactions for audit/debugging.

## Planner UI (`/planner`)
- Lives in `apps/web/src/components/planner/PlannerPlayground.tsx`.
- Presents:
  1. Suggested prompts covering a wide range of sites/use cases for spot checks:
     - Hacker News front page discussions.
     - Zendesk Marketplace app listings.
     - Amazon search results for noise-cancelling headphones.
     - Acquire.com SaaS businesses for sale.
     - Reuters Markets live financial news feed.
     - Product Hunt daily product launches.
     - arXiv latest machine learning research papers.
     - Indeed remote software engineer job listings.
     - Etsy handmade jewelry storefronts.
     - Yelp top-rated coffee shops in Seattle.
  2. Step-by-step results with friendly cards and raw JSON toggles.
  3. Automatic chaining: plan → recon → pagination → extraction schema → job assembly.
- Integrates a thought log transcript for each step (plan, recon, pagination, extraction), mirroring the backend workflow.
- Relies on types in `apps/web/src/types/planner.ts`.

## Known Gaps / Next Steps
1. **Full Pipeline Orchestration (Step 6)**
   - Tie everything together into a single endpoint that launches a verified crawl and persists results.
   - Expose orchestrated run via UI.

2. **Heuristics & Caching**
   - Site-specific pagination overrides (optional, backlog).
   - Cache recon summaries per URL to avoid re-scraping.

3. **LLM Cost Controls & Logging**
   - Track tokens per call (already available via trace metadata).
   - Consider rate limiting, batching, or a lightweight fallback model.

## Testing & Validation
- Type checks: `npx tsc --noEmit` (API) and `npm run typecheck --workspace=apps/web`.
- Manual verification:
  - Planner: submit each suggested prompt, confirm outputs for Steps 1–5.
  - Traces: ensure `create-scrape-plan`, `infer-pagination`, `plan-extraction-schema`, and `assemble-job-config` entries record summary/payload.
  - Recon: inspect markdown/HTML preview to confirm spinner retry works.

## Future Ideas
- Integrate screenshots into summaries (optional).
- Add a “save plan” or “share trace” feature for collaborative debugging.
- Implement automated evaluations comparing LLM pagination output to ground truth selectors.

---
Last updated: 2025-10-20
