import type { Source } from '../../types/source.js';

type FirecrawlAction = Record<string, any>;

interface EngineConfigInput {
  strategy: 'next_link' | 'numbered_pages' | 'load_more_button' | 'infinite_scroll' | 'spa' | 'none';
  selector: string | null;
  hrefTemplate: string | null;
}

/**
 * Generate Firecrawl engine configuration based on pagination strategy
 * Creates actions array for multi-page scraping
 */
export function generateFirecrawlConfig(
  input: EngineConfigInput
): Source['engine_configs'] {
  const actions: FirecrawlAction[] = [];

  switch (input.strategy) {
    case 'next_link':
    case 'load_more_button':
      // Click-based pagination: scrape → click → wait → scrape
      if (input.selector) {
        actions.push(
          { type: 'wait', milliseconds: 2000 },
          { type: 'scrape' },
          { type: 'click', selector: input.selector },
          { type: 'wait', milliseconds: 1500 },
          { type: 'scrape' }
        );
      } else {
        // Fallback if no selector detected
        actions.push({ type: 'wait', milliseconds: 2000 }, { type: 'scrape' });
      }
      break;

    case 'numbered_pages':
      // Numbered pages: Recipe will generate URLs dynamically
      // Just scrape each URL provided
      actions.push({ type: 'wait', milliseconds: 2000 }, { type: 'scrape' });
      break;

    case 'infinite_scroll':
      // Infinite scroll: scrape → scroll → wait → scrape
      actions.push(
        { type: 'wait', milliseconds: 2000 },
        { type: 'scrape' },
        { type: 'scroll', direction: 'down' },
        { type: 'wait', milliseconds: 2000 },
        { type: 'scrape' }
      );
      break;

    case 'spa':
    case 'none':
    default:
      // Single page: just scrape once
      actions.push({ type: 'wait', milliseconds: 2000 }, { type: 'scrape' });
      break;
  }

  return {
    firecrawl: {
      actions,
      formats: ['markdown', 'html'],
      wait_for: input.strategy === 'spa' ? 'network_idle' : null,
    },
  };
}
