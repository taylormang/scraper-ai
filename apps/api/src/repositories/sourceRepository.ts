import type { Source } from '../types/source.js';

// Repository interface - can be swapped for database implementation later
export interface SourceRepository {
  findByUrl(url: string): Promise<Source | null>;
  create(source: Omit<Source, 'id' | 'created_at' | 'updated_at'>): Promise<Source>;
  update(id: string, updates: Partial<Source>): Promise<Source>;
  findById(id: string): Promise<Source | null>;
  list(): Promise<Source[]>;
}
