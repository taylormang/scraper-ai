// Firecrawl Extraction Helpers
// Converts Recipe extraction config to Firecrawl format

import { Recipe } from '../../types/recipe';
import { JSONSchema } from '../../types/extraction';
import { DataItem } from '../../types/execution';
import { nanoid } from 'nanoid';

/**
 * Build Firecrawl JSON schema from Recipe extraction schema
 * Firecrawl expects a specific format for JSON extraction
 */
export function buildFirecrawlSchema(schema: JSONSchema): any {
  // Firecrawl expects the schema in a specific format
  // For arrays of objects, we need to wrap it properly
  if (schema.type === 'array' && schema.items) {
    return {
      type: 'array',
      items: schema.items,
    };
  }

  return schema;
}

/**
 * Extract DataItems from Firecrawl crawl response
 *
 * Firecrawl crawl() returns:
 * {
 *   success: boolean,
 *   data: Array<{
 *     markdown?: string,
 *     html?: string,
 *     metadata?: {...},
 *     extract?: { ... extracted data ... }
 *   }>,
 *   total: number,
 *   creditsUsed: number
 * }
 */
export function extractItems(
  firecrawlResponse: any,
  recipe: Recipe,
  sourceLabel?: string
): DataItem[] {
  // Firecrawl v1 uses 'status', v0 used 'success'
  const isSuccess = firecrawlResponse.success === true || firecrawlResponse.status === 'completed';
  if (!isSuccess || !firecrawlResponse.data) {
    console.log('[extractItems] No valid response data');
    return [];
  }

  const items: DataItem[] = [];
  const datasetId = ''; // Will be set by ExecutionEngine

  for (const page of firecrawlResponse.data) {
    // Firecrawl returns data in 'json' field (not 'extract')
    const extractedData = page.json || page.extract;
    if (!extractedData) continue;

    // Extract can be an array or object
    const extracted = Array.isArray(extractedData) ? extractedData : [extractedData];

    for (const item of extracted) {
      items.push({
        id: `item_${nanoid(12)}`,
        datasetId,
        data: item,
        sourceUrl: page.metadata?.sourceURL || page.metadata?.url || '',
        sourceLabel: sourceLabel || recipe.sources[0]?.label || 'unknown',
        scrapedAt: new Date(),
        position: items.length,
      });
    }
  }

  return items;
}

/**
 * Estimate cost for Firecrawl request
 * Firecrawl charges ~$0.001 per credit (largest plan) || $0.009 per credit (cheapest plan)
 */
export function estimateCost(pageCount: number): number {
  return pageCount * 0.009;
}
