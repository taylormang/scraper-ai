import { config } from '../config/index.js';
import type { RunRepository } from './runRepository.js';
import type { TraceRepository } from './traceRepository.js';
import { PostgresRunRepository } from './postgresRunRepository.js';
import { PostgresTraceRepository } from './postgresTraceRepository.js';
import { SqliteTraceRepository } from './sqliteTraceRepository.js';

let runRepository: RunRepository | null = null;
let traceRepository: TraceRepository | null = null;

export function getRunRepository(): RunRepository {
  if (!runRepository) {
    runRepository = new PostgresRunRepository();
  }

  return runRepository;
}

export function getTraceRepository(): TraceRepository {
  if (!traceRepository) {
    traceRepository = config.database.url
      ? new PostgresTraceRepository()
      : new SqliteTraceRepository();
  }

  return traceRepository;
}

export type { RunRepository, TraceRepository };
