import Firecrawl from '@mendable/firecrawl-js';
import type { Document as FirecrawlDocument } from '@mendable/firecrawl-js';
import { config } from '../config/index.js';
import { buildPaginationSummary } from '../utils/paginationSummary.js';

export interface ReconOutput {
  url: string;
  markdown?: string;
  html?: string;
  metadata?: Record<string, unknown> | null;
  summary?: ReturnType<typeof buildPaginationSummary>;
}

export class ReconService {
  private client: Firecrawl;

  constructor(client?: Firecrawl) {
    if (!client && !config.services.firecrawl) {
      throw new Error('FIRECRAWL_API_KEY is required to run recon scrapes');
    }

    this.client = client ?? new Firecrawl({ apiKey: config.services.firecrawl });
  }

  async runRecon(url: string): Promise<ReconOutput> {
    if (!url) {
      throw new Error('URL is required');
    }

    const primaryWait = 3000;
    const fallbackWait = 7000;

    const document = await this.scrapeWithWait(url, primaryWait);

    if (needsAnotherPass(document)) {
      const secondPass = await this.scrapeWithWait(url, fallbackWait);
      return this.toReconOutput(url, secondPass);
    }

    return this.toReconOutput(url, document);
  }

  private async scrapeWithWait(url: string, waitMs: number): Promise<FirecrawlDocument> {
    try {
      return await this.client.scrape(url, {
        formats: ['markdown', 'html'],
        waitFor: waitMs,
        timeout: Math.max(waitMs + 30000, 45000),
        onlyMainContent: false,
        fastMode: false,
        actions: [
          {
            type: 'wait',
            milliseconds: waitMs,
          },
        ] as any,
      });
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Recon scrape failed'
      );
    }
  }

  private toReconOutput(url: string, document: FirecrawlDocument): ReconOutput {
    const summary = buildPaginationSummary({
      url,
      html: document.html ?? undefined,
      markdown: document.markdown ?? undefined,
      metadata: document.metadata ?? null,
    });

    return {
      url,
      markdown: document.markdown || undefined,
      html: document.html || undefined,
      metadata: document.metadata ?? null,
      summary,
    };
  }
}

function needsAnotherPass(document: FirecrawlDocument): boolean {
  const markdown = document.markdown || '';
  const html = document.html || '';

  const shortContent = markdown.length < 600 && html.length < 1500;
  const hasLoadingKeywords = /loading|spinner|please wait/i.test(markdown + html);

  return shortContent && hasLoadingKeywords;
}
