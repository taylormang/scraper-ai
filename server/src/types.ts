// Core data types for the scraping engine

export interface ScrapedData {
  url: string;
  title?: string;
  content: Record<string, any>;
  metadata: {
    scrapedAt: Date;
    source: string;
    success: boolean;
    duration?: number;
  };
}

export interface ScraperConfig {
  name: string;
  baseUrl: string;
  selectors?: Record<string, string>; // Legacy selector-based approach
  extractionPrompt?: string; // AI-powered extraction prompt
  headers?: Record<string, string>;
  timeout?: number;
}

export interface AIExtractionResult {
  success: boolean;
  data?: any[];
  error?: string;
}

export interface ScraperResult {
  success: boolean;
  data?: ScrapedData;
  error?: string;
  duration: number;
}

// Storage types
export interface StorageResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

export interface DataRecord {
  id: string;
  scrapedData: ScrapedData;
  storedAt: Date;
}