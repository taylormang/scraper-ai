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
