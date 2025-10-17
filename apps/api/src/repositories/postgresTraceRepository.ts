import { desc } from 'drizzle-orm';
import { db, schema, type Trace, type NewTrace } from '../db/index.js';
import type { TraceRepository, TraceRecord, CreateTraceInput } from './traceRepository.js';

function transform(record: Trace): TraceRecord {
  return {
    id: record.id,
    type: record.type,
    model: record.model,
    prompt: record.prompt,
    response: record.response ?? undefined,
    metadata: record.metadata ?? undefined,
    createdAt: record.createdAt,
  };
}

export class PostgresTraceRepository implements TraceRepository {
  async createTrace(input: CreateTraceInput): Promise<TraceRecord> {
    const payload: NewTrace = {
      type: input.type,
      model: input.model,
      prompt: input.prompt,
      response: input.response ?? null,
      metadata: input.metadata ?? null,
    };

    const [record] = await db.insert(schema.traces).values(payload).returning();
    return transform(record);
  }

  async listTraces(limit: number): Promise<TraceRecord[]> {
    const records = await db
      .select()
      .from(schema.traces)
      .orderBy(desc(schema.traces.createdAt))
      .limit(limit);

    return records.map(transform);
  }
}
