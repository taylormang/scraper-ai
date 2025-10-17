import type { ScrapeRecord, ScrapeResult, ScrapePagination } from '../types/scrape.js';

export interface ScrapeRepository {
  createScrape(data: { url: string; prompt?: string | null; pagination?: ScrapePagination | null }): Promise<ScrapeRecord>;
  markCompleted(id: string, result: ScrapeResult): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
  getAllScrapes(): Promise<ScrapeRecord[]>;
  getScrapeById(id: string): Promise<ScrapeRecord | null>;
}
