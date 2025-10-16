export type ScrapeStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ScrapeMetadata {
  title?: string;
  description?: string;
  language?: string;
  sourceURL?: string;
}

export interface ScrapeConfig {
  url: string;
  prompt?: string;
  [key: string]: unknown;
}

export interface ScrapeResult {
  success: boolean;
  id: string;
  url: string;
  markdown: string;
  html: string;
  structuredData?: unknown;
  metadata: ScrapeMetadata;
  duration: number;
  scrapedAt: string;
  prompt?: string;
}

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
