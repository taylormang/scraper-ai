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
4. Extraction Schema Planning (TBD)
   ↓
5. Job Config Assembly + Validation (TBD)
   ↓
6. Full Crawl & Persistence (existing scraper service)
```

The planner UI (`/planner`) walks through the first three steps today, providing visibility into inputs, outputs, and traces at each stage.

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

### Trace Infrastructure
- **Tables:** `traces` defined for both Postgres & SQLite (`apps/api/src/db/schema.ts` and `sqliteClient.ts`).
- **Repositories:** `apps/api/src/repositories/*TraceRepository.ts` with lazy wiring in `repositories/index.ts`.
- **Service:** `apps/api/src/services/trace.ts`
- **Endpoint:** `GET /api/traces`
- **UI:** `/traces` page lists all LLM interactions for audit/debugging.

## Planner UI (`/planner`)
- Lives in `apps/web/src/components/planner/PlannerPlayground.tsx`.
- Presents:
  1. Suggested prompts (Hacker News, Zendesk Marketplace, Amazon search).
  2. Step-by-step results with friendly cards and raw JSON toggles.
  3. Automatic chaining: plan → recon → pagination.
- Relies on types in `apps/web/src/types/planner.ts`.

## Known Gaps / Next Steps
1. **Extraction Schema Planner (Step 4)**
   - Determine JSON schema/prompts for data extraction.
   - Re-use recon summary to suggest selectors/fields.

2. **Job Config Assembly (Step 5)**
   - Merge plan + pagination + extraction details into a Firecrawl crawl payload.
   - Implement “dry-run” validation with automatic retries.

3. **Full Pipeline Orchestration (Step 6)**
   - Tie everything together into a single endpoint that launches a verified crawl and persists results.
   - Expose orchestrated run via UI.

4. **Heuristics & Caching**
   - Site-specific pagination overrides (optional, backlog).
   - Cache recon summaries per URL to avoid re-scraping.

5. **LLM Cost Controls & Logging**
   - Track tokens per call (already available via trace metadata).
   - Consider rate limiting, batching, or a lightweight fallback model.

## Testing & Validation
- Type checks: `npx tsc --noEmit` (API) and `npm run typecheck --workspace=apps/web`.
- Manual verification:
  - Planner: submit each suggested prompt, confirm outputs for Steps 1–3.
  - Traces: ensure `create-scrape-plan` and `infer-pagination` entries record summary/payload.
  - Recon: inspect markdown/HTML preview to confirm spinner retry works.

## Future Ideas
- Integrate screenshots into summaries (optional).
- Add a “save plan” or “share trace” feature for collaborative debugging.
- Implement automated evaluations comparing LLM pagination output to ground truth selectors.

---
Last updated: 2025-10-17
