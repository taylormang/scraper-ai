// Source type based on data-schema.md
export interface Source {
  id: string;
  url: string;
  url_pattern: string | null;
  domain: string;
  canonical_url: string;

  engine_configs?: {
    firecrawl?: {
      actions: Array<Record<string, any>>;
      formats: string[];
      wait_for?: 'selector' | 'network_idle' | null;
    };
  };

  pagination?: {
    strategy: 'next_link' | 'infinite_scroll' | 'spa' | 'numbered_pages' | 'load_more_button' | 'none';
    confidence: 'high' | 'medium' | 'low';
    limit_strategy: 'page_count' | 'item_count' | 'end_condition';
    navigation_schema?: {
      next_selector?: string;
      href_template?: string;
      page_param?: string;
      start_page?: number;
      item_selector?: string;
      end_condition?: 'no_next_link' | 'duplicate_items' | 'empty_page';
    };
    ai_analysis?: {
      description: string;
      pagination_type_reasoning: string;
      special_notes?: string;
      analyzed_at: string;
      analyzer_version: string;
      model_used: string;
    };
  };

  content_structure?: {
    typical_fields: Array<{
      name: string;
      type: string;
      selector?: string;
      attribute?: string;
    }>;
    items_per_page?: number;
    ai_detected: boolean;
  };

  validation?: {
    status: 'validated' | 'needs_validation' | 'failed';
    test_runs: number;
    success_rate: number;
    last_validated?: string;
    issues: string[];
  };

  sample?: {
    screenshot_url?: string;
    markdown_excerpt?: string;
    html_excerpt?: string;
    sample_items?: Array<Record<string, any>>;
  };

  usage_stats?: {
    recipe_count: number;
    total_scrapes: number;
    last_used?: string;
    avg_items_per_page?: number;
  };

  created_at: string;
  updated_at: string;
  created_by: 'system' | string;
}
