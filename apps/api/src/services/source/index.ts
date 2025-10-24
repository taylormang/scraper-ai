/**
 * Source services - AI-powered Source configuration generation
 *
 * Main orchestrator:
 * - sourceWorkflow.ts: Executes full 4-step AI workflow
 *
 * Individual steps:
 * - pageContent.ts: Fetch page content (markdown + HTML)
 * - paginationAnalysis.ts: Analyze pagination strategy using AI
 * - engineConfig.ts: Generate Firecrawl actions based on strategy
 * - contentAnalysis.ts: Analyze data structure and extract samples
 */

export { executeSourceWorkflow } from './sourceWorkflow.js';
export { fetchPageContent } from './pageContent.js';
export { analyzePagination } from './paginationAnalysis.js';
export { generateFirecrawlConfig } from './engineConfig.js';
export { analyzeContentStructure } from './contentAnalysis.js';
