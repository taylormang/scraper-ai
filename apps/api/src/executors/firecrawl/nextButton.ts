// Firecrawl Next Button Executor
// Handles pagination via next button clicks (e.g., "More" link on HackerNews)

import Firecrawl from '@mendable/firecrawl-js';
import { Recipe } from '../../types/recipe';
import { DataItem } from '../../types/execution';
import { isNextButtonConfig } from '../../types/pagination';
import { buildFirecrawlSchema, extractItems, estimateCost } from './extraction';
import { ExecutorError, ERROR_CODES } from '../base';

export interface NextButtonExecutorResult {
  items: DataItem[];
  totalRequests: number;
  creditsUsed: number;
  cost: number;
  duration: number;
}

/**
 * Execute next button pagination strategy using Firecrawl
 *
 * Uses crawl() with actions to click the next button repeatedly
 * (e.g., HackerNews "More" link with selector '.morelink')
 */
export async function executeNextButton(
  firecrawl: Firecrawl,
  recipe: Recipe
): Promise<NextButtonExecutorResult> {
  const startTime = Date.now();

  // Validate pagination config
  if (!isNextButtonConfig(recipe.pagination.config)) {
    throw new ExecutorError(
      ERROR_CODES.INVALID_CONFIG,
      'Recipe pagination config is not next_button type'
    );
  }

  const config = recipe.pagination.config;
  const maxPages = recipe.pagination.maxPages || 3;

  // Build extraction schema for Firecrawl
  const extractionSchema = buildFirecrawlSchema(recipe.extraction.schema);

  // Get base URL from first source
  const baseUrl = recipe.sources[0]?.sourceId
    ? await getSourceBaseUrl(recipe.sources[0].sourceId)
    : 'https://news.ycombinator.com'; // Fallback for HN

  console.log(`[Firecrawl Next Button] Starting crawl: ${baseUrl}`);
  console.log(`[Firecrawl Next Button] Button selector: ${config.selector}`);
  console.log(`[Firecrawl Next Button] Max pages: ${maxPages}`);

  try {
    // Use crawl() with actions to click next button
    // Note: Firecrawl's actions feature clicks the button and waits for navigation
    const response = await firecrawl.crawl(baseUrl, {
      limit: maxPages,
      scrapeOptions: {
        formats: [
          {
            type: 'json',
            schema: extractionSchema,
          },
        ],
        // Actions: click the next button after each page
        actions: [
          {
            type: 'click',
            selector: config.selector,
          },
          {
            type: 'wait',
            milliseconds: 2000, // Wait for page to load
          },
        ] as any,
      },
    });

    // Check if crawl succeeded (Firecrawl v1 uses 'status', v0 used 'success')
    const isSuccess = response.success === true || response.status === 'completed';
    if (!isSuccess) {
      throw new ExecutorError(
        ERROR_CODES.EXTRACTION_FAILED,
        `Firecrawl crawl with next button failed: ${JSON.stringify(response)}`,
        true
      );
    }

    // Extract items from response
    const items = extractItems(response, recipe, recipe.sources[0]?.label);

    const duration = Date.now() - startTime;
    const creditsUsed = response.creditsUsed || 0;
    const cost = estimateCost(maxPages);

    console.log(`[Firecrawl Next Button] Completed: ${items.length} items from ${response.total} pages`);

    return {
      items,
      totalRequests: response.total || maxPages,
      creditsUsed,
      cost,
      duration,
    };
  } catch (error: any) {
    // Handle Firecrawl errors
    if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      throw new ExecutorError(
        ERROR_CODES.TIMEOUT,
        `Firecrawl timeout: ${error.message}`,
        true
      );
    }

    if (error.message?.includes(config.selector) || error.message?.includes('not found')) {
      throw new ExecutorError(
        ERROR_CODES.EXTRACTION_FAILED,
        `Next button not found: ${config.selector}`,
        false
      );
    }

    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      throw new ExecutorError(
        ERROR_CODES.NETWORK_ERROR,
        `Network error: ${error.message}`,
        true
      );
    }

    throw error;
  }
}

// Helper to get source baseUrl from sourceId
// TODO: Replace with actual source repository lookup
async function getSourceBaseUrl(sourceId: string): Promise<string> {
  // For now, return a placeholder
  // This should query the source repository
  return 'https://news.ycombinator.com';
}
