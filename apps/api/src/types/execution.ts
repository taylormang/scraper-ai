/**
 * Execution Types
 *
 * An Execution represents the runtime process of executing a Recipe
 * to produce a Dataset. It tracks status, progress, and results.
 */

export interface ExecutionEvent {
  timestamp: string;
  type: 'start' | 'info' | 'success' | 'error' | 'warning';
  message: string;
  data?: any;
}

export interface ExecutionProgress {
  phase: 'starting' | 'scraping' | 'extracting' | 'complete' | 'failed';
  current_page?: number;
  total_pages?: number;
  items_count: number;
  percentage: number;
}

export interface Execution {
  id: string;
  recipe_id: string;
  user_id: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

  // Enhanced progress tracking
  progress: ExecutionProgress;
  events: ExecutionEvent[];

  // Legacy stats (kept for compatibility)
  stats: {
    pages_scraped: number;
    items_scraped: number;
    errors: number;
    current_page?: number;
  };

  // Configuration snapshot from Recipe at execution time
  config: {
    engine: string;
    depth: number; // Scrape depth (1-10)
    base_url: string;
  };

  // Results
  dataset_id?: string; // Created upon completion
  error?: string;

  // Timing
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ExecutionLog {
  id: string;
  execution_id: string;
  sequence: number;
  severity: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  payload?: any;
  created_at: string;
}

export interface CreateExecutionRequest {
  recipe_id: string;
  user_id?: string;
}

export interface ExecutionListItem {
  id: string;
  recipe_id: string;
  recipe_name: string;
  status: string;
  pages_scraped: number;
  items_scraped: number;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

// DataItem - Individual scraped record
// Aligned with /docs/architecture_v1.md
export interface DataItem {
  id: string;
  datasetId: string;

  // Actual scraped data (conforms to dataset schema)
  data: Record<string, any>;

  // Provenance
  sourceUrl: string; // Original URL
  sourceLabel: string; // Which source (for multi-source recipes)

  // Metadata
  scrapedAt: Date;
  position?: number; // Order in original list

  // Optional: for debugging
  _debug?: {
    rawHtml?: string;
    extractionLog?: string;
  };
}
