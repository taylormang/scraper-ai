import Firecrawl from '@mendable/firecrawl-js';
import { config } from '../config/index.js';
import { getRunRepository } from '../repositories/index.js';
import type {
  UpdateExecutionParams,
  AppendExecutionLogParams,
  RunRepository,
} from '../repositories/runRepository.js';
import { runEventBus } from './runEvents.js';
import type { Execution } from '../db/index.js';

type FirecrawlClient = InstanceType<typeof Firecrawl>;

interface StartExecutionOptions {
  runId: string;
  planId: string | null;
  config: Record<string, unknown>;
  metadata?: Record<string, unknown> | null;
  initialSummary?: Record<string, unknown> | null;
}

export class ExecutionService {
  private firecrawl: FirecrawlClient;

  constructor(private readonly repository: RunRepository = getRunRepository()) {
    if (!config.services.firecrawl) {
      throw new Error('FIRECRAWL_API_KEY is required to execute scrapes');
    }
    this.firecrawl = new Firecrawl({ apiKey: config.services.firecrawl });
  }

  async startFirecrawlExecution(options: StartExecutionOptions): Promise<Execution> {
    const execution = await this.repository.createExecution({
      runId: options.runId,
      planId: options.planId,
      engine: 'firecrawl',
      config: options.config,
      metadata: options.metadata ?? null,
    });

    await this.repository.updateRun(options.runId, {
      phase: 'execute',
      summary: options.initialSummary ?? null,
    });

    runEventBus.publish(options.runId, {
      type: 'run.execution.created',
      execution,
    });

    setImmediate(() => {
      this.executeFirecrawl({
        runId: options.runId,
        executionId: execution.id,
        config: options.config,
        initialSummary: options.initialSummary ?? null,
      }).catch((error) => {
        console.error('[ExecutionService] Unhandled execution error', error);
      });
    });

    return execution;
  }

  private async executeFirecrawl(params: {
    runId: string;
    executionId: string;
    config: Record<string, unknown>;
    initialSummary: Record<string, unknown> | null;
  }): Promise<void> {
    const startedAt = new Date();

    const update = async (changes: UpdateExecutionParams) => {
      const execution = await this.repository.updateExecution(params.executionId, changes);
      runEventBus.publish(params.runId, {
        type: 'run.execution.updated',
        execution,
      });
      return execution;
    };

    const log = async (message: string, payload?: unknown, severity: AppendExecutionLogParams['severity'] = 'info') => {
      const logEntry = await this.repository.appendExecutionLog({
        executionId: params.executionId,
        runId: params.runId,
        message,
        payload,
        severity,
      });
      runEventBus.publish(params.runId, {
        type: 'run.execution.log',
        log: logEntry,
      });
    };

    await update({
      status: 'running',
      startedAt,
    });

    await log('Submitting crawl to Firecrawl', {
      config: params.config,
    });

    try {
      const { url, scrapeOptions, limit, ...crawlOptions } = params.config as {
        url?: unknown;
        scrapeOptions?: unknown;
        limit?: unknown;
        [key: string]: unknown;
      };

      if (typeof url !== 'string' || !url.trim()) {
        throw new Error('Execution config missing url');
      }

      // Build crawl options for Firecrawl v2 crawl endpoint
      // Note: URL is passed as first parameter, not in options
      const crawlConfig: Record<string, unknown> = {};

      // Add limit if provided
      if (typeof limit === 'number' && limit > 0) {
        crawlConfig.limit = limit;
      }

      // Add scrapeOptions if provided, otherwise use defaults
      if (typeof scrapeOptions === 'object' && scrapeOptions !== null) {
        crawlConfig.scrapeOptions = scrapeOptions;
      } else {
        // Default scrape options
        crawlConfig.scrapeOptions = {
          formats: ['markdown', 'html'],
        };
      }

      // Add any other valid crawl options
      const validCrawlOptions = [
        'includePaths', 'excludePaths', 'maxDiscoveryDepth', 'crawlEntireDomain',
        'allowExternalLinks', 'allowSubdomains', 'delay', 'maxConcurrency',
        'webhook', 'zeroDataRetention', 'integration'
      ];
      for (const key of validCrawlOptions) {
        if (key in crawlOptions && crawlOptions[key] !== undefined) {
          crawlConfig[key] = crawlOptions[key];
        }
      }

      await log('Starting Firecrawl crawl', {
        url,
        limit: crawlConfig.limit ?? null,
        scrapeOptions: crawlConfig.scrapeOptions,
      });

      // Call crawl with URL as first param, options as second
      const response = await this.firecrawl.crawl(url, crawlConfig as any);

      await log('Firecrawl crawl completed', {
        status: response.status,
        completed: response.completed,
        total: response.total,
        creditsUsed: response.creditsUsed,
      });

      await update({
        status: 'completed',
        completedAt: new Date(),
        result: {
          type: 'crawl',
          url,
          options: crawlConfig,
          data: response,
        },
      });

      await this.repository.updateRun(params.runId, {
        status: 'completed',
        phase: 'store',
        summary: {
          ...(params.initialSummary ?? {}),
          execution: {
            status: 'completed',
          },
        },
        completedAt: new Date(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Execution failed';
      const responseData = (error as { response?: { data?: unknown; status?: number } }).response?.data;
      const responseStatus = (error as { response?: { status?: number } }).response?.status;

      await log(
        'Firecrawl crawl failed',
        {
          error: message,
          status: responseStatus ?? null,
          response: responseData ?? null,
        },
        'error'
      );

      await update({
        status: 'failed',
        error: message,
        completedAt: new Date(),
        metadata: responseData ? { errorResponse: responseData } : undefined,
      });

      await this.repository.updateRun(params.runId, {
        status: 'failed',
        phase: 'execute',
        error: responseData ? `${message}: ${JSON.stringify(responseData)}` : message,
        completedAt: new Date(),
      });
    }
  }
}

export type { ExecutionService as ScrapeExecutionService };
