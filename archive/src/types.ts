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
    pagesScraped?: number;
    urlsScraped?: string[];
    totalItems?: number;
  };
}

export interface ScraperConfig {
  name: string;
  baseUrl: string;
  selectors?: Record<string, string>; // Legacy selector-based approach
  extractionPrompt?: string; // AI-powered extraction prompt
  navigationType?: 'button' | 'scroll' | 'none'; // Multi-page navigation type
  navigationPrompt?: string; // How to navigate to next page
  maxPages?: number; // Maximum pages to scrape (default: 2)
  headers?: Record<string, string>;
  timeout?: number;

  // Auto-schema options (all optional, sensible defaults)
  enableAutoSchema?: boolean; // default: true
  schemaEnforcement?: 'strict' | 'lenient'; // default: 'lenient'
  preserveExtraFields?: boolean; // default: true
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

// AI-related interfaces (from new infrastructure)
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'json' | 'text';
}

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ElementInfo {
  index: number;
  tagName: string;
  textContent: string;
  innerText: string;
  href: string;
  id: string;
  className: string;
  outerHTML: string;
}