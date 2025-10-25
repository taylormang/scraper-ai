export interface Recipe {
  id: string;
  user_id: string;
  name: string;
  description?: string;

  source_id: string;
  base_url: string;

  extraction: {
    limit_strategy: 'page_count' | 'item_count' | 'date_range';

    // If page_count
    page_count?: number;

    // If item_count
    item_count?: number;

    // If date_range
    date_range?: {
      start: string;
      end: string;
    };

    fields: RecipeField[];

    include_raw_content: boolean;
    deduplicate: boolean;
    deduplicate_field?: string;
  };

  execution: {
    engine: 'firecrawl';
    engine_config: {
      firecrawl: {
        actions: Array<Record<string, any>>;
        formats: string[];
        wait_for?: string | null;
      };
    };
    rate_limit: {
      delay_ms: number;
      max_concurrent: number;
    };
    retry: {
      max_attempts: number;
      backoff_ms: number;
    };
    timeout_ms: number;
  };

  schedule: null | {
    enabled: boolean;
    cron: string;
    timezone: string;
    next_run: string;
  };

  datasets: {
    active_id?: string;
    total_runs: number;
    last_run?: {
      dataset_id: string;
      status: 'complete' | 'in_progress' | 'failed' | 'cancelled';
      started_at: string;
      completed_at?: string;
      items_scraped: number;
      pages_scraped: number;
      errors: number;
    };
  };

  status: 'active' | 'paused' | 'archived';

  created_at: string;
  updated_at: string;
}

export interface RecipeField {
  name: string;
  type: 'string' | 'number' | 'date' | 'url';
  required: boolean;
  default?: any;
}
