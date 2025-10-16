import { config } from '../config/index.js';
import type { ScrapeRepository } from './scrapeRepository.js';
import { PostgresScrapeRepository } from './postgresScrapeRepository.js';
import { SqliteScrapeRepository } from './sqliteScrapeRepository.js';

let repository: ScrapeRepository | null = null;

export function getScrapeRepository(): ScrapeRepository {
  if (!repository) {
    repository = config.database.url
      ? new PostgresScrapeRepository()
      : new SqliteScrapeRepository(config.database.sqlitePath);
  }

  return repository;
}

export type { ScrapeRepository };
