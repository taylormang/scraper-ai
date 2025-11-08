import type { Source } from '../../types/source.js';

type FirecrawlAction = Record<string, any>;

interface EngineConfigInput {
  strategy:
    | 'next_link'
    | 'numbered_pages'
    | 'load_more_button'
    | 'infinite_scroll'
    | 'spa'
    | 'none';
  selector: string | null;
  hrefTemplate: string | null;
}

/**
 * Generate Firecrawl engine configuration based on pagination strategy
 * Returns pagination_pattern (action sequence for one "page") instead of full actions array
 * The actual actions will be generated dynamically at execution time based on depth
 */
export function generateFirecrawlConfig(input: EngineConfigInput): Source['engine_configs'] {
  const actionSequence: FirecrawlAction[] = [];

  switch (input.strategy) {
    case 'next_link':
      // Click "next" link to navigate to new page
      // Used with crawl() - these actions run on EACH discovered page
      if (input.selector) {
        actionSequence.push(
          { type: 'wait', milliseconds: 2000 },
          { type: 'click', selector: input.selector },
          { type: 'wait', milliseconds: 1500 }
        );
      } else {
        // Fallback if no selector detected
        actionSequence.push({ type: 'wait', milliseconds: 2000 });
      }
      break;

    case 'load_more_button':
      // Click "load more" button to load content on same page
      // Used with scrape() - click repeats N times then scrapes once
      if (input.selector) {
        actionSequence.push(
          { type: 'click', selector: input.selector },
          { type: 'wait', milliseconds: 2000 }
        );
      } else {
        // Fallback if no selector detected
        actionSequence.push({ type: 'wait', milliseconds: 2000 });
      }
      break;

    case 'numbered_pages':
      // Numbered pages: crawl() discovers URLs like /page/1, /page/2
      // Optional wait on each page
      actionSequence.push({ type: 'wait', milliseconds: 2000 });
      break;

    case 'infinite_scroll':
      // Infinite scroll: scroll to load more content on same page
      // Used with scrape() - pattern gets repeated for each "page" of depth
      // Pattern per page: scroll → wait → scrape (to capture accumulated content after each scroll)
      // First execution will also include an initial wait+scrape before the pattern repeats
      // Based on docs/firecrawl-scraping.md: wait → scrape → scroll → wait → scrape (repeat)
      actionSequence.push(
        { type: 'scroll', direction: 'down' },
        { type: 'wait', milliseconds: 2000 },
        { type: 'scrape' }
      );
      break;

    case 'spa':
    case 'none':
    default:
      // Single page: wait for content to load, then scrape
      // Used with scrape() - wait then scrape once
      actionSequence.push({ type: 'wait', milliseconds: 2000 }, { type: 'scrape' });
      break;
  }

  return {
    firecrawl: {
      pagination_pattern: {
        strategy: input.strategy,
        action_sequence: actionSequence,
      },
      formats: ['markdown', 'html'],
      wait_for: input.strategy === 'spa' ? 'network_idle' : null,
    },
  };
}
