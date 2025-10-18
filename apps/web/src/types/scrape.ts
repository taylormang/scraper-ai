export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message?: string;
  };
}

export interface ScrapeMetadata {
  title?: string;
  description?: string;
  language?: string;
  sourceURL?: string;
}

export type ThoughtSeverity = 'info' | 'warning' | 'error';

export interface ThoughtEntry {
  id: string;
  text: string;
  body?: unknown;
  createdAt: string;
  severity: ThoughtSeverity;
}

export type WorkflowStepStatus = 'pending' | 'in_progress' | 'success' | 'error';

export interface WorkflowStep {
  id: string;
  label: string;
  status: WorkflowStepStatus;
  startedAt?: string;
  completedAt?: string;
  thoughts: ThoughtEntry[];
}

export interface WorkflowLog {
  steps: WorkflowStep[];
}

export interface ScrapeSuccessResultPayload {
  success: true;
  id: string;
  url: string;
  markdown: string;
  html: string;
  structuredData?: unknown;
  metadata: ScrapeMetadata;
  duration: number;
  scrapedAt: string;
  prompt?: string;
  pages?: ScrapePageResult[];
  workflow?: WorkflowLog;
}

export interface ScrapeFailureResultPayload {
  success: false;
  workflow: WorkflowLog;
  error?: string;
  message?: string;
}

export type ScrapeResultPayload = ScrapeSuccessResultPayload | ScrapeFailureResultPayload;

export interface ScrapeConfig {
  url: string;
  prompt?: string;
  pagination?: ScrapePagination;
  [key: string]: unknown;
}

export interface ScrapePagination {
  autoPaginate?: boolean;
  maxPages?: number;
  maxResults?: number;
  maxWaitTime?: number;
}

export interface ScrapePageResult {
  index: number;
  url: string;
  markdown?: string;
  html?: string;
  structuredData?: unknown;
  metadata?: ScrapeMetadata;
}

export interface ScrapeRecord {
  id: string;
  name: string;
  status: string;
  config: ScrapeConfig;
  results?: ScrapeResultPayload;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScrapeListData {
  scrapes: ScrapeRecord[];
  count: number;
}
