/**
 * Recipe Execution Service
 *
 * Orchestrates the execution of Recipes using configured scraping engines
 */

import Firecrawl from '@mendable/firecrawl-js';
import { config } from '../config/index.js';
import { JsonExecutionRepository } from '../repositories/jsonExecutionRepository.js';
import { JsonRecipeRepository } from '../repositories/jsonRecipeRepository.js';
import { JsonDatasetRepository } from '../repositories/jsonDatasetRepository.js';
import { FieldExtractionService } from './fieldExtractionService.js';
import type { Execution } from '../types/execution.js';
import type { Recipe } from '../types/recipe.js';
import type { Dataset } from '../types/dataset.js';

type FirecrawlClient = InstanceType<typeof Firecrawl>;

export class RecipeExecutionService {
  private firecrawl: FirecrawlClient;
  private executionRepo: JsonExecutionRepository;
  private recipeRepo: JsonRecipeRepository;
  private datasetRepo: JsonDatasetRepository;
  private fieldExtractor: FieldExtractionService;

  constructor() {
    if (!config.services.firecrawl) {
      throw new Error('FIRECRAWL_API_KEY is required to execute recipes');
    }
    this.firecrawl = new Firecrawl({ apiKey: config.services.firecrawl });
    this.executionRepo = new JsonExecutionRepository();
    this.recipeRepo = new JsonRecipeRepository();
    this.datasetRepo = new JsonDatasetRepository();
    this.fieldExtractor = new FieldExtractionService();
  }

  /**
   * Start executing a Recipe (async, returns immediately)
   */
  async executeRecipe(recipeId: string, userId: string = 'default_user'): Promise<Execution> {
    // Load the recipe
    const recipe = await this.recipeRepo.findById(recipeId);
    if (!recipe) {
      throw new Error(`Recipe not found: ${recipeId}`);
    }

    // Create execution record
    const execution = await this.executionRepo.create({
      recipe_id: recipeId,
      user_id: userId,
      status: 'queued',
      stats: {
        pages_scraped: 0,
        items_scraped: 0,
        errors: 0,
      },
      config: {
        engine: recipe.execution.engine,
        limit_strategy: recipe.extraction.limit_strategy,
        page_count: recipe.extraction.page_count,
        item_count: recipe.extraction.item_count,
        base_url: recipe.base_url,
      },
    });

    // Log execution start
    await this.executionRepo.appendLog(execution.id, {
      severity: 'info',
      message: 'Execution queued',
      payload: {
        recipe_id: recipeId,
        recipe_name: recipe.name,
      },
    });

    // Start execution asynchronously
    setImmediate(() => {
      this.runExecution(execution.id, recipe).catch((error) => {
        console.error(`[RecipeExecutionService] Execution ${execution.id} failed:`, error);
      });
    });

    return execution;
  }

  /**
   * Execute a Recipe synchronously (waits for completion and returns data)
   */
  async executeRecipeSync(
    recipeId: string,
    userId: string = 'default_user'
  ): Promise<{ execution: Execution; data: any }> {
    // Load the recipe
    const recipe = await this.recipeRepo.findById(recipeId);
    if (!recipe) {
      throw new Error(`Recipe not found: ${recipeId}`);
    }

    // Create execution record
    const execution = await this.executionRepo.create({
      recipe_id: recipeId,
      user_id: userId,
      status: 'queued',
      stats: {
        pages_scraped: 0,
        items_scraped: 0,
        errors: 0,
      },
      config: {
        engine: recipe.execution.engine,
        limit_strategy: recipe.extraction.limit_strategy,
        page_count: recipe.extraction.page_count,
        item_count: recipe.extraction.item_count,
        base_url: recipe.base_url,
      },
    });

    // Log execution start
    await this.executionRepo.appendLog(execution.id, {
      severity: 'info',
      message: 'Execution started (synchronous)',
      payload: {
        recipe_id: recipeId,
        recipe_name: recipe.name,
      },
    });

    // Run execution synchronously and capture data
    const data = await this.runExecutionSync(execution.id, recipe);

    // Get final execution state
    const finalExecution = await this.executionRepo.findById(execution.id);

    return {
      execution: finalExecution!,
      data,
    };
  }

  /**
   * Get execution by ID
   */
  async getExecution(executionId: string): Promise<Execution | null> {
    return this.executionRepo.findById(executionId);
  }

  /**
   * List executions (optionally filtered by recipe)
   */
  async listExecutions(recipeId?: string, limit?: number): Promise<Execution[]> {
    if (recipeId) {
      return this.executionRepo.findByRecipeId(recipeId);
    }
    return this.executionRepo.list(limit);
  }

  /**
   * Get logs for an execution
   */
  async getExecutionLogs(executionId: string, afterSequence?: number) {
    if (afterSequence !== undefined) {
      return this.executionRepo.getLogsAfter(executionId, afterSequence);
    }
    return this.executionRepo.getLogs(executionId);
  }

  /**
   * Internal: Run the actual execution
   */
  private async runExecution(executionId: string, recipe: Recipe): Promise<void> {
    const startedAt = new Date().toISOString();

    // Helper to update execution
    const updateExecution = async (updates: Partial<Execution>) => {
      await this.executionRepo.update(executionId, updates);
    };

    // Helper to log
    const log = async (
      message: string,
      payload?: any,
      severity: 'info' | 'warning' | 'error' | 'debug' = 'info'
    ) => {
      await this.executionRepo.appendLog(executionId, {
        severity,
        message,
        payload,
      });
    };

    try {
      // Mark as running
      await updateExecution({
        status: 'running',
        started_at: startedAt,
      });

      await log('Execution started', {
        recipe_name: recipe.name,
        base_url: recipe.base_url,
      });

      // Execute using Firecrawl
      if (recipe.execution.engine === 'firecrawl') {
        await this.executeWithFirecrawl(executionId, recipe, { log, updateExecution });
      } else {
        throw new Error(`Unsupported engine: ${recipe.execution.engine}`);
      }

      // Mark as completed
      await updateExecution({
        status: 'completed',
        completed_at: new Date().toISOString(),
      });

      await log('Execution completed successfully');

      // Update recipe's last_run stats
      await this.updateRecipeStats(recipe.id, executionId, 'complete');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await log(`Execution failed: ${errorMessage}`, { error: errorMessage }, 'error');

      await updateExecution({
        status: 'failed',
        error: errorMessage,
        completed_at: new Date().toISOString(),
      });

      // Update recipe's last_run stats
      await this.updateRecipeStats(recipe.id, executionId, 'failed');
    }
  }

  /**
   * Execute using Firecrawl engine
   */
  private async executeWithFirecrawl(
    executionId: string,
    recipe: Recipe,
    helpers: {
      log: (message: string, payload?: any, severity?: 'info' | 'warning' | 'error' | 'debug') => Promise<void>;
      updateExecution: (updates: Partial<Execution>) => Promise<void>;
    }
  ): Promise<void> {
    const { log, updateExecution } = helpers;

    // Get the execution to get user_id
    const execution = await this.executionRepo.findById(executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    // Create Dataset for this execution
    const dataset = await this.datasetRepo.create({
      recipe_id: recipe.id,
      execution_id: executionId,
      user_id: execution.user_id,
    });

    await log('Created dataset', { dataset_id: dataset.id });

    // Link dataset to execution
    await updateExecution({
      dataset_id: dataset.id,
    });

    // Build Firecrawl crawl options from recipe configuration
    const crawlOptions: any = {
      scrapeOptions: {
        formats: recipe.execution.engine_config?.firecrawl?.formats || ['markdown', 'html'],
      },
    };

    // Add limit based on strategy
    if (recipe.extraction.limit_strategy === 'page_count' && recipe.extraction.page_count) {
      crawlOptions.limit = recipe.extraction.page_count;
    }

    await log('Starting Firecrawl crawl', {
      url: recipe.base_url,
      limit: crawlOptions.limit,
      formats: crawlOptions.scrapeOptions.formats,
    });

    try {
      // Call Firecrawl API
      const response = await this.firecrawl.crawl(recipe.base_url, crawlOptions);

      await log('Firecrawl crawl completed', {
        status: response.status,
        completed: response.completed,
        total: response.total,
        creditsUsed: response.creditsUsed,
      });

      // Count items scraped
      const itemsScraped = response.data?.length || 0;

      // Store each page as a dataset item
      if (response.data && response.data.length > 0) {
        await log('Extracting fields from scraped pages', {
          dataset_id: dataset.id,
          page_count: response.data.length,
          fields: recipe.extraction.fields.map((f) => f.name),
        });

        for (const page of response.data) {
          // Extract structured fields from the page content
          const extractedData = await this.fieldExtractor.extractFields(
            page.markdown || '',
            recipe.extraction.fields,
            {
              url: (page as any).url,
              metadata: page.metadata,
            }
          );

          // Store the extracted data (optionally include raw content)
          const itemData: any = { ...extractedData };

          if (recipe.extraction.include_raw_content) {
            itemData._raw = {
              markdown: page.markdown,
              html: page.html,
              metadata: page.metadata,
            };
          }

          await this.datasetRepo.addItem({
            dataset_id: dataset.id,
            data: itemData,
            source_url: (page as any).url || recipe.base_url,
            scraped_at: new Date().toISOString(),
          });
        }

        await log('All pages extracted and stored in dataset', {
          dataset_id: dataset.id,
          items_stored: response.data.length,
        });
      }

      // Update stats
      await updateExecution({
        stats: {
          pages_scraped: response.total || 0,
          items_scraped: itemsScraped,
          errors: 0,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Firecrawl execution failed';
      await log(`Firecrawl error: ${message}`, { error: message }, 'error');
      throw error;
    }
  }

  /**
   * Internal: Run execution synchronously and return data
   */
  private async runExecutionSync(executionId: string, recipe: Recipe): Promise<any> {
    const startedAt = new Date().toISOString();

    // Helper to update execution
    const updateExecution = async (updates: Partial<Execution>) => {
      await this.executionRepo.update(executionId, updates);
    };

    // Helper to log
    const log = async (
      message: string,
      payload?: any,
      severity: 'info' | 'warning' | 'error' | 'debug' = 'info'
    ) => {
      await this.executionRepo.appendLog(executionId, {
        severity,
        message,
        payload,
      });
    };

    try {
      // Mark as running
      await updateExecution({
        status: 'running',
        started_at: startedAt,
      });

      await log('Execution started', {
        recipe_name: recipe.name,
        base_url: recipe.base_url,
      });

      // Execute using Firecrawl and get data
      let data: any = null;
      if (recipe.execution.engine === 'firecrawl') {
        data = await this.executeWithFirecrawlSync(executionId, recipe, { log, updateExecution });
      } else {
        throw new Error(`Unsupported engine: ${recipe.execution.engine}`);
      }

      // Mark as completed
      await updateExecution({
        status: 'completed',
        completed_at: new Date().toISOString(),
      });

      await log('Execution completed successfully');

      // Update recipe's last_run stats
      await this.updateRecipeStats(recipe.id, executionId, 'complete');

      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await log(`Execution failed: ${errorMessage}`, { error: errorMessage }, 'error');

      await updateExecution({
        status: 'failed',
        error: errorMessage,
        completed_at: new Date().toISOString(),
      });

      // Update recipe's last_run stats
      await this.updateRecipeStats(recipe.id, executionId, 'failed');

      throw error;
    }
  }

  /**
   * Execute using Firecrawl and return the scraped data
   */
  private async executeWithFirecrawlSync(
    executionId: string,
    recipe: Recipe,
    helpers: {
      log: (message: string, payload?: any, severity?: 'info' | 'warning' | 'error' | 'debug') => Promise<void>;
      updateExecution: (updates: Partial<Execution>) => Promise<void>;
    }
  ): Promise<any> {
    const { log, updateExecution } = helpers;

    // Get the execution to get user_id
    const execution = await this.executionRepo.findById(executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    // Create Dataset for this execution
    const dataset = await this.datasetRepo.create({
      recipe_id: recipe.id,
      execution_id: executionId,
      user_id: execution.user_id,
    });

    await log('Created dataset', { dataset_id: dataset.id });

    // Link dataset to execution
    await updateExecution({
      dataset_id: dataset.id,
    });

    // Build Firecrawl crawl options from recipe configuration
    const crawlOptions: any = {
      scrapeOptions: {
        formats: recipe.execution.engine_config?.firecrawl?.formats || ['markdown', 'html'],
      },
    };

    // Add limit based on strategy
    if (recipe.extraction.limit_strategy === 'page_count' && recipe.extraction.page_count) {
      crawlOptions.limit = recipe.extraction.page_count;
    }

    await log('Starting Firecrawl crawl', {
      url: recipe.base_url,
      limit: crawlOptions.limit,
      formats: crawlOptions.scrapeOptions.formats,
    });

    try {
      // Call Firecrawl API
      const response = await this.firecrawl.crawl(recipe.base_url, crawlOptions);

      await log('Firecrawl crawl completed', {
        status: response.status,
        completed: response.completed,
        total: response.total,
        creditsUsed: response.creditsUsed,
      });

      // Count items scraped
      const itemsScraped = response.data?.length || 0;

      // Store each page as a dataset item
      if (response.data && response.data.length > 0) {
        await log('Extracting fields from scraped pages', {
          dataset_id: dataset.id,
          page_count: response.data.length,
          fields: recipe.extraction.fields.map((f) => f.name),
        });

        for (const page of response.data) {
          // Extract structured fields from the page content
          const extractedData = await this.fieldExtractor.extractFields(
            page.markdown || '',
            recipe.extraction.fields,
            {
              url: (page as any).url,
              metadata: page.metadata,
            }
          );

          // Store the extracted data (optionally include raw content)
          const itemData: any = { ...extractedData };

          if (recipe.extraction.include_raw_content) {
            itemData._raw = {
              markdown: page.markdown,
              html: page.html,
              metadata: page.metadata,
            };
          }

          await this.datasetRepo.addItem({
            dataset_id: dataset.id,
            data: itemData,
            source_url: (page as any).url || recipe.base_url,
            scraped_at: new Date().toISOString(),
          });
        }

        await log('All pages extracted and stored in dataset', {
          dataset_id: dataset.id,
          items_stored: response.data.length,
        });
      }

      // Update stats
      await updateExecution({
        stats: {
          pages_scraped: response.total || 0,
          items_scraped: itemsScraped,
          errors: 0,
        },
      });

      // Return the scraped data with dataset info
      return {
        dataset_id: dataset.id,
        pages: response.data || [],
        total: response.total,
        creditsUsed: response.creditsUsed,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Firecrawl execution failed';
      await log(`Firecrawl error: ${message}`, { error: message }, 'error');
      throw error;
    }
  }

  /**
   * Update Recipe's last_run statistics
   */
  private async updateRecipeStats(
    recipeId: string,
    executionId: string,
    status: 'complete' | 'failed'
  ): Promise<void> {
    const recipe = await this.recipeRepo.findById(recipeId);
    if (!recipe) return;

    const execution = await this.executionRepo.findById(executionId);
    if (!execution) return;

    // Update recipe datasets stats
    const updatedDatasets = {
      ...recipe.datasets,
      total_runs: recipe.datasets.total_runs + 1,
      last_run: {
        dataset_id: execution.dataset_id || '', // Will be populated when we create datasets
        status: status === 'complete' ? ('complete' as const) : ('failed' as const),
        started_at: execution.started_at || execution.created_at,
        completed_at: execution.completed_at,
        items_scraped: execution.stats.items_scraped,
        pages_scraped: execution.stats.pages_scraped,
        errors: execution.stats.errors,
      },
    };

    await this.recipeRepo.update(recipeId, {
      datasets: updatedDatasets,
      updated_at: new Date().toISOString(),
    });
  }
}
