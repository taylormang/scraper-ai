/**
 * Dataset Types
 *
 * Datasets store the results of Recipe executions
 */

export interface DatasetItem {
  id: string;
  dataset_id: string;
  data: Record<string, any>; // Flexible schema based on Recipe fields
  source_url?: string;
  scraped_at: string;
  created_at: string;
}

export interface Dataset {
  id: string;
  recipe_id: string;
  execution_id: string;
  user_id: string;

  stats: {
    item_count: number;
    first_scraped_at?: string;
    last_scraped_at?: string;
  };

  created_at: string;
  updated_at: string;
}

export interface CreateDatasetParams {
  recipe_id: string;
  execution_id: string;
  user_id: string;
}

export interface CreateDatasetItemParams {
  dataset_id: string;
  data: Record<string, any>;
  source_url?: string;
  scraped_at?: string;
}
