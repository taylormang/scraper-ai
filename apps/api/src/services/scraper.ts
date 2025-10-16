import FirecrawlApp from '@mendable/firecrawl-js';
import { config } from '../config/index.js';
import { getScrapeRepository } from '../repositories/index.js';
import type { ScrapeRepository } from '../repositories/scrapeRepository.js';
import type { ScrapeRecord, ScrapeResult } from '../types/scrape.js';

/**
 * Scraper service using Firecrawl
 */
export class ScraperService {
  private firecrawl: FirecrawlApp;
  private repository: ScrapeRepository;

  constructor(repository: ScrapeRepository = getScrapeRepository()) {
    if (!config.services.firecrawl) {
      throw new Error('FIRECRAWL_API_KEY is required');
    }
    this.repository = repository;
    this.firecrawl = new FirecrawlApp({ apiKey: config.services.firecrawl });
  }

  /**
   * Scrape a single URL and return markdown content
   * Creates a database record to track the scrape operation
   */
  async scrapeUrl(url: string, options: { prompt?: string | null } = {}): Promise<ScrapeResult> {
    const prompt = options.prompt?.trim() || undefined;

    const scrapeRecord = await this.repository.createScrape({ url, prompt });

    console.log(`[Scraper] Created scrape record: ${scrapeRecord.id}`);

    try {
      const startTime = Date.now();

      console.log(`[Scraper] Scraping URL: ${url}`);

      const formats: Array<string | Record<string, string>> = ['markdown', 'html'];

      if (prompt) {
        formats.push({
          type: 'json',
          prompt,
        });
      }

      const scrapeParams: Record<string, unknown> = {
        formats,
      };

      // Use Firecrawl to scrape the URL
      const client = this.firecrawl as any;
      const result = await (client.scrapeUrl
        ? client.scrapeUrl(url, scrapeParams)
        : client.scrape(url, scrapeParams));

      const duration = Date.now() - startTime;

      console.log(`[Scraper] Response received:`, {
        success: result.success,
        hasData: !!result.data,
        hasMarkdown: !!(result.data?.markdown || result.markdown),
        hasHtml: !!(result.data?.html || result.html),
        hasJson: !!(result.data?.json || result.json),
      });

      // Handle different response structures
      const data = result.data || result;

      if (!result.success && !data.markdown) {
        console.error('[Scraper] Scrape failed:', result);
        const errorMessage = result.error || 'Firecrawl scrape failed - no data returned';

        throw new Error(errorMessage);
      }

      const scrapeResult: ScrapeResult = {
        success: true,
        id: scrapeRecord.id,
        url,
        markdown: data.markdown || '',
        html: data.html || '',
        structuredData: data.json ?? data.extract ?? undefined,
        metadata: {
          title: data.metadata?.title,
          description: data.metadata?.description,
          language: data.metadata?.language,
          sourceURL: data.metadata?.sourceURL || url,
        },
        duration,
        scrapedAt: new Date().toISOString(),
        prompt,
      };

      await this.repository.markCompleted(scrapeRecord.id, scrapeResult);

      console.log(`[Scraper] Updated scrape record ${scrapeRecord.id} as completed`);

      return scrapeResult;
    } catch (error) {
      console.error('[Scraper] Error:', error);

      // Update scrape record as failed
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.repository.markFailed(scrapeRecord.id, errorMessage);

      throw new Error(`Failed to scrape URL: ${errorMessage}`);
    }
  }

  /**
   * Get all scrapes from the database (most recent first)
   */
  async getAllScrapes(): Promise<ScrapeRecord[]> {
    return await this.repository.getAllScrapes();
  }

  /**
   * Get a specific scrape by ID
   */
  async getScrapeById(id: string): Promise<ScrapeRecord | null> {
    return await this.repository.getScrapeById(id);
  }

  /**
   * Validate URL format
   */
  isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}
