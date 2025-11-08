// Base Executor Interface
// All executors (Firecrawl, ScrapingBee, Browserless) implement this

import { Recipe } from '../types/recipe';
import { DataItem } from '../types/execution';

export interface ExecutionResult {
  items: DataItem[];
  metadata: {
    totalRequests: number;
    failedRequests: number;
    cost: number; // USD
    creditsUsed?: number;
    duration: number; // milliseconds
  };
}

export interface BaseExecutor {
  /**
   * Execute a recipe and return scraped items
   */
  execute(recipe: Recipe): Promise<ExecutionResult>;
}

// Error codes for executor errors
export class ExecutorError extends Error {
  constructor(
    public code: string,
    message: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'ExecutorError';
  }
}

// Common error codes
export const ERROR_CODES = {
  JS_REQUIRED: 'JS_REQUIRED',
  CLOUDFLARE_BLOCKED: 'CLOUDFLARE_BLOCKED',
  RATE_LIMIT: 'RATE_LIMIT',
  TIMEOUT: 'TIMEOUT',
  INVALID_CONFIG: 'INVALID_CONFIG',
  EXTRACTION_FAILED: 'EXTRACTION_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
} as const;
