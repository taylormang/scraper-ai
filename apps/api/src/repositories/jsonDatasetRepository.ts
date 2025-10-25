/**
 * JSON-based Dataset Repository
 *
 * Stores datasets and their items in JSON files
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';
import type {
  Dataset,
  DatasetItem,
  CreateDatasetParams,
  CreateDatasetItemParams,
} from '../types/dataset.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../../data');
const DATASETS_FILE = path.join(DATA_DIR, 'datasets.json');
const DATASET_ITEMS_FILE = path.join(DATA_DIR, 'dataset_items.json');

export class JsonDatasetRepository {
  constructor() {
    this.ensureDataDir();
  }

  private async ensureDataDir() {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });

      // Initialize files if they don't exist
      try {
        await fs.access(DATASETS_FILE);
      } catch {
        await fs.writeFile(DATASETS_FILE, JSON.stringify([], null, 2));
      }

      try {
        await fs.access(DATASET_ITEMS_FILE);
      } catch {
        await fs.writeFile(DATASET_ITEMS_FILE, JSON.stringify([], null, 2));
      }
    } catch (error) {
      console.error('[JsonDatasetRepository] Error ensuring data directory:', error);
    }
  }

  /**
   * Create a new Dataset
   */
  async create(params: CreateDatasetParams): Promise<Dataset> {
    const dataset: Dataset = {
      id: `dataset_${nanoid(12)}`,
      recipe_id: params.recipe_id,
      execution_id: params.execution_id,
      user_id: params.user_id,
      stats: {
        item_count: 0,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const datasets = await this.readDatasets();
    datasets.push(dataset);
    await this.writeDatasets(datasets);

    return dataset;
  }

  /**
   * Find a Dataset by ID
   */
  async findById(id: string): Promise<Dataset | null> {
    const datasets = await this.readDatasets();
    return datasets.find((d) => d.id === id) || null;
  }

  /**
   * Find Datasets by Recipe ID
   */
  async findByRecipeId(recipeId: string): Promise<Dataset[]> {
    const datasets = await this.readDatasets();
    return datasets.filter((d) => d.recipe_id === recipeId);
  }

  /**
   * Find Dataset by Execution ID
   */
  async findByExecutionId(executionId: string): Promise<Dataset | null> {
    const datasets = await this.readDatasets();
    return datasets.find((d) => d.execution_id === executionId) || null;
  }

  /**
   * List all Datasets
   */
  async list(limit?: number): Promise<Dataset[]> {
    const datasets = await this.readDatasets();
    // Sort by created_at desc
    datasets.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return limit ? datasets.slice(0, limit) : datasets;
  }

  /**
   * Update a Dataset
   */
  async update(id: string, updates: Partial<Dataset>): Promise<Dataset | null> {
    const datasets = await this.readDatasets();
    const index = datasets.findIndex((d) => d.id === id);

    if (index === -1) {
      return null;
    }

    datasets[index] = {
      ...datasets[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    await this.writeDatasets(datasets);
    return datasets[index];
  }

  /**
   * Delete a Dataset
   */
  async delete(id: string): Promise<boolean> {
    const datasets = await this.readDatasets();
    const filtered = datasets.filter((d) => d.id !== id);

    if (filtered.length === datasets.length) {
      return false;
    }

    await this.writeDatasets(filtered);

    // Also delete all items for this dataset
    const items = await this.readItems();
    const filteredItems = items.filter((item) => item.dataset_id !== id);
    await this.writeItems(filteredItems);

    return true;
  }

  /**
   * Add an item to a Dataset
   */
  async addItem(params: CreateDatasetItemParams): Promise<DatasetItem> {
    const item: DatasetItem = {
      id: `item_${nanoid(12)}`,
      dataset_id: params.dataset_id,
      data: params.data,
      source_url: params.source_url,
      scraped_at: params.scraped_at || new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    const items = await this.readItems();
    items.push(item);
    await this.writeItems(items);

    // Update dataset stats
    await this.updateDatasetStats(params.dataset_id);

    return item;
  }

  /**
   * Get all items for a Dataset
   */
  async getItems(datasetId: string): Promise<DatasetItem[]> {
    const items = await this.readItems();
    return items.filter((item) => item.dataset_id === datasetId);
  }

  /**
   * Get items with pagination
   */
  async getItemsPaginated(
    datasetId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ items: DatasetItem[]; total: number }> {
    const allItems = await this.getItems(datasetId);
    const items = allItems.slice(offset, offset + limit);
    return { items, total: allItems.length };
  }

  /**
   * Update Dataset statistics based on its items
   */
  private async updateDatasetStats(datasetId: string): Promise<void> {
    const items = await this.getItems(datasetId);

    if (items.length === 0) {
      return;
    }

    const scrapedDates = items.map((item) => new Date(item.scraped_at).getTime());
    const firstScraped = new Date(Math.min(...scrapedDates)).toISOString();
    const lastScraped = new Date(Math.max(...scrapedDates)).toISOString();

    await this.update(datasetId, {
      stats: {
        item_count: items.length,
        first_scraped_at: firstScraped,
        last_scraped_at: lastScraped,
      },
    });
  }

  /**
   * Read datasets from file
   */
  private async readDatasets(): Promise<Dataset[]> {
    try {
      const data = await fs.readFile(DATASETS_FILE, 'utf-8');

      // Handle empty file
      if (!data || data.trim() === '') {
        console.warn('[JsonDatasetRepository] Datasets file is empty, initializing as empty array');
        return [];
      }

      return JSON.parse(data);
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        // File doesn't exist yet
        return [];
      }
      console.error('[JsonDatasetRepository] Error reading datasets:', error);
      // Return empty array on parse errors to avoid blocking
      return [];
    }
  }

  /**
   * Write datasets to file
   */
  private async writeDatasets(datasets: Dataset[]): Promise<void> {
    await fs.writeFile(DATASETS_FILE, JSON.stringify(datasets, null, 2));
  }

  /**
   * Read items from file
   */
  private async readItems(): Promise<DatasetItem[]> {
    try {
      const data = await fs.readFile(DATASET_ITEMS_FILE, 'utf-8');

      // Handle empty file
      if (!data || data.trim() === '') {
        console.warn('[JsonDatasetRepository] Items file is empty, initializing as empty array');
        return [];
      }

      return JSON.parse(data);
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        // File doesn't exist yet
        return [];
      }
      console.error('[JsonDatasetRepository] Error reading items:', error);
      // Return empty array on parse errors to avoid blocking
      return [];
    }
  }

  /**
   * Write items to file
   */
  private async writeItems(items: DatasetItem[]): Promise<void> {
    await fs.writeFile(DATASET_ITEMS_FILE, JSON.stringify(items, null, 2));
  }
}
