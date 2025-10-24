import type { Source } from '../types/source.js';

/**
 * Create a minimal Source from a URL
 * This will be populated with more data through AI analysis later
 */
export function createSourceFromUrl(url: string): Omit<Source, 'id' | 'created_at' | 'updated_at'> {
  const urlObj = new URL(url);

  return {
    url,
    url_pattern: null,
    domain: urlObj.hostname,
    canonical_url: url,
    created_by: 'system',
    validation: {
      status: 'needs_validation',
      test_runs: 0,
      success_rate: 0,
      issues: [],
    },
    usage_stats: {
      recipe_count: 0,
      total_scrapes: 0,
    },
  };
}

/**
 * Get or create a Source for a given URL
 */
export async function getOrCreateSource(
  url: string,
  repository: any // SourceRepository
): Promise<Source> {
  // Check if Source already exists
  let source = await repository.findByUrl(url);

  if (!source) {
    // Create new Source
    console.log(`[Source] Creating new Source for ${url}`);
    const sourceData = createSourceFromUrl(url);
    source = await repository.create(sourceData);
    console.log(`[Source] Created Source ${source.id}`);
  } else {
    console.log(`[Source] Found existing Source ${source.id} for ${url}`);
  }

  return source;
}
