import Database from 'better-sqlite3';
import type { Database as DatabaseInstance } from 'better-sqlite3';
import { mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { ScrapeRepository } from './scrapeRepository.js';
import type { ScrapeRecord, ScrapeResult } from '../types/scrape.js';

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

function resolveDatabasePath(customPath?: string): string {
  const defaultPath = path.resolve(process.cwd(), 'data', 'scraper.sqlite');
  return customPath ? path.resolve(process.cwd(), customPath) : defaultPath;
}

function ensureDirectory(filePath: string) {
  const dir = path.dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
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
  private db: DatabaseInstance;

  constructor(databasePath?: string) {
    const resolvedPath = resolveDatabasePath(databasePath);
    ensureDirectory(resolvedPath);

    this.db = new Database(resolvedPath);
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('journal_mode = WAL');

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS scrapes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT NOT NULL,
        config TEXT NOT NULL,
        results TEXT,
        error TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  }

  async createScrape(data: { url: string; prompt?: string | null }): Promise<ScrapeRecord> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const configData: Record<string, unknown> = { url: data.url };
    if (data.prompt) {
      configData.prompt = data.prompt;
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

  async markCompleted(id: string, result: ScrapeResult): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE scrapes
      SET status = ?, results = ?, error = NULL, updated_at = ?
      WHERE id = ?
    `);

    stmt.run('completed', JSON.stringify(result), new Date().toISOString(), id);
  }

  async markFailed(id: string, error: string): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE scrapes
      SET status = ?, error = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run('failed', error, new Date().toISOString(), id);
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
