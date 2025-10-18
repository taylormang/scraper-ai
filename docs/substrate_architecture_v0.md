⚙️ Substrate MVP Definition (v0)

The substrate MVP is a minimal, persistent, LLM-driven web data acquisition and reasoning system.
It is not yet verticalized, not yet automated, but is self-contained enough to demonstrate full user value via conversational engagement and transparent execution.

🧱 Core MVP Goals

Let a user describe what data they want, and the system:

Plans a scrape.

Executes it.

Extracts structured data.

Stores it persistently.

Exposes it for query and summarization.

Everything happens through LLM-powered reasoning + transparent logs.

The system runs in real-time, just-in-time, no background scheduling.

✅ MVP MUST INCLUDE

1. Persistent Data Store

Postgres (or similar) for all structured entities: Plans, Runs, Records, Logs, Artifacts.

Records persisted across sessions for aggregation, querying, and conversational access.

Basic CRUD APIs for all objects.

Metadata for traceability (plan_id, run_id, source_url, timestamps).

→ This enables users to “talk to” accumulated datasets even after runs complete.

2. LLM Planning & Scrape Orchestration

Natural language → structured Scrape Plan JSON.

LLM determines: intent, target URL(s), scrape depth, pagination hints, and data shape.

Human-readable Plan Card for review.

Clarification flow if uncertain (interactive question).

Firecrawl-based execution from that plan.

→ Demonstrates no-config → fallback UX loop.

3. Extraction & Schema Layer (Dynamic Registry)

LLM-generated schema inferred from site content and user intent.

Schema passed to Firecrawl for extraction.

Schema stored as JSON alongside each run for reproducibility.

Basic normalization (e.g., dates, numeric ranges, canonical URLs).

Deduping via URL + text hash.

→ Shows automatic adaptation and data structuring.

4. Logging & Observability

“Progress/thought logs” for each run:

LLM planning rationale,

Firecrawl steps,

extraction stats,

errors.

Logs viewable via API and UI (read-only for now).

Minimal metrics (pages scraped, items extracted, runtime, success/failure count).

→ Trust and visibility backbone.

5. Conversational Query Layer

LLM interprets user questions over stored datasets.

Queries translate to:

SQL filters (title LIKE '%AI%', date > last week)

Sorting/aggregation (count by domain, top 5 recent)

Returns structured results + summary (in conversational form).

Support for multiple datasets (cross-run queries).

Ability to export results (CSV or JSON).

→ Enables the “talk to your data” loop.

6. UI Layer (Next.js/Tailwind)

Purpose: transparency, debug, iteration.

Core UI views:

Home: list of Plans and Runs.

Plan Detail: show scrape config + logs + sample results.

Dataset View: table + chat panel to query.

LLM Chat Sidebar: conversation-driven control.

Basic auth-less single-user mode for MVP.

→ Enables early visibility and manual validation loops.

7. MCP + API Surface (Scaffolding)

Early MCP definitions (tool signatures) for:

plan_scrape(prompt)

run_scrape(plan_id)

get_logs(run_id)

query_dataset(dataset_id, query_text)

Only partial exposure in v0; enough for LLM integration later.

→ Architectural forward-compatibility.

⚙️ MVP SHOULD ANTICIPATE (Architectural Hooks)

These are not built yet, but the design should leave space for them:

Area Hook Future Use
Vector embeddings Field in Record schema for vector IDs Semantic search + summarization
Scheduling schedule column in Plan table (unused) Future recurring scrapes
Self-healing Retryable state machine for failed runs Future DOM drift recovery
Auth/Session User ID field in Plan/Run tables Multi-user future
Extensibility Schema registry endpoint Community schema plugins

→ Keeps v0 simple but expandable.

❌ MVP DEFERS (Out of Scope for v0)
Category Deferral
Automation No background runs, scheduling, or deltas.
Browser actions No login, CAPTCHAs, or post requests.
Semantic vector search Not implemented, placeholder only.
Multi-user / permissions Single user only.
Notifications / webhooks No triggers yet.
Full MCP deployment Only minimal subset exposed.
Self-healing Failures are surfaced, not auto-fixed.
Advanced data validation No schema consistency or freshness checks yet.
📊 MVP Success Criteria
Metric Target Why
Plan success rate ≥70% of scrapes run end-to-end without clarification Proves core autonomy
Valid extraction rate ≥85% records have complete key fields Confirms extraction quality
User-perceived latency <2 minutes from prompt → structured data Keeps LLM loop responsive
Log visibility 100% of runs emit readable progress logs Trust & debugging
Dataset persistence 100% runs queryable after restart Proves storage reliability
🔁 MVP Golden Path Flow
User prompt → LLM Planner → Plan Card → User Approves
↓
Firecrawl Executor → Extraction + Schema → Persist Records
↓
User queries dataset → LLM translates to SQL → Results + summaries

Every step observable, no background automation.

🧩 MVP Object Model (High-Level)
Object Fields (simplified) Notes
Plan id, prompt, target_urls[], schema_json, created_at Planned scrape
Run id, plan_id, started_at, finished_at, status, logs Execution trace
Record id, run_id, data_json, canonical_url, hash Structured item
Log run_id, timestamp, message, level Traceability
Artifact type (csv, summary), data Exports / summaries
⚡ Architectural Philosophy

Conversational orchestration: LLM sits on top of deterministic pipelines — not “agent chaos.”

Human visibility first: Progress logs are non-negotiable.

Composable building blocks: Each module (Planner, Executor, Extractor, Query) should be callable independently.

Persistent-first design: Every action leaves a reproducible trace in the DB.
