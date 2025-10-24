import fs from 'fs/promises';
import path from 'path';
import { nanoid } from 'nanoid';
import type { Source } from '../types/source.js';
import type { SourceRepository } from './sourceRepository.js';

export class JsonSourceRepository implements SourceRepository {
  private dataDir: string;
  private sourcesFile: string;

  constructor(dataDir: string = path.join(process.cwd(), 'data', 'sources')) {
    this.dataDir = dataDir;
    this.sourcesFile = path.join(dataDir, 'sources.json');
  }

  private async ensureDataDir(): Promise<void> {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  private async readSources(): Promise<Source[]> {
    try {
      const data = await fs.readFile(this.sourcesFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      // File doesn't exist yet
      return [];
    }
  }

  private async writeSources(sources: Source[]): Promise<void> {
    await this.ensureDataDir();
    await fs.writeFile(this.sourcesFile, JSON.stringify(sources, null, 2), 'utf-8');
  }

  async findByUrl(url: string): Promise<Source | null> {
    const sources = await this.readSources();
    return sources.find((s) => s.canonical_url === url || s.url === url) || null;
  }

  async findById(id: string): Promise<Source | null> {
    const sources = await this.readSources();
    return sources.find((s) => s.id === id) || null;
  }

  async create(sourceData: Omit<Source, 'id' | 'created_at' | 'updated_at'>): Promise<Source> {
    const sources = await this.readSources();

    const now = new Date().toISOString();
    const source: Source = {
      ...sourceData,
      id: `source_${nanoid(12)}`,
      created_at: now,
      updated_at: now,
    };

    sources.push(source);
    await this.writeSources(sources);

    return source;
  }

  async update(id: string, updates: Partial<Source>): Promise<Source> {
    const sources = await this.readSources();
    const index = sources.findIndex((s) => s.id === id);

    if (index === -1) {
      throw new Error(`Source not found: ${id}`);
    }

    const updated: Source = {
      ...sources[index],
      ...updates,
      id: sources[index].id, // Prevent ID change
      created_at: sources[index].created_at, // Prevent created_at change
      updated_at: new Date().toISOString(),
    };

    sources[index] = updated;
    await this.writeSources(sources);

    return updated;
  }

  async list(): Promise<Source[]> {
    return this.readSources();
  }
}
