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

export interface ScrapeResultPayload {
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

export interface ScrapeConfig {
  url: string;
  prompt?: string;
  [key: string]: unknown;
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
