import { randomUUID } from 'node:crypto';
import { getSqliteDatabase } from '../db/sqliteClient.js';
import type { TraceRepository, TraceRecord, CreateTraceInput } from './traceRepository.js';

interface TraceRow {
  id: string;
  type: string;
  model: string;
  prompt: string;
  response: string | null;
  metadata: string | null;
  created_at: string;
}

function mapRow(row: TraceRow): TraceRecord {
  return {
    id: row.id,
    type: row.type,
    model: row.model,
    prompt: row.prompt,
    response: row.response ? JSON.parse(row.response) : undefined,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    createdAt: new Date(row.created_at),
  };
}

export class SqliteTraceRepository implements TraceRepository {
  private db = getSqliteDatabase();

  async createTrace(input: CreateTraceInput): Promise<TraceRecord> {
    const id = randomUUID();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO traces (id, type, model, prompt, response, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      input.type,
      input.model,
      input.prompt,
      input.response ? JSON.stringify(input.response) : null,
      input.metadata ? JSON.stringify(input.metadata) : null,
      now,
    );

    return {
      id,
      type: input.type,
      model: input.model,
      prompt: input.prompt,
      response: input.response,
      metadata: input.metadata,
      createdAt: new Date(now),
    };
  }

  async listTraces(limit: number): Promise<TraceRecord[]> {
    const stmt = this.db.prepare(`
      SELECT id, type, model, prompt, response, metadata, created_at
      FROM traces
      ORDER BY datetime(created_at) DESC
      LIMIT ?
    `);

    const rows = stmt.all(limit) as TraceRow[];
    return rows.map(mapRow);
  }
}
