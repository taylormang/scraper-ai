// Pagination types
// Aligned with /docs/architecture_v1.md

import { z } from 'zod';

// =============================================================================
// Core Pagination Types (Used in Recipe)
// =============================================================================

export type PaginationStrategy = 'none' | 'url_pattern' | 'next_button' | 'infinite_scroll' | 'api';

export type PaginationConfig =
  | NextButtonConfig
  | UrlPatternConfig
  | InfiniteScrollConfig
  | ApiPaginationConfig;

export type NextButtonConfig = {
  type: 'next_button';
  selector: string; // CSS selector for next button (e.g., '.morelink')
  maxRetries: number; // If button not found
};

export type UrlPatternConfig = {
  type: 'url_pattern';
  template: string; // 'https://example.com/page={n}' or 'https://example.com/?p={n}'
  startPage: number; // Usually 1
  pageParam: string; // 'page' or 'p' or 'offset'
};

export type InfiniteScrollConfig = {
  type: 'infinite_scroll';
  scrolls: number; // Number of scroll actions
  waitTime: number; // Wait between scrolls (ms)
  scrollSelector?: string; // Element to scroll (optional, defaults to window)
};

export type ApiPaginationConfig = {
  type: 'api';
  nextKey: string; // JSON path to next cursor (e.g., 'data.nextCursor')
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
};

// Type guards for runtime checking
export function isNextButtonConfig(config: PaginationConfig): config is NextButtonConfig {
  return config.type === 'next_button';
}

export function isUrlPatternConfig(config: PaginationConfig): config is UrlPatternConfig {
  return config.type === 'url_pattern';
}

export function isInfiniteScrollConfig(config: PaginationConfig): config is InfiniteScrollConfig {
  return config.type === 'infinite_scroll';
}

export function isApiPaginationConfig(config: PaginationConfig): config is ApiPaginationConfig {
  return config.type === 'api';
}

// =============================================================================
// Analysis Engine Types (AI-powered pagination analysis)
// =============================================================================

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

export interface InfiniteScrollHints {
  hasIntersectionObserver: boolean;
  hasLazyLoadingAttributes: number;
  hasSentinelElements: number;
  hasInfiniteScrollKeywords: boolean;
  reasoning: string[];
}

export interface ContentContainer {
  selector: string;
  itemCount: number;
  sampleItemClasses: string[];
  reasoning: string;
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
  infiniteScrollHints?: InfiniteScrollHints;
  contentContainer?: ContentContainer;
}
