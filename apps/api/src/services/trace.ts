import { getTraceRepository } from '../repositories/index.js';
import type { TraceRepository, TraceRecord } from '../repositories/traceRepository.js';

export interface RecordTraceInput {
  type: string;
  model: string;
  prompt: string;
  response?: unknown;
  metadata?: Record<string, unknown> | null;
}

export class TraceService {
  private repository: TraceRepository;

  constructor(repository: TraceRepository = getTraceRepository()) {
    this.repository = repository;
  }

  async recordTrace(input: RecordTraceInput): Promise<TraceRecord> {
    return await this.repository.createTrace(input);
  }

  async listTraces(limit = 100): Promise<TraceRecord[]> {
    return await this.repository.listTraces(limit);
  }
}

export type { TraceRecord };
