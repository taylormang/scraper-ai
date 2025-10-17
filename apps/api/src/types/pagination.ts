import { z } from 'zod';

export const paginationStrategySchema = z.enum(['next_link', 'load_more', 'unknown']);

export const paginationInferenceSchema = z.object({
  strategy: paginationStrategySchema,
  confidence: z.enum(['low', 'medium', 'high']).default('medium'),
  selector: z.string().nullable().default(null),
  hrefTemplate: z.string().nullable().default(null),
  actions: z.array(z.record(z.string(), z.unknown())).default([]),
  notes: z.string().nullable().default(null),
});

export type PaginationInference = z.infer<typeof paginationInferenceSchema>;

export const paginationInferenceResponseSchema = z.object({
  pagination: paginationInferenceSchema,
  reasoning: z.string().nullable().default(null),
  summary: z.any().optional(),
});

export type PaginationInferenceResponse = z.infer<typeof paginationInferenceResponseSchema>;

export interface PaginationSummaryInput {
  url: string;
  markdown?: string;
  html?: string;
  metadata?: Record<string, unknown> | null;
}

export interface PaginationInferenceInput extends PaginationSummaryInput {
  summary?: PaginationSummary;
}

export interface PaginationSummaryAnchor {
  text: string;
  href: string | null;
  rel: string | null;
  classes: string[];
  score: number;
}

export interface PaginationSummaryButton {
  text: string;
  selector: string;
  score: number;
}

export interface PaginationSummaryStats {
  totalAnchors: number;
  totalButtons: number;
  textLength: number;
}

export interface PaginationSummary {
  url: string;
  title?: string;
  headings?: string[];
  anchorSample?: PaginationSummaryAnchor[];
  buttonSample?: PaginationSummaryButton[];
  navigationFragments?: string[];
  textHead?: string;
  textTail?: string;
  stats?: PaginationSummaryStats;
}
