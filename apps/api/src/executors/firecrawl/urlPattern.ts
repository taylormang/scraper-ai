// Firecrawl URL Pattern Executor
// Handles pagination via URL patterns (e.g., ?p=1, ?p=2, ?p=3)

import Firecrawl from '@mendable/firecrawl-js';
import { Recipe } from '../../types/recipe';
import { DataItem } from '../../types/execution';
import { isUrlPatternConfig } from '../../types/pagination';
import { buildFirecrawlSchema, extractItems, estimateCost } from './extraction';
import { ExecutorError, ERROR_CODES } from '../base';

export interface UrlPatternExecutorResult {
  items: DataItem[];
  totalRequests: number;
  creditsUsed: number;
  cost: number;
  duration: number;
}

/**
 * Execute URL pattern pagination strategy using Firecrawl
 *
 * Uses crawl() with limit parameter to scrape multiple pages
 * identified by URL pattern (e.g., https://news.ycombinator.com/?p=1, ?p=2, etc.)
 */
export async function executeUrlPattern(
  firecrawl: Firecrawl,
  recipe: Recipe
): Promise<UrlPatternExecutorResult> {
  const startTime = Date.now();

  // Validate pagination config
  if (!isUrlPatternConfig(recipe.pagination.config)) {
    throw new ExecutorError(
      ERROR_CODES.INVALID_CONFIG,
      'Recipe pagination config is not url_pattern type'
    );
  }

  const config = recipe.pagination.config;
  const maxPages = recipe.pagination.maxPages || 3;

  // Build extraction schema for Firecrawl
  const extractionSchema = buildFirecrawlSchema(recipe.extraction.schema);

  // Build array of URLs to scrape based on the pattern
  const urls = Array.from({ length: maxPages }, (_, i) => {
    const pageNumber = config.startPage + i;
    return config.template.replace(/\{n\}|\{page\}/, String(pageNumber));
  });

  console.log(`[Firecrawl URL Pattern] Batch scraping URLs:`);
  urls.forEach((url, i) => console.log(`  ${i + 1}. ${url}`));

  try {
    // Scrape URLs sequentially to avoid timeouts
    // Firecrawl crawl() with JSON extraction can take 30-60s per page
    const allData: any[] = [];
    let totalCredits = 0;

    console.log(`[Firecrawl URL Pattern] Scraping ${urls.length} URLs sequentially...`);

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      console.log(`[Firecrawl URL Pattern] Scraping ${i + 1}/${urls.length}: ${url}`);

      const response = await firecrawl.crawl(url, {
        limit: 1, // Only scrape this exact URL
        scrapeOptions: {
          formats: [
            {
              type: 'json',
              schema: extractionSchema,
            },
          ],
        },
      });

      const isSuccess = response.success === true || response.status === 'completed';
      if (isSuccess && response.data) {
        allData.push(...response.data);
        totalCredits += response.creditsUsed || 0;
        console.log(`[Firecrawl URL Pattern]   ✓ Page ${i + 1} complete (${response.data.length} pages, ${response.creditsUsed} credits)`);
      } else {
        console.log(`[Firecrawl URL Pattern]   ✗ Page ${i + 1} failed`);
      }

      // Add delay between requests to respect rate limits
      if (i < urls.length - 1) {
        const delay = 3000; // 3 second delay between requests
        console.log(`[Firecrawl URL Pattern]   Waiting ${delay}ms before next request...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    const mergedResponse = {
      status: 'completed',
      success: true,
      data: allData,
      total: allData.length,
      creditsUsed: totalCredits,
    };

    console.log(`[Firecrawl URL Pattern] Scraped ${allData.length} pages total`);

    // Extract items from merged response
    const items = extractItems(mergedResponse, recipe, recipe.sources[0]?.label);

    const duration = Date.now() - startTime;
    const cost = estimateCost(maxPages);

    console.log(`[Firecrawl URL Pattern] Completed: ${items.length} items from ${allData.length} pages`);

    return {
      items,
      totalRequests: urls.length,
      creditsUsed: totalCredits,
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
