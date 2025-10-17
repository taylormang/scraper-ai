import { z } from 'zod';

export const fieldSpecSchema = z.object({
  name: z.string(),
  description: z.string(),
  required: z.boolean().default(true),
});

export type FieldSpec = z.infer<typeof fieldSpecSchema>;

export const paginationIntentSchema = z.object({
  strategy: z.enum(['page_count', 'item_count', 'unknown']).default('unknown'),
  targetValue: z.number().int().positive().nullable().default(null),
  notes: z.string().nullable().default(null),
});

export type PaginationIntent = z.infer<typeof paginationIntentSchema>;

export const scrapePlanSchema = z.object({
  baseUrl: z.string().url().nullable().default(null),
  alternativeUrls: z.array(z.string().url()).default([]),
  searchQuery: z.string().nullable().default(null),
  objective: z.string(),
  extractionFormat: z.enum(['json', 'markdown', 'html']).default('json'),
  extractionFields: z.array(fieldSpecSchema).default([]),
  pagination: paginationIntentSchema,
  constraints: z.array(z.string()).default([]),
  assumptions: z.array(z.string()).default([]),
  confidence: z.enum(['low', 'medium', 'high']).default('medium'),
});

export type ScrapePlan = z.infer<typeof scrapePlanSchema>;

export const planResponseSchema = z.object({
  plan: scrapePlanSchema,
  reasoning: z.string().nullable().default(null),
});

export type PlanResponse = z.infer<typeof planResponseSchema>;
