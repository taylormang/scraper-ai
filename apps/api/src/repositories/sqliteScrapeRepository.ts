import { randomUUID } from 'node:crypto';
import { getSqliteDatabase } from '../db/sqliteClient.js';
import type { ScrapeRepository } from './scrapeRepository.js';
import type {
  ScrapeRecord,
  ScrapeResult,
  ScrapeSuccessResult,
  ScrapeFailureResult,
  ScrapePagination,
} from '../types/scrape.js';

interface ScrapeRow {
  id: string;
  name: string;
  status: string;
  config: string;
  results: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

function mapRow(row: ScrapeRow): ScrapeRecord {
  return {
    id: row.id,
    name: row.name,
    status: row.status as ScrapeRecord['status'],
    config: JSON.parse(row.config) as ScrapeRecord['config'],
    results: row.results ? (JSON.parse(row.results) as ScrapeResult) : undefined,
    error: row.error ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class SqliteScrapeRepository implements ScrapeRepository {
  private db = getSqliteDatabase();

  async createScrape(data: { url: string; prompt?: string | null; pagination?: ScrapePagination | null }): Promise<ScrapeRecord> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const configData: Record<string, unknown> = { url: data.url };
    if (data.prompt) {
      configData.prompt = data.prompt;
    }
    if (data.pagination) {
      configData.pagination = data.pagination;
    }
    const config = JSON.stringify(configData);

    const stmt = this.db.prepare(`
      INSERT INTO scrapes (id, name, status, config, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, data.url, 'processing', config, now, now);

    return {
      id,
      name: data.url,
      status: 'processing',
      config: configData as ScrapeRecord['config'],
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };
  }

  async markCompleted(id: string, result: ScrapeSuccessResult): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE scrapes
      SET status = ?, results = ?, error = NULL, updated_at = ?
      WHERE id = ?
    `);

    stmt.run('completed', JSON.stringify(result), new Date().toISOString(), id);
  }

  async markFailed(id: string, error: string, failure?: ScrapeFailureResult): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE scrapes
      SET status = ?, error = ?, results = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      'failed',
      error,
      failure ? JSON.stringify(failure) : null,
      new Date().toISOString(),
      id
    );
  }

  async getAllScrapes(): Promise<ScrapeRecord[]> {
    const stmt = this.db.prepare(`
      SELECT id, name, status, config, results, error, created_at, updated_at
      FROM scrapes
      ORDER BY datetime(created_at) DESC
    `);

    const rows = stmt.all() as ScrapeRow[];
    return rows.map(mapRow);
  }

  async getScrapeById(id: string): Promise<ScrapeRecord | null> {
    const stmt = this.db.prepare(`
      SELECT id, name, status, config, results, error, created_at, updated_at
      FROM scrapes
      WHERE id = ?
    `);

    const row = stmt.get(id) as ScrapeRow | undefined;
    return row ? mapRow(row) : null;
  }
}
