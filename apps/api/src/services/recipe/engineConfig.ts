import type { Source } from '../../types/source.js';

type FirecrawlAction = Record<string, any>;

export interface RecipeEngineConfig {
  firecrawl: {
    actions: FirecrawlAction[];
    formats: string[];
    wait_for?: string | null;
  };
}

export interface CompileEngineConfigInput {
  source: Source;
  pageCount: number;
}

/**
 * Compile Recipe-specific Firecrawl configuration based on Source strategy and Recipe pagination depth
 *
 * Takes the generic Source pagination strategy and generates the actual executable actions
 * based on how many pages the Recipe wants to scrape.
 */
export function compileRecipeEngineConfig(input: CompileEngineConfigInput): RecipeEngineConfig {
  const { source, pageCount } = input;
  const strategy = source.pagination?.strategy || 'none';
  const actions: FirecrawlAction[] = [];

  console.log(`[RecipeEngineConfig] Compiling for strategy: ${strategy}, pages: ${pageCount}`);

  switch (strategy) {
    case 'numbered_pages': {
      // Generate individual scrape actions for each page
      const hrefTemplate = source.pagination?.navigation_schema?.href_template;
      const startPage = source.pagination?.navigation_schema?.start_page || 1;

      if (hrefTemplate) {
        // URL template pagination: generate URLs for each page
        for (let i = 0; i < pageCount; i++) {
          const pageNum = startPage + i;
          const url = hrefTemplate.replace('{page}', String(pageNum));
          actions.push(
            { type: 'wait', milliseconds: 2000 },
            { type: 'scrape', url }
          );
        }
      } else {
        // Fallback: just scrape base URL multiple times
        for (let i = 0; i < pageCount; i++) {
          actions.push(
            { type: 'wait', milliseconds: 2000 },
            { type: 'scrape' }
          );
        }
      }
      break;
    }

    case 'next_link':
    case 'load_more_button': {
      // Click-based pagination: repeat scrape → click → wait cycle
      const selector = source.pagination?.navigation_schema?.next_selector;

      if (selector) {
        // First page
        actions.push(
          { type: 'wait', milliseconds: 2000 },
          { type: 'scrape' }
        );

        // Subsequent pages: click → wait → scrape
        for (let i = 1; i < pageCount; i++) {
          actions.push(
            { type: 'click', selector },
            { type: 'wait', milliseconds: 1500 },
            { type: 'scrape' }
          );
        }
      } else {
        // Fallback without selector
        actions.push(
          { type: 'wait', milliseconds: 2000 },
          { type: 'scrape' }
        );
      }
      break;
    }

    case 'infinite_scroll': {
      // Scroll-based pagination: repeat scrape → scroll → wait cycle
      // First page
      actions.push(
        { type: 'wait', milliseconds: 2000 },
        { type: 'scrape' }
      );

      // Subsequent pages: scroll → wait → scrape
      for (let i = 1; i < pageCount; i++) {
        actions.push(
          { type: 'scroll', direction: 'down' },
          { type: 'wait', milliseconds: 2000 },
          { type: 'scrape' }
        );
      }
      break;
    }

    case 'spa':
    case 'none':
    default: {
      // Single page: just scrape once (ignore pageCount)
      actions.push(
        { type: 'wait', milliseconds: 2000 },
        { type: 'scrape' }
      );
      break;
    }
  }

  return {
    firecrawl: {
      actions,
      formats: source.engine_configs?.firecrawl?.formats || ['markdown', 'html'],
      wait_for: source.engine_configs?.firecrawl?.wait_for || null,
    },
  };
}
