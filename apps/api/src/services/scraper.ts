import { randomUUID } from 'node:crypto';
import Firecrawl from '@mendable/firecrawl-js';
import type { CrawlJob, PaginationConfig, Document as FirecrawlDocument } from '@mendable/firecrawl-js';
import { config } from '../config/index.js';
import { getScrapeRepository } from '../repositories/index.js';
import type { ScrapeRepository } from '../repositories/scrapeRepository.js';
import type {
  ScrapeRecord,
  ScrapeResult,
  ScrapeSuccessResult,
  ScrapeFailureResult,
  ScrapePagination,
  ScrapeMetadata,
  ScrapePage,
  ScrapeWorkflowLog,
  ScrapeWorkflowStep,
  ScrapeWorkflowStepStatus,
  ScrapeThoughtSeverity,
} from '../types/scrape.js';

interface ScrapeOptions {
  prompt?: string | null;
  pagination?: ScrapePagination | null;
}

type FirecrawlFormatOption = string | { type: 'json'; prompt: string };

const DEFAULT_POLL_INTERVAL_MS = 2_000;
const MAX_POLL_DURATION_MS = 60_000;

/**
 * Scraper service using Firecrawl v2 client
 */
export class ScraperService {
  private firecrawl: Firecrawl;
  private repository: ScrapeRepository;

  constructor(repository: ScrapeRepository = getScrapeRepository()) {
    if (!config.services.firecrawl) {
      throw new Error('FIRECRAWL_API_KEY is required');
    }
    this.repository = repository;
    this.firecrawl = new Firecrawl({ apiKey: config.services.firecrawl });
  }

  /**
   * Scrape a single URL (optionally with pagination) and return the result.
   * Creates a database record to track the scrape operation.
   */
  async scrapeUrl(url: string, options: ScrapeOptions = {}): Promise<ScrapeResult> {
    const prompt = options.prompt?.trim() || undefined;
    const pagination = options.pagination || undefined;

    const workflow: ScrapeWorkflowLog = { steps: [] };
    const steps = {
      intake: { id: 'intake', label: 'Intake & Validation' },
      firecrawl: { id: 'firecrawl', label: 'Firecrawl Execution' },
      persistence: { id: 'persistence', label: 'Persistence & Storage' },
      failure: { id: 'failure', label: 'Failure Handling' },
    } as const;

    const nowIso = () => new Date().toISOString();

    const ensureStep = (id: string, label: string): ScrapeWorkflowStep => {
      let step = workflow.steps.find((item) => item.id === id);
      if (!step) {
        step = {
          id,
          label,
          status: 'pending',
          thoughts: [],
        };
        workflow.steps.push(step);
      } else if (step.label !== label) {
        step.label = label;
      }
      return step;
    };

    const setStepStatus = (
      id: string,
      label: string,
      status: ScrapeWorkflowStepStatus
    ): void => {
      const step = ensureStep(id, label);
      if (!step.startedAt && status !== 'pending') {
        step.startedAt = nowIso();
      }
      step.status = status;
      if (status === 'success' || status === 'error') {
        step.completedAt = nowIso();
      }
    };

    const addThought = (
      id: string,
      label: string,
      text: string,
      body?: unknown,
      severity: ScrapeThoughtSeverity = 'info'
    ): void => {
      const step = ensureStep(id, label);
      if (!step.startedAt) {
        step.startedAt = nowIso();
      }
      if (step.status === 'pending') {
        step.status = 'in_progress';
      }
      step.thoughts.push({
        id: randomUUID(),
        text,
        body,
        createdAt: nowIso(),
        severity,
      });
    };

    const markActiveStepsAsError = (): void => {
      const timestamp = nowIso();
      workflow.steps.forEach((step) => {
        if (step.status === 'in_progress') {
          step.status = 'error';
          step.completedAt = timestamp;
        } else if (step.status === 'pending') {
          step.status = 'error';
          if (!step.startedAt) {
            step.startedAt = timestamp;
          }
          step.completedAt = timestamp;
        }
      });
    };

    addThought(steps.intake.id, steps.intake.label, 'Received scrape request', {
      url,
      promptIncluded: Boolean(prompt),
      paginationRequested: Boolean(pagination),
    });

    const scrapeRecord = await this.repository.createScrape({
      url,
      prompt,
      pagination: pagination ?? null,
    });

    console.log(`[Scraper] Created scrape record: ${scrapeRecord.id}`);

    addThought(steps.intake.id, steps.intake.label, 'Created scrape record', {
      scrapeId: scrapeRecord.id,
    });
    setStepStatus(steps.intake.id, steps.intake.label, 'success');

    try {
      const startTime = Date.now();

      console.log(
        `[Scraper] Scraping URL: ${url}${
          pagination ? ` with pagination ${JSON.stringify(pagination)}` : ''
        }`
      );

      const formats: FirecrawlFormatOption[] = ['markdown', 'html'];
      if (prompt) {
        formats.push({
          type: 'json',
          prompt,
        });
      }

      addThought(
        steps.firecrawl.id,
        steps.firecrawl.label,
        pagination ? 'Starting Firecrawl crawl job' : 'Starting Firecrawl single-page scrape',
        {
          formats,
          pagination: pagination ?? null,
        }
      );

      const documents = pagination
        ? await this.runCrawl(url, formats, pagination)
        : await this.runSingleScrape(url, formats);

      if (!documents.length) {
        throw new Error('Firecrawl returned no documents');
      }

      const firstDoc = documents[0];

      addThought(steps.firecrawl.id, steps.firecrawl.label, 'Firecrawl returned data', {
        documents: documents.length,
        metadata: firstDoc?.metadata ?? null,
      });
      setStepStatus(steps.firecrawl.id, steps.firecrawl.label, 'success');

      const duration = Date.now() - startTime;
      const pages = this.mapPages(documents, url);
      const structuredData = this.extractStructuredData(firstDoc);

      addThought(steps.persistence.id, steps.persistence.label, 'Preparing scrape result payload', {
        durationMs: duration,
        pageCount: pages.length,
        structuredData: Boolean(structuredData),
      });

      const scrapeResult: ScrapeSuccessResult = {
        success: true,
        id: scrapeRecord.id,
        url,
        markdown: firstDoc.markdown || '',
        html: firstDoc.html || '',
        structuredData,
        metadata: this.mapMetadata(firstDoc, url),
        duration,
        scrapedAt: new Date().toISOString(),
        prompt,
        pages,
        workflow,
      };

      await this.repository.markCompleted(scrapeRecord.id, scrapeResult);

      addThought(steps.persistence.id, steps.persistence.label, 'Marked scrape as completed', {
        scrapeId: scrapeRecord.id,
      });
      setStepStatus(steps.persistence.id, steps.persistence.label, 'success');

      console.log(`[Scraper] Updated scrape record ${scrapeRecord.id} as completed`);

      return scrapeResult;
    } catch (error) {
      console.error('[Scraper] Error:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      markActiveStepsAsError();
      addThought(
        steps.failure.id,
        steps.failure.label,
        'Scrape failed',
        {
          error: errorMessage,
        },
        'error'
      );
      setStepStatus(steps.failure.id, steps.failure.label, 'error');

      const failureResult: ScrapeFailureResult = {
        success: false,
        workflow,
        error: errorMessage,
        message: 'Scrape execution failed',
      };

      await this.repository.markFailed(scrapeRecord.id, errorMessage, failureResult);

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

  private async runSingleScrape(url: string, formats: FirecrawlFormatOption[]): Promise<FirecrawlDocument[]> {
    const document = await this.firecrawl.scrape(url, {
      formats: formats as any,
    });

    return [document];
  }

  private async runCrawl(
    url: string,
    formats: FirecrawlFormatOption[],
    pagination: ScrapePagination
  ): Promise<FirecrawlDocument[]> {
    const crawlOptions = {
      scrapeOptions: {
        formats: formats as any,
      },
      limit: pagination.maxPages ?? undefined,
    };

    const job = await this.firecrawl.startCrawl(url, crawlOptions);

    const paginationConfig: PaginationConfig | undefined = this.toPaginationConfig(pagination);
    const crawl = await this.pollCrawl(job.id, paginationConfig);

    if (crawl.status === 'failed') {
      throw new Error('Crawl job failed');
    }

    return crawl.data ?? [];
  }

  private toPaginationConfig(pagination: ScrapePagination | undefined): PaginationConfig | undefined {
    if (!pagination) {
      return undefined;
    }

    const config: PaginationConfig = {};

    if (pagination.autoPaginate !== undefined) {
      config.autoPaginate = pagination.autoPaginate;
    }
    if (pagination.maxPages !== undefined) {
      config.maxPages = pagination.maxPages;
    }
    if (pagination.maxResults !== undefined) {
      config.maxResults = pagination.maxResults;
    }
    if (pagination.maxWaitTime !== undefined) {
      config.maxWaitTime = pagination.maxWaitTime;
    }

    return config;
  }

  private async pollCrawl(jobId: string, pagination?: PaginationConfig): Promise<CrawlJob> {
    const start = Date.now();
    let attempt = 0;

    while (true) {
      attempt += 1;
      const snapshot = await this.firecrawl.getCrawlStatus(jobId, pagination);

      if (snapshot.status === 'completed' || snapshot.status === 'failed' || snapshot.status === 'cancelled') {
        return snapshot;
      }

      if (Date.now() - start > MAX_POLL_DURATION_MS) {
        throw new Error('Crawl job polling timed out');
      }

      await this.sleep(DEFAULT_POLL_INTERVAL_MS);
    }
  }

  private mapPages(documents: FirecrawlDocument[], fallbackUrl: string): ScrapePage[] {
    return documents.map((doc, index) => {
      const resolvedUrl = this.resolveDocumentUrl(doc) || fallbackUrl;
      return {
        index,
        url: resolvedUrl,
        markdown: doc.markdown || undefined,
        html: doc.html || undefined,
        structuredData: this.extractStructuredData(doc),
        metadata: this.mapMetadata(doc, resolvedUrl),
      };
    });
  }

  private mapMetadata(doc: FirecrawlDocument, fallbackUrl: string): ScrapeMetadata {
    return {
      title: doc.metadata?.title,
      description: doc.metadata?.description,
      language: doc.metadata?.language,
      sourceURL: doc.metadata?.sourceURL || doc.metadata?.url || fallbackUrl,
    };
  }

  private extractStructuredData(doc: FirecrawlDocument): unknown {
    return doc.json ?? undefined;
  }

  private resolveDocumentUrl(doc: FirecrawlDocument): string {
    const candidate =
      typeof doc.metadata?.sourceURL === 'string' && doc.metadata.sourceURL.length > 0
        ? doc.metadata.sourceURL
        : typeof doc.metadata?.url === 'string' && doc.metadata.url.length > 0
          ? doc.metadata.url
          : undefined;
    return candidate || '';
  }

  private async sleep(duration: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, duration));
  }
}
