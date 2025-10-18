import { z } from 'zod';
import { scrapePlanSchema } from './planner.js';

export const extractionFieldSchema = z.object({
  name: z.string(),
  description: z.string(),
  required: z.boolean().default(true),
  type: z.string().default('string'),
  example: z.unknown().optional(),
  source: z.enum(['plan', 'llm', 'inferred']).default('llm'),
});

export type ExtractionField = z.infer<typeof extractionFieldSchema>;

export const extractionPlanInputSchema = z.object({
  userPrompt: z.string().min(1, 'User prompt is required'),
  plan: scrapePlanSchema,
  recon: z.object({
    url: z.string().url('Recon URL is required'),
    markdown: z.string().optional(),
    html: z.string().optional(),
    summary: z.unknown().optional(),
  }),
  pagination: z
    .object({
      strategy: z.enum(['next_link', 'load_more', 'unknown']),
      confidence: z.enum(['low', 'medium', 'high']),
      selector: z.string().nullable(),
      hrefTemplate: z.string().nullable(),
      actions: z.array(z.record(z.string(), z.unknown())),
      notes: z.string().nullable(),
    })
    .optional(),
});

export type ExtractionPlanInput = z.infer<typeof extractionPlanInputSchema>;

export const extractionSchemaResponseSchema = z.object({
  refinedPrompt: z.string(),
  notes: z.string().nullable().optional(),
  llmFields: z.array(extractionFieldSchema),
  inferredFields: z.array(extractionFieldSchema),
  extractStatus: z.string().nullable().optional(),
  sample: z.unknown().optional(),
  rawExtract: z.unknown().optional(),
});

export type ExtractionSchemaResponse = z.infer<typeof extractionSchemaResponseSchema>;
