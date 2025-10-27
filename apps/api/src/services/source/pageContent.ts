import Firecrawl from '@mendable/firecrawl-js';

export interface PageContent {
  url: string;
  markdown: string;
  html: string;
  markdown_excerpt: string;
  html_excerpt: string;
}

/**
 * Retry helper with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry if it's not a timeout error
      if (!error?.message?.includes('timeout')) {
        throw error;
      }

      const isLastAttempt = attempt === maxRetries - 1;
      if (isLastAttempt) {
        break;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`[PageContent] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Fetch page content using Firecrawl
 * Returns markdown and HTML content
 */
export async function fetchPageContent(
  url: string,
  firecrawlApiKey: string
): Promise<PageContent> {
  const firecrawl = new Firecrawl({ apiKey: firecrawlApiKey });

  console.log('[PageContent] Fetching page:', url);

  let result;
  try {
    // Fetch page with markdown and HTML formats
    // Use retry logic to handle intermittent network/timeout issues
    result = await retryWithBackoff(
      () => firecrawl.scrape(url, {
        formats: ['markdown', 'html'],
      } as any),
      3, // max retries
      1000 // base delay (1s)
    );
  } catch (error: any) {
    console.error('[PageContent] Firecrawl scrape() threw error after retries:', error);
    throw new Error(`Firecrawl API error: ${error?.message || 'Unknown error'}`);
  }

  console.log('[PageContent] Firecrawl result:', {
    hasMarkdown: !!result.markdown,
    hasHtml: !!result.html,
    markdownLength: result.markdown?.length || 0,
    htmlLength: result.html?.length || 0,
  });

  // Check if we have actual data, regardless of success field
  if (!result.markdown && !result.html) {
    throw new Error(`Firecrawl returned no content: ${JSON.stringify(result).substring(0, 500)}`);
  }

  const markdown = result.markdown || '';
  const html = result.html || '';

  // Create excerpts (first 500 characters)
  const markdown_excerpt = markdown.substring(0, 500);
  const html_excerpt = html.substring(0, 500);

  console.log('[PageContent] Fetched successfully:', {
    url,
    markdownLength: markdown.length,
    htmlLength: html.length,
    excerptLength: 500,
  });

  return {
    url,
    markdown,
    html,
    markdown_excerpt,
    html_excerpt,
  };
}
