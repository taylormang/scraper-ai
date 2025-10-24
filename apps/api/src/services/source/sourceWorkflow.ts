import type { Source } from '../../types/source.js';
import { fetchPageContent } from './pageContent.js';
import { analyzePagination } from './paginationAnalysis.js';
import { generateFirecrawlConfig } from './engineConfig.js';
import { analyzeContentStructure } from './contentAnalysis.js';

export interface SourceWorkflowInput {
  url: string;
  firecrawlApiKey: string;
}

export interface SourceWorkflowResult {
  sample: {
    markdown_excerpt: string;
    html_excerpt: string;
    sample_items: Array<Record<string, any>>;
  };
  engine_configs: Source['engine_configs'];
  content_structure: Source['content_structure'];
  pagination: Source['pagination'];
}

/**
 * Execute full AI workflow to generate Source configuration
 * Steps:
 * 1. Fetch page content (markdown + HTML)
 * 2. Analyze pagination strategy
 * 3. Generate Firecrawl engine config
 * 4. Analyze content structure and extract samples
 */
export async function executeSourceWorkflow(
  input: SourceWorkflowInput
): Promise<SourceWorkflowResult> {
  const { url, firecrawlApiKey } = input;

  // Step 1: Fetch page content
  console.log('[SourceWorkflow] Step 1: Fetching page content...');
  const pageContent = await fetchPageContent(url, firecrawlApiKey);
  console.log('[SourceWorkflow] ✓ Page content fetched');

  // Step 2: Analyze pagination strategy
  console.log('[SourceWorkflow] Step 2: Analyzing pagination strategy...');
  const paginationAnalysis = await analyzePagination({
    url,
    html: pageContent.html,
    markdown: pageContent.markdown,
  });
  console.log('[SourceWorkflow] ✓ Pagination analyzed:', {
    strategy: paginationAnalysis.strategy,
    confidence: paginationAnalysis.confidence,
    selector: paginationAnalysis.selector,
  });

  // Map strategy to Source type (load_more -> load_more_button)
  const sourceStrategy =
    paginationAnalysis.strategy === 'load_more'
      ? ('load_more_button' as const)
      : (paginationAnalysis.strategy as 'next_link' | 'numbered_pages' | 'infinite_scroll' | 'spa' | 'none');

  // Generate human-readable description
  const paginationDescription = (() => {
    const selector = paginationAnalysis.selector ? ` (selector: ${paginationAnalysis.selector})` : '';
    const template = paginationAnalysis.hrefTemplate ? ` URL template: ${paginationAnalysis.hrefTemplate}` : '';

    switch (sourceStrategy) {
      case 'next_link':
        return `Site uses a next/more link for pagination${selector}.${template}`;
      case 'numbered_pages':
        return `Site uses numbered page links for pagination.${template}`;
      case 'load_more_button':
        return `Site uses a "Load More" button${selector}.`;
      case 'infinite_scroll':
        return `Site uses infinite scroll to load more content.`;
      case 'spa':
        return `Site is a Single Page Application with dynamic content loading.`;
      case 'none':
        return `No pagination detected on this page.`;
      default:
        return `Pagination strategy: ${sourceStrategy}`;
    }
  })();

  // Step 3: Generate engine configs
  console.log('[SourceWorkflow] Step 3: Generating Firecrawl actions config...');
  const engineConfigs = generateFirecrawlConfig({
    strategy: sourceStrategy,
    selector: paginationAnalysis.selector,
    hrefTemplate: paginationAnalysis.hrefTemplate,
  });
  console.log('[SourceWorkflow] ✓ Engine config generated:', {
    actionsCount: engineConfigs?.firecrawl?.actions.length,
    formats: engineConfigs?.firecrawl?.formats,
    wait_for: engineConfigs?.firecrawl?.wait_for,
  });

  // Step 4: Analyze content structure
  console.log('[SourceWorkflow] Step 4: Analyzing content structure...');
  const contentAnalysis = await analyzeContentStructure({
    url,
    html: pageContent.html,
    markdown: pageContent.markdown,
  });
  console.log('[SourceWorkflow] ✓ Content structure analyzed:', {
    fieldsCount: contentAnalysis.typical_fields.length,
    itemsPerPage: contentAnalysis.items_per_page,
    sampleItemsCount: contentAnalysis.sample_items.length,
  });

  // Return complete Source configuration
  return {
    sample: {
      markdown_excerpt: pageContent.markdown_excerpt,
      html_excerpt: pageContent.html_excerpt,
      sample_items: contentAnalysis.sample_items,
    },
    engine_configs: engineConfigs,
    content_structure: {
      typical_fields: contentAnalysis.typical_fields,
      items_per_page: contentAnalysis.items_per_page,
      ai_detected: contentAnalysis.ai_detected,
    },
    pagination: {
      strategy: sourceStrategy,
      confidence: paginationAnalysis.confidence,
      limit_strategy: 'end_condition',
      navigation_schema: {
        next_selector: paginationAnalysis.selector ?? undefined,
        href_template: paginationAnalysis.hrefTemplate ?? undefined,
        end_condition: 'no_next_link',
      },
      ai_analysis: {
        description: paginationDescription,
        pagination_type_reasoning: paginationAnalysis.reasoning,
        analyzed_at: new Date().toISOString(),
        analyzer_version: '1.0.0',
        model_used: 'gpt-4o-mini',
      },
    },
  };
}
