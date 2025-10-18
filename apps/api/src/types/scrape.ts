export type ScrapeStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ScrapeMetadata {
  title?: string;
  description?: string;
  language?: string;
  sourceURL?: string;
}

export interface ScrapePagination {
  autoPaginate?: boolean;
  maxPages?: number;
  maxResults?: number;
  maxWaitTime?: number;
}

export interface ScrapePage {
  index: number;
  url: string;
  markdown?: string;
  html?: string;
  structuredData?: unknown;
  metadata?: ScrapeMetadata;
}

export interface ScrapeConfig {
  url: string;
  prompt?: string;
  pagination?: ScrapePagination;
  [key: string]: unknown;
}

export type ScrapeThoughtSeverity = 'info' | 'warning' | 'error';

export interface ScrapeThought {
  id: string;
  text: string;
  body?: unknown;
  createdAt: string;
  severity: ScrapeThoughtSeverity;
}

export type ScrapeWorkflowStepStatus = 'pending' | 'in_progress' | 'success' | 'error';

export interface ScrapeWorkflowStep {
  id: string;
  label: string;
  status: ScrapeWorkflowStepStatus;
  startedAt?: string;
  completedAt?: string;
  thoughts: ScrapeThought[];
}

export interface ScrapeWorkflowLog {
  steps: ScrapeWorkflowStep[];
}

export interface ScrapeSuccessResult {
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
  pages?: ScrapePage[];
  workflow?: ScrapeWorkflowLog;
}

export interface ScrapeFailureResult {
  success: false;
  workflow: ScrapeWorkflowLog;
  error?: string;
  message?: string;
}

export type ScrapeResult = ScrapeSuccessResult | ScrapeFailureResult;

export interface ScrapeRecord {
  id: string;
  name: string;
  status: ScrapeStatus;
  config: ScrapeConfig;
  results?: ScrapeResult;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}
