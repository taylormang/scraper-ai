import { config } from '../config/index.js';
import type { ScrapeRepository } from './scrapeRepository.js';
import type { TraceRepository } from './traceRepository.js';
import { PostgresScrapeRepository } from './postgresScrapeRepository.js';
import { SqliteScrapeRepository } from './sqliteScrapeRepository.js';
import { PostgresTraceRepository } from './postgresTraceRepository.js';
import { SqliteTraceRepository } from './sqliteTraceRepository.js';

let scrapeRepository: ScrapeRepository | null = null;
let traceRepository: TraceRepository | null = null;

export function getScrapeRepository(): ScrapeRepository {
  if (!scrapeRepository) {
    scrapeRepository = config.database.url
      ? new PostgresScrapeRepository()
      : new SqliteScrapeRepository();
  }

  return scrapeRepository;
}

export function getTraceRepository(): TraceRepository {
  if (!traceRepository) {
    traceRepository = config.database.url
      ? new PostgresTraceRepository()
      : new SqliteTraceRepository();
  }

  return traceRepository;
}

export type { ScrapeRepository, TraceRepository };
