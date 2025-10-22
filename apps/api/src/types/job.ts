import { z } from 'zod';
import { scrapePlanSchema } from './planner.js';
import { paginationInferenceResponseSchema } from './pagination.js';
import {
  extractionFieldSchema,
  extractionSchemaResponseSchema,
} from './extraction.js';

const firecrawlFormatSchema = z.union([
  z.string(),
  z.object({
    type: z.literal('json'),
    prompt: z.string(),
  }),
]);

const firecrawlActionSchema = z.record(z.string(), z.unknown());

const firecrawlScrapeOptionsSchema = z
  .object({
    formats: z.array(firecrawlFormatSchema),
    actions: z.array(firecrawlActionSchema).optional(),
    waitFor: z.number().int().nonnegative().optional(),
    timeout: z.number().int().positive().optional(),
    onlyMainContent: z.boolean().optional(),
    mobile: z.boolean().optional(),
    fastMode: z.boolean().optional(),
  })
  .passthrough();

export const firecrawlCrawlConfigSchema = z.object({
    url: z.string().url(),
    limit: z.number().int().positive().optional(),
    scrapeOptions: firecrawlScrapeOptionsSchema.optional(),
    includePaths: z.array(z.string()).optional(),
    excludePaths: z.array(z.string()).optional(),
    allowSubdomains: z.boolean().optional(),
    allowExternalLinks: z.boolean().optional(),
    maxDiscoveryDepth: z.number().int().nonnegative().optional(),
    delay: z.number().int().nonnegative().optional(),
  });

export type FirecrawlCrawlConfig = z.infer<typeof firecrawlCrawlConfigSchema>;

export const jobAssemblyInputSchema = z.object({
  userPrompt: z.string().min(1, 'User prompt is required'),
  plan: scrapePlanSchema,
  pagination: paginationInferenceResponseSchema.optional(),
  extraction: extractionSchemaResponseSchema,
});

export type JobAssemblyInput = z.infer<typeof jobAssemblyInputSchema>;

export const jobAssemblyResponseSchema = z.object({
  crawlConfig: firecrawlCrawlConfigSchema,
  schema: z.object({
    fields: z.array(extractionFieldSchema),
  }),
  warnings: z.array(z.string()).default([]),
  notes: z.array(z.string()).default([]),
  summary: z.object({
    objective: z.string(),
    baseUrl: z.string().nullable(),
    paginationStrategy: z.string().nullable(),
    paginationConfidence: z.string().nullable(),
    extractionFormat: z.string(),
    totalFields: z.number().int().nonnegative(),
  }),
});

export type JobAssemblyResponse = z.infer<typeof jobAssemblyResponseSchema>;
