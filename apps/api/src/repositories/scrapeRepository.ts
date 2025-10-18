import type {
  ScrapeRecord,
  ScrapeSuccessResult,
  ScrapeFailureResult,
  ScrapePagination,
} from '../types/scrape.js';

export interface ScrapeRepository {
  createScrape(data: { url: string; prompt?: string | null; pagination?: ScrapePagination | null }): Promise<ScrapeRecord>;
  markCompleted(id: string, result: ScrapeSuccessResult): Promise<void>;
  markFailed(id: string, error: string, failure?: ScrapeFailureResult): Promise<void>;
  getAllScrapes(): Promise<ScrapeRecord[]>;
  getScrapeById(id: string): Promise<ScrapeRecord | null>;
}
