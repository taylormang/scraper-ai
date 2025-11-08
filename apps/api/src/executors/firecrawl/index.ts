// Firecrawl Executor
// Main executor class that routes to appropriate pagination strategy

import Firecrawl from '@mendable/firecrawl-js';
import { BaseExecutor, ExecutionResult, ExecutorError, ERROR_CODES } from '../base';
import { Recipe } from '../../types/recipe';
import { executeUrlPattern } from './urlPattern';
import { executeNextButton } from './nextButton';

export class FirecrawlExecutor implements BaseExecutor {
  private firecrawl: Firecrawl;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Firecrawl API key is required');
    }

    this.firecrawl = new Firecrawl({ apiKey });
  }

  /**
   * Execute a recipe using appropriate pagination strategy
   */
  async execute(recipe: Recipe): Promise<ExecutionResult> {
    console.log(`[FirecrawlExecutor] Executing recipe: ${recipe.name}`);
    console.log(`[FirecrawlExecutor] Strategy: ${recipe.pagination.strategy}`);

    // Route to appropriate strategy
    let result;

    switch (recipe.pagination.strategy) {
      case 'url_pattern':
        result = await executeUrlPattern(this.firecrawl, recipe);
        break;

      case 'next_button':
        result = await executeNextButton(this.firecrawl, recipe);
        break;

      case 'none':
        // Single page scrape - use url_pattern with maxPages=1
        result = await executeUrlPattern(this.firecrawl, {
          ...recipe,
          pagination: {
            ...recipe.pagination,
            maxPages: 1,
          },
        });
        break;

      case 'infinite_scroll':
      case 'api':
        throw new ExecutorError(
          ERROR_CODES.INVALID_CONFIG,
          `Firecrawl does not support ${recipe.pagination.strategy} pagination. Use ScrapingBee or Browserless.`,
          false
        );

      default:
        throw new ExecutorError(
          ERROR_CODES.INVALID_CONFIG,
          `Unknown pagination strategy: ${recipe.pagination.strategy}`,
          false
        );
    }

    // Convert to ExecutionResult format
    return {
      items: result.items,
      metadata: {
        totalRequests: result.totalRequests,
        failedRequests: 0, // Firecrawl doesn't provide this
        cost: result.cost,
        creditsUsed: result.creditsUsed,
        duration: result.duration,
      },
    };
  }
}

// Export strategies for direct use
export { executeUrlPattern } from './urlPattern';
export { executeNextButton } from './nextButton';
export { buildFirecrawlSchema, extractItems } from './extraction';
