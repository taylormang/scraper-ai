import Firecrawl from '@mendable/firecrawl-js';
import type { ScrapeOptions } from '@mendable/firecrawl-js';
import type { Document as FirecrawlDocument } from '@mendable/firecrawl-js';
import { config } from '../config/index.js';
import { buildPaginationSummary } from '../utils/paginationSummary.js';

const DEFAULT_HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'accept-language': 'en-US,en;q=0.9',
} as const;

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

    let document = await this.scrapeWithRetries(url, primaryWait);

    if (needsAnotherPass(document)) {
      document = await this.scrapeWithRetries(url, fallbackWait);
    }

    if (isSoft404(document)) {
      const stealthPass = await this.scrapeWithRetries(url, fallbackWait, {
        proxy: 'stealth',
        location: { country: 'US', languages: ['en-US', 'en'] },
        waitFor: fallbackWait + 4000,
        timeout: fallbackWait + 90000,
      });

      if (!isSoft404(stealthPass)) {
        return this.toReconOutput(url, stealthPass);
      }
      document = stealthPass;
    }

    return this.toReconOutput(url, document);
  }

  private async scrapeWithRetries(
    url: string,
    waitMs: number,
    extraOptions: Partial<ScrapeOptions> = {}
  ): Promise<FirecrawlDocument> {
    try {
      return await this.scrapeWithWait(url, waitMs, extraOptions);
    } catch (error) {
      if (!isTimeoutError(error)) {
        throw error;
      }

      const retryOptions: Partial<ScrapeOptions> = {
        ...extraOptions,
        waitFor:
          typeof extraOptions.waitFor === 'number'
            ? Math.max(extraOptions.waitFor, waitMs + 2000)
            : waitMs + 2000,
        timeout:
          typeof extraOptions.timeout === 'number'
            ? Math.max(extraOptions.timeout, waitMs + 90000)
            : waitMs + 90000,
        fastMode: extraOptions.fastMode ?? true,
        actions: extraOptions.actions ?? buildPageLoadActions(waitMs + 2000),
      };

      return await this.scrapeWithWait(url, waitMs, retryOptions);
    }
  }

  private async scrapeWithWait(
    url: string,
    waitMs: number,
    extraOptions: Partial<ScrapeOptions> = {}
  ): Promise<FirecrawlDocument> {
    const {
      headers: extraHeaders,
      actions: extraActions,
      waitFor: extraWaitFor,
      timeout: extraTimeout,
      ...rest
    } = extraOptions;
    const headers = { ...DEFAULT_HEADERS, ...(extraHeaders ?? {}) };
    const actions = extraActions ?? buildPageLoadActions(waitMs);
    const waitFor =
      typeof extraWaitFor === 'number' ? extraWaitFor : Math.max(waitMs, 2000);
    const timeout =
      typeof extraTimeout === 'number'
        ? extraTimeout
        : Math.max(waitMs + 60000, 60000);

    try {
      return await this.client.scrape(url, {
        formats: ['markdown', 'html'],
        waitFor,
        timeout,
        onlyMainContent: false,
        fastMode: false,
        actions,
        headers,
        ...rest,
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
  const hasLoadingKeywords = /loading|spinner|please wait|redirecting/i.test(markdown + html);

  return shortContent && hasLoadingKeywords;
}

function isSoft404(document: FirecrawlDocument): boolean {
  const status =
    document.metadata?.statusCode ??
    (typeof document.metadata?.status === 'number' ? document.metadata?.status : undefined);

  if (status && status >= 400 && status < 500) {
    return true;
  }

  const content = (document.markdown || document.html || '').toLowerCase();
  return (
    /page not found|lost\?\s*let's get you back on track|we can'?t find the page/i.test(content)
  );
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && /timed out/i.test(error.message);
}

function buildPageLoadActions(waitMs: number): ScrapeOptions['actions'] {
  const initialWait = Math.max(Math.min(waitMs, 6000), 2000);
  return [
    {
      type: 'wait',
      milliseconds: initialWait,
    },
    {
      type: 'scroll',
      direction: 'down',
    },
    {
      type: 'wait',
      milliseconds: 1500,
    },
    {
      type: 'scroll',
      direction: 'up',
    },
  ];
}
