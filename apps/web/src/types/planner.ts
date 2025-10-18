export interface PlanFieldSpec {
  name: string;
  description: string;
  required: boolean;
}

export interface PlanPagination {
  strategy: 'page_count' | 'item_count' | 'unknown';
  targetValue: number | null;
  notes: string | null;
}

export interface ScrapePlan {
  baseUrl: string | null;
  alternativeUrls: string[];
  searchQuery: string | null;
  objective: string;
  extractionFormat: 'json' | 'markdown' | 'html';
  extractionFields: PlanFieldSpec[];
  pagination: PlanPagination;
  constraints: string[];
  assumptions: string[];
  confidence: 'low' | 'medium' | 'high';
}

export interface PlanResponse {
  plan: ScrapePlan;
  reasoning: string | null;
}

export interface ReconResponse {
  url: string;
  markdown?: string;
  html?: string;
  metadata?: Record<string, unknown> | null;
  metadata_snapshot?: Record<string, unknown> | null;
  metadataSnapshot?: Record<string, unknown> | null;
  summary?: PaginationSummaryPreview;
}

export interface PaginationSummaryAnchor {
  text: string;
  href: string | null;
  rel: string | null;
  classes: string[];
  score: number;
}

export interface PaginationSummaryButton {
  text: string;
  selector: string;
  score: number;
}

export interface PaginationSummaryPreview {
  url: string;
  title?: string;
  headings?: string[];
  anchorSample?: PaginationSummaryAnchor[];
  buttonSample?: PaginationSummaryButton[];
  navigationFragments?: string[];
  textHead?: string;
  textTail?: string;
  stats?: {
    totalAnchors: number;
    totalButtons: number;
    textLength: number;
  };
}

export interface PaginationInferenceResponse {
  pagination: {
    strategy: 'next_link' | 'load_more' | 'unknown';
    confidence: 'low' | 'medium' | 'high';
    selector: string | null;
    hrefTemplate: string | null;
    actions: Array<Record<string, unknown>>;
    notes: string | null;
  };
  reasoning: string | null;
  summary?: PaginationSummaryPreview;
}

export type ExtractionFieldSource = 'plan' | 'llm' | 'inferred';

export interface ExtractionField {
  name: string;
  description: string;
  required: boolean;
  type: string;
  example?: unknown;
  source: ExtractionFieldSource;
}

export interface ExtractionSchemaResponse {
  refinedPrompt: string;
  notes?: string | null;
  llmFields: ExtractionField[];
  inferredFields: ExtractionField[];
  extractStatus?: string | null;
  sample?: unknown;
  rawExtract?: unknown;
}

export type FirecrawlFormat = string | { type: 'json'; prompt: string };

export type FirecrawlAction = Record<string, unknown>;

export interface FirecrawlScrapeOptions {
  formats: FirecrawlFormat[];
  actions?: FirecrawlAction[];
  waitFor?: number;
  timeout?: number;
  onlyMainContent?: boolean;
  mobile?: boolean;
  fastMode?: boolean;
  [key: string]: unknown;
}

export interface FirecrawlCrawlConfig {
  url: string;
  prompt?: string;
  limit?: number;
  scrapeOptions?: FirecrawlScrapeOptions;
  includePaths?: string[];
  excludePaths?: string[];
  allowSubdomains?: boolean;
  allowExternalLinks?: boolean;
  maxDiscoveryDepth?: number;
  delay?: number;
  [key: string]: unknown;
}

export interface JobAssemblyResponse {
  crawlConfig: FirecrawlCrawlConfig;
  schema: {
    fields: ExtractionField[];
  };
  warnings: string[];
  notes: string[];
  summary: {
    objective: string;
    baseUrl: string | null;
    paginationStrategy: string | null;
    paginationConfidence: string | null;
    extractionFormat: string;
    totalFields: number;
  };
}
