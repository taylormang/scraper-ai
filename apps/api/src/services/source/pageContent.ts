import Firecrawl from '@mendable/firecrawl-js';

export interface PageContent {
  url: string;
  markdown: string;
  html: string;
  markdown_excerpt: string;
  html_excerpt: string;
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
    result = await firecrawl.scrape(url, {
      formats: ['markdown', 'html'],
    } as any);
  } catch (error: any) {
    console.error('[PageContent] Firecrawl scrape() threw error:', error);
    throw new Error(`Firecrawl API error: ${error?.message || 'Unknown error'}`);
  }

  console.log('[PageContent] Firecrawl result:', {
    success: result.success,
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
