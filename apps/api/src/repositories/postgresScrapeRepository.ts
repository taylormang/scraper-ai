import { desc, eq } from 'drizzle-orm';
import { db, schema, type Scrape } from '../db/index.js';
import type { ScrapeRepository } from './scrapeRepository.js';
import type {
  ScrapeRecord,
  ScrapeResult,
  ScrapeSuccessResult,
  ScrapeFailureResult,
  ScrapePagination,
} from '../types/scrape.js';

function transform(record: Scrape): ScrapeRecord {
  return {
    id: record.id,
    name: record.name,
    status: record.status as ScrapeRecord['status'],
    config: record.config as ScrapeRecord['config'],
    results: record.results as ScrapeResult | undefined,
    error: record.error ?? undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export class PostgresScrapeRepository implements ScrapeRepository {
  async createScrape(data: { url: string; prompt?: string | null; pagination?: ScrapePagination | null }): Promise<ScrapeRecord> {
    const config: Record<string, unknown> = { url: data.url };
    if (data.prompt) {
      config.prompt = data.prompt;
    }
    if (data.pagination) {
      config.pagination = data.pagination;
    }

    const [record] = await db.insert(schema.scrapes)
      .values({
        name: data.url,
        status: 'processing',
        config,
      })
      .returning();

    return transform(record);
  }

  async markCompleted(id: string, result: ScrapeSuccessResult): Promise<void> {
    await db.update(schema.scrapes)
      .set({
        status: 'completed',
        results: result,
        updatedAt: new Date(),
      })
      .where(eq(schema.scrapes.id, id));
  }

  async markFailed(id: string, error: string, failure?: ScrapeFailureResult): Promise<void> {
    await db.update(schema.scrapes)
      .set({
        status: 'failed',
        error,
        results: failure ?? null,
        updatedAt: new Date(),
      })
      .where(eq(schema.scrapes.id, id));
  }

  async getAllScrapes(): Promise<ScrapeRecord[]> {
    const records = await db.select()
      .from(schema.scrapes)
      .orderBy(desc(schema.scrapes.createdAt));

    return records.map(transform);
  }

  async getScrapeById(id: string): Promise<ScrapeRecord | null> {
    const [record] = await db.select()
      .from(schema.scrapes)
      .where(eq(schema.scrapes.id, id));

    return record ? transform(record) : null;
  }
}
