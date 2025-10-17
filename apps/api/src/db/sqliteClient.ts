import Database from 'better-sqlite3';
import type { Database as DatabaseInstance } from 'better-sqlite3';
import path from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { config } from '../config/index.js';

let dbInstance: DatabaseInstance | null = null;
let currentPath: string | null = null;

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

function initializeSchema(db: DatabaseInstance) {
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');

  db.exec(`
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

  db.exec(`
    CREATE TABLE IF NOT EXISTS traces (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      model TEXT NOT NULL,
      prompt TEXT NOT NULL,
      response TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL
    );
  `);
}

export function getSqliteDatabase(): DatabaseInstance {
  const configuredPath = config.database.sqlitePath;
  const resolvedPath = resolveDatabasePath(configuredPath);

  if (dbInstance && currentPath === resolvedPath) {
    return dbInstance;
  }

  if (dbInstance && currentPath !== resolvedPath) {
    throw new Error('SQLite database already initialized with different path');
  }

  ensureDirectory(resolvedPath);
  dbInstance = new Database(resolvedPath);
  currentPath = resolvedPath;
  initializeSchema(dbInstance);

  return dbInstance;
}
