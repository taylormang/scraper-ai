import * as fs from 'fs/promises';
import * as path from 'path';
import { ScrapedData, StorageResult, DataRecord } from './types';

export class JsonStorage {
  private dataDir: string;

  constructor(dataDir: string = './data') {
    this.dataDir = dataDir;
  }

  async ensureDataDir(): Promise<void> {
    try {
      await fs.access(this.dataDir);
      console.log(`📁 Data directory exists: ${this.dataDir}`);
    } catch {
      await fs.mkdir(this.dataDir, { recursive: true });
      console.log(`📁 Created data directory: ${this.dataDir}`);
    }
  }

  async store(scrapedData: ScrapedData): Promise<StorageResult> {
    try {
      await this.ensureDataDir();

      // Generate unique ID for this record
      const id = this.generateId(scrapedData);
      
      const record: DataRecord = {
        id,
        scrapedData,
        storedAt: new Date()
      };

      // Create filename based on source and timestamp
      const filename = `${scrapedData.metadata.source}_${id}.json`;
      const filePath = path.join(this.dataDir, filename);

      console.log(`💾 Storing data to: ${filePath}`);

      // Write to file with pretty formatting
      await fs.writeFile(filePath, JSON.stringify(record, null, 2), 'utf8');

      console.log(`✅ Data stored successfully`);
      console.log(`📊 Record ID: ${id}`);
      console.log(`📏 Data size: ${JSON.stringify(record).length} bytes`);

      return {
        success: true,
        filePath: filePath
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown storage error';
      console.log(`❌ Storage failed: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async load(id: string): Promise<DataRecord | null> {
    try {
      const files = await fs.readdir(this.dataDir);
      const matchingFile = files.find(file => file.includes(id));
      
      if (!matchingFile) {
        console.log(`❌ No file found for ID: ${id}`);
        return null;
      }

      const filePath = path.join(this.dataDir, matchingFile);
      const content = await fs.readFile(filePath, 'utf8');
      const record: DataRecord = JSON.parse(content);

      console.log(`📖 Loaded record: ${id} from ${matchingFile}`);
      return record;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown load error';
      console.log(`❌ Load failed: ${errorMessage}`);
      return null;
    }
  }

  async listRecords(): Promise<string[]> {
    try {
      await this.ensureDataDir();
      const files = await fs.readdir(this.dataDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      console.log(`📋 Found ${jsonFiles.length} stored records`);
      return jsonFiles;

    } catch (error) {
      console.log(`❌ Failed to list records: ${error}`);
      return [];
    }
  }

  private generateId(scrapedData: ScrapedData): string {
    // Simple ID generation based on URL and timestamp
    const urlHash = Buffer.from(scrapedData.url).toString('base64').slice(0, 8);
    const timestamp = Date.now().toString().slice(-6);
    return `${urlHash}_${timestamp}`;
  }
}