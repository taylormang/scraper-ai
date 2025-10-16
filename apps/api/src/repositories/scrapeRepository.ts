import type { ScrapeRecord, ScrapeResult } from '../types/scrape.js';

export interface ScrapeRepository {
  createScrape(data: { url: string; prompt?: string | null }): Promise<ScrapeRecord>;
  markCompleted(id: string, result: ScrapeResult): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
  getAllScrapes(): Promise<ScrapeRecord[]>;
  getScrapeById(id: string): Promise<ScrapeRecord | null>;
}
