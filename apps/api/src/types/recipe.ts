// Recipe type - Scraping configuration
// Aligned with /docs/architecture_v1.md

import { PaginationStrategy, PaginationConfig } from './pagination';
import { JSONSchema, Selectors, ValidationRule } from './extraction';

export interface Recipe {
  id: string;
  name: string; // "HN front page posts"
  description: string; // User's original intent
  userId: string; // Creator

  version: number; // For recipe evolution

  // Multi-source support
  sources: RecipeSource[];

  // What to extract (unified schema across all sources)
  extraction: {
    schema: JSONSchema; // Target data structure

    // Source-specific selectors
    selectorsBySource: Record<string, Selectors>;

    // Optional: field name mappings
    // e.g., { amazon: { cost: 'price' }, walmart: { amount: 'price' } }
    fieldMappings?: Record<string, Record<string, string>>;

    // Validation rules
    validation?: {
      required: string[]; // Required fields
      minItems?: number; // Minimum items per execution
      customRules?: ValidationRule[];
    };
  };

  // How to paginate
  pagination: {
    strategy: PaginationStrategy;
    config: PaginationConfig;
    maxPages?: number; // Safety limit
    maxItems?: number; // Alternative limit
  };

  // Which tool to use
  executor: 'firecrawl' | 'scrapingbee' | 'browserless';

  // Performance tracking
  metrics: {
    totalExecutions: number;
    successRate: number; // 0-1
    avgDuration: number; // milliseconds
    avgCost: number; // USD
    avgItemsPerExecution: number;
  };

  // Recipe lifecycle
  status: 'active' | 'deprecated' | 'archived';

  createdAt: Date;
  updatedAt: Date;
}

// Source reference within a Recipe
export interface RecipeSource {
  sourceId: string;
  label?: string; // Optional: 'amazon', 'walmart'

  // Source-specific overrides
  filters?: {
    maxPages?: number;
    includePaths?: string[]; // Override source defaults
    excludePaths?: string[];
  };

  // Optional: for weighted sampling
  weight?: number; // 0-1, relative priority
}

// Legacy field type (for migration)
export interface RecipeField {
  name: string;
  type: 'string' | 'number' | 'date' | 'url';
  required: boolean;
  default?: any;
}

// Scrape depth constants (deprecated, replaced by pagination.maxPages)
export const DEFAULT_SCRAPE_DEPTH = 3;
export const MAX_SCRAPE_DEPTH = 10;
