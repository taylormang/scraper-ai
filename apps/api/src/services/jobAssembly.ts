import { randomUUID } from 'node:crypto';
import { config } from '../config/index.js';
import {
  jobAssemblyInputSchema,
  jobAssemblyResponseSchema,
  type JobAssemblyInput,
  type JobAssemblyResponse,
  type FirecrawlCrawlConfig,
} from '../types/job.js';
import { extractionFieldSchema } from '../types/extraction.js';
import { TraceService } from './trace.js';

export class JobAssemblyService {
  private traceService: TraceService;

  constructor(traceService?: TraceService) {
    if (!config.services.firecrawl) {
      throw new Error('FIRECRAWL_API_KEY is required to assemble crawl jobs');
    }
    this.traceService = traceService ?? new TraceService();
  }

  assembleJob(input: JobAssemblyInput): JobAssemblyResponse {
    const parsed = jobAssemblyInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(parsed.error.errors[0]?.message ?? 'Invalid job assembly input');
    }

    const { plan, pagination, extraction } = parsed.data;

    if (!plan.baseUrl) {
      throw new Error('Plan is missing a base URL; cannot assemble crawl job');
    }

    const warnings: string[] = [];
    const notes: string[] = extraction.notes ? [extraction.notes] : [];

    if (!pagination) {
      warnings.push('Pagination inference missing; crawl will default to single-page scrape.');
    } else if (pagination.pagination.confidence === 'low') {
      warnings.push('Pagination confidence is low. Review selectors/actions before running the crawl.');
    }

    if (extraction.llmFields.length === 0 && extraction.inferredFields.length === 0) {
      warnings.push('No extraction fields detected. Firecrawl JSON output may be empty.');
    }

    const aggregatedFields = this.mergeFields(plan.extractionFields, extraction);

    const crawlConfig: FirecrawlCrawlConfig = {
      url: plan.baseUrl,
      scrapeOptions: {
        formats: [
          'markdown',
          'html',
          {
            type: 'json',
            prompt: extraction.refinedPrompt,
          },
        ],
        // Note: Don't include pagination actions for crawl jobs
        // Firecrawl's crawl endpoint automatically discovers and follows links
        // Actions are only for interactive scraping within a single page
        waitFor: 5000,
        timeout: 90000,
        onlyMainContent: false,
        mobile: false,
      },
    };

    if (plan.pagination.strategy === 'page_count' && plan.pagination.targetValue) {
      crawlConfig.limit = plan.pagination.targetValue;
    }

    const response: JobAssemblyResponse = jobAssemblyResponseSchema.parse({
      crawlConfig,
      schema: {
        fields: aggregatedFields,
      },
      warnings,
      notes,
      summary: {
        objective: plan.objective,
        baseUrl: plan.baseUrl,
        paginationStrategy: pagination?.pagination.strategy ?? null,
        paginationConfidence: pagination?.pagination.confidence ?? null,
        extractionFormat: plan.extractionFormat,
        totalFields: aggregatedFields.length,
      },
    });

    this.traceService
      .recordTrace({
        type: 'assemble-job-config',
        model: 'planner-job-assembly',
        prompt: JSON.stringify(parsed.data, null, 2),
        response,
        metadata: {
          idempotencyKey: randomUUID(),
        },
      })
      .catch((error) => {
        console.error('[JobAssemblyService] Failed to record trace', error);
      });

    return response;
  }

  private mergeFields(
    planFields: JobAssemblyInput['plan']['extractionFields'],
    extraction: JobAssemblyInput['extraction']
  ) {
    const map = new Map<string, ReturnType<typeof extractionFieldSchema.parse>>();

    const addField = (field: ReturnType<typeof extractionFieldSchema.parse>) => {
      const existing = map.get(field.name);
      if (!existing) {
        map.set(field.name, field);
        return;
      }
      if (existing.source === 'plan') {
        return;
      }
      if (field.source === 'plan') {
        map.set(field.name, field);
        return;
      }
      if (existing.source === 'llm' && field.source === 'inferred') {
        return;
      }
      map.set(field.name, field);
    };

    planFields.forEach((field) =>
      addField(
        extractionFieldSchema.parse({
          name: field.name,
          description: field.description,
          required: field.required,
          type: 'string',
          source: 'plan',
        })
      )
    );

    extraction.llmFields.forEach((field) =>
      addField(
        extractionFieldSchema.parse({
          ...field,
          source: 'llm',
        })
      )
    );

    extraction.inferredFields.forEach((field) =>
      addField(
        extractionFieldSchema.parse({
          ...field,
          source: 'inferred',
        })
      )
    );

    return Array.from(map.values());
  }
}
