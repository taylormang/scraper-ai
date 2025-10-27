import { config } from '../config/index.js';
import type { Recipe } from '../types/recipe.js';
import type { Source } from '../types/source.js';
import type { JsonRecipeRepository } from '../repositories/jsonRecipeRepository.js';
import type { JsonSourceRepository } from '../repositories/jsonSourceRepository.js';
import { analyzeRecipePrompt, compileRecipeEngineConfig } from './recipe/index.js';
import { executeSourceWorkflow } from './source/index.js';
import { createSourceFromUrl } from './sourceService.js';

export interface CreateRecipeFromPromptInput {
  prompt: string;
  user_id: string;
  recipeRepository: JsonRecipeRepository;
  sourceRepository: JsonSourceRepository;
}

export interface CreateRecipeFromPromptResult {
  recipe: Recipe;
  source: Source;
  created: boolean; // Whether a new Source was created
}

/**
 * Create a Recipe from natural language prompt
 *
 * Full workflow:
 * 1. Analyze user's natural language prompt with AI
 * 2. Find or create Source for the URL
 * 3. Compile Recipe-specific engine configuration
 * 4. Create Recipe with extracted configuration
 * 5. Update Source usage stats
 */
export async function createRecipeFromPrompt(
  input: CreateRecipeFromPromptInput
): Promise<CreateRecipeFromPromptResult> {
  const { prompt, user_id, recipeRepository, sourceRepository } = input;

  console.log('[RecipeService] Creating Recipe from prompt:', prompt);

  // ========================================================================
  // Step 1: Analyze user prompt with AI
  // ========================================================================

  const promptAnalysis = await analyzeRecipePrompt(prompt);
  console.log('[RecipeService] ✓ Prompt analysis complete:', {
    url: promptAnalysis.url,
    fields: promptAnalysis.fields.length,
    limit_strategy: promptAnalysis.limit_strategy,
    page_count: promptAnalysis.page_count,
  });

  // ========================================================================
  // Step 2: Find or create Source
  // ========================================================================

  let source = await sourceRepository.findByUrl(promptAnalysis.url);
  let isNewSource = !source;

  if (!source) {
    console.log('[RecipeService] Source not found, creating new Source...');

    if (!config.services.firecrawl) {
      throw new Error('FIRECRAWL_API_KEY not configured');
    }

    // Execute Source creation workflow
    const workflowResult = await executeSourceWorkflow({
      url: promptAnalysis.url,
      firecrawlApiKey: config.services.firecrawl,
    });

    const sourceData = createSourceFromUrl(promptAnalysis.url);
    source = await sourceRepository.create({
      ...sourceData,
      sample: workflowResult.sample,
      engine_configs: workflowResult.engine_configs,
      content_structure: workflowResult.content_structure,
      pagination: workflowResult.pagination,
    });

    console.log('[RecipeService] ✓ Source created:', source.id);
  } else {
    console.log('[RecipeService] Using existing Source:', source.id);
  }

  // ========================================================================
  // Step 3: Compile Recipe-specific engine configuration
  // ========================================================================

  const pageCount = promptAnalysis.page_count || 5; // Default to 5 pages
  const engineConfig = compileRecipeEngineConfig({
    source,
    pageCount,
  });

  console.log('[RecipeService] ✓ Engine config compiled:', {
    actions: engineConfig.firecrawl.actions.length,
    strategy: source.pagination?.strategy,
  });

  // ========================================================================
  // Step 4: Create Recipe
  // ========================================================================

  const recipeData: Omit<Recipe, 'id' | 'created_at' | 'updated_at'> = {
    user_id,
    name: promptAnalysis.name,
    description: promptAnalysis.description,
    source_id: source.id,
    base_url: promptAnalysis.url,
    extraction: {
      limit_strategy: promptAnalysis.limit_strategy,
      page_count: promptAnalysis.page_count,
      item_count: promptAnalysis.item_count,
      date_range: promptAnalysis.date_range,
      fields: promptAnalysis.fields,
      include_raw_content: false, // Default
      deduplicate: promptAnalysis.deduplicate,
      deduplicate_field: promptAnalysis.deduplicate_field,
    },
    execution: {
      engine: 'firecrawl',
      engine_config: engineConfig,
      rate_limit: {
        delay_ms: 1000,
        max_concurrent: 1,
      },
      retry: {
        max_attempts: 3,
        backoff_ms: 2000,
      },
      timeout_ms: 600000, // 10 minutes for multi-page scrapes with pagination
    },
    schedule: null,
    datasets: {
      total_runs: 0,
    },
    status: 'active',
  };

  const recipe = await recipeRepository.create(recipeData);
  console.log('[RecipeService] ✓ Recipe created:', recipe.id);

  // ========================================================================
  // Step 5: Update Source usage stats
  // ========================================================================

  await sourceRepository.update(source.id, {
    usage_stats: {
      recipe_count: (source.usage_stats?.recipe_count || 0) + 1,
      total_scrapes: source.usage_stats?.total_scrapes || 0,
      last_used: source.usage_stats?.last_used,
      avg_items_per_page: source.usage_stats?.avg_items_per_page,
    },
  });

  return {
    recipe,
    source,
    created: isNewSource,
  };
}
