import type { Trace } from '../db/schema.js';

export interface CreateTraceInput {
  type: string;
  model: string;
  prompt: string;
  response?: unknown;
  metadata?: Record<string, unknown> | null;
}

export interface TraceRecord {
  id: string;
  type: string;
  model: string;
  prompt: string;
  response?: unknown;
  metadata?: unknown;
  createdAt: Date;
}

export interface TraceRepository {
  createTrace(input: CreateTraceInput): Promise<TraceRecord>;
  listTraces(limit: number): Promise<TraceRecord[]>;
}

export type { Trace };
