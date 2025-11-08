import { config } from '../config/index.js';
import type { Recipe } from '../types/recipe.js';
import type { Source } from '../types/source.js';
import type { JsonRecipeRepository } from '../repositories/jsonRecipeRepository.js';
import type { JsonSourceRepository } from '../repositories/jsonSourceRepository.js';
import {
  analyzeRecipePrompt,
  analyzeRecipeUpdatePrompt,
} from './recipe/index.js';
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
    depth: promptAnalysis.depth,
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
  // Step 3: Get engine configuration from Source
  // ========================================================================

  if (!source.engine_configs?.firecrawl?.pagination_pattern) {
    throw new Error('Source does not have valid engine configuration');
  }

  const engineConfig = {
    firecrawl: source.engine_configs.firecrawl,
  };

  console.log('[RecipeService] ✓ Engine config loaded from Source:', {
    strategy: engineConfig.firecrawl.pagination_pattern.strategy,
    actions: engineConfig.firecrawl.pagination_pattern.action_sequence.length,
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
      depth: promptAnalysis.depth,
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

export interface UpdateRecipeFromPromptInput {
  recipeId: string;
  updatePrompt: string;
  recipeRepository: JsonRecipeRepository;
  sourceRepository: JsonSourceRepository;
}

export interface UpdateRecipeFromPromptResult {
  recipe: Recipe;
  source: Source;
  changes: string[];
}

/**
 * Update a Recipe from natural language prompt
 *
 * Workflow:
 * 1. Fetch current Recipe
 * 2. Analyze update prompt with AI to extract changes
 * 3. Apply changes to Recipe
 * 4. Recompile engine config if extraction settings changed
 * 5. Update Recipe in repository
 */
export async function updateRecipeFromPrompt(
  input: UpdateRecipeFromPromptInput
): Promise<UpdateRecipeFromPromptResult> {
  const { recipeId, updatePrompt, recipeRepository, sourceRepository } = input;

  console.log('[RecipeService] Updating Recipe from prompt:', recipeId, updatePrompt);

  // ========================================================================
  // Step 1: Fetch current Recipe
  // ========================================================================

  const currentRecipe = await recipeRepository.findById(recipeId);
  if (!currentRecipe) {
    throw new Error(`Recipe ${recipeId} not found`);
  }

  console.log('[RecipeService] ✓ Current Recipe loaded:', currentRecipe.name);

  // ========================================================================
  // Step 2: Analyze update prompt with AI
  // ========================================================================

  const updates = await analyzeRecipeUpdatePrompt(currentRecipe, updatePrompt);
  console.log('[RecipeService] ✓ Update analysis complete:', Object.keys(updates));

  if (Object.keys(updates).length === 0) {
    console.log('[RecipeService] No changes detected');
    const source = await sourceRepository.findById(currentRecipe.source_id);
    return {
      recipe: currentRecipe,
      source: source!,
      changes: [],
    };
  }

  // ========================================================================
  // Step 3: Build updated Recipe data
  // ========================================================================

  const changes: string[] = [];
  const recipeUpdate: Partial<Recipe> = {};

  // Update basic fields
  if (updates.name !== undefined) {
    recipeUpdate.name = updates.name;
    changes.push(`name: "${currentRecipe.name}" → "${updates.name}"`);
  }

  if (updates.description !== undefined) {
    recipeUpdate.description = updates.description;
    changes.push(`description updated`);
  }

  // Update extraction config
  const extractionChanges: any = {};
  let extractionUpdated = false;

  if (updates.fields !== undefined) {
    extractionChanges.fields = updates.fields;
    extractionUpdated = true;
    changes.push(`fields: ${updates.fields.length} fields configured`);
  }

  if (updates.depth !== undefined) {
    extractionChanges.depth = updates.depth;
    extractionUpdated = true;
    changes.push(`depth: ${currentRecipe.extraction.depth} → ${updates.depth}`);
  }

  if (updates.deduplicate !== undefined) {
    extractionChanges.deduplicate = updates.deduplicate;
    extractionUpdated = true;
    changes.push(`deduplicate: ${updates.deduplicate}`);
  }

  if (updates.deduplicate_field !== undefined) {
    extractionChanges.deduplicate_field = updates.deduplicate_field;
    extractionUpdated = true;
    changes.push(`deduplicate_field: "${updates.deduplicate_field ?? 'none'}"`);
  }

  if (extractionUpdated) {
    recipeUpdate.extraction = {
      ...currentRecipe.extraction,
      ...extractionChanges,
    };
  }

  // ========================================================================
  // Step 5: Update Recipe in repository
  // ========================================================================

  const updatedRecipe = await recipeRepository.update(recipeId, recipeUpdate);
  console.log('[RecipeService] ✓ Recipe updated:', updatedRecipe.id);

  const source = await sourceRepository.findById(updatedRecipe.source_id);

  return {
    recipe: updatedRecipe,
    source: source!,
    changes,
  };
}
