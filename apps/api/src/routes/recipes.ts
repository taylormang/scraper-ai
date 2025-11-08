import { Router } from 'express';
import { z } from 'zod';
import { ApiError, type ApiResponse } from '../types/index.js';
import { JsonRecipeRepository } from '../repositories/jsonRecipeRepository.js';
import { JsonSourceRepository } from '../repositories/jsonSourceRepository.js';
import { createRecipeFromPrompt, updateRecipeFromPrompt } from '../services/recipeService.js';

const router = Router();
const recipeRepository = new JsonRecipeRepository();
const sourceRepository = new JsonSourceRepository();

// Schema for Recipe creation request
const createRecipeSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  user_id: z.string().default('default_user'),
});

/**
 * POST /api/recipes
 *
 * AI Workflow to create a Recipe:
 * 1. Analyze user's natural language prompt
 * 2. Extract: URL, fields, pagination depth
 * 3. Find or create Source for the URL
 * 4. Create Recipe with extracted configuration
 */
router.post('/', async (req, res, next) => {
  try {
    const parsed = createRecipeSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR');
    }

    const { prompt, user_id } = parsed.data;

    // Execute full Recipe creation workflow
    const result = await createRecipeFromPrompt({
      prompt,
      user_id,
      recipeRepository,
      sourceRepository,
    });

    const { recipe, source } = result;

    const response: ApiResponse = {
      success: true,
      data: {
        recipe: {
          id: recipe.id,
          name: recipe.name,
          description: recipe.description,
          source_id: recipe.source_id,
          base_url: recipe.base_url,
          extraction: recipe.extraction,
          execution: {
            engine: recipe.execution.engine,
            engine_config: recipe.execution.engine_config,
          },
          status: recipe.status,
          created_at: recipe.created_at,
        },
        source: {
          id: source.id,
          url: source.url,
          domain: source.domain,
        },
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    console.error('[Recipes] Error:', error);
    next(error);
  }
});

/**
 * GET /api/recipes/:id
 * Get a Recipe by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const recipe = await recipeRepository.findById(id);

    if (!recipe) {
      throw new ApiError('Recipe not found', 404, 'NOT_FOUND');
    }

    const response: ApiResponse = {
      success: true,
      data: { recipe },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    console.error('[Recipes] Error:', error);
    next(error);
  }
});

/**
 * GET /api/recipes
 * List all Recipes (optionally filtered by user_id)
 */
router.get('/', async (req, res, next) => {
  try {
    const { user_id } = req.query;

    const recipes = user_id
      ? await recipeRepository.findByUserId(user_id as string)
      : await recipeRepository.list();

    const response: ApiResponse = {
      success: true,
      data: { recipes, count: recipes.length },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    console.error('[Recipes] Error:', error);
    next(error);
  }
});

/**
 * PATCH /api/recipes/:id
 * Update a Recipe using natural language
 *
 * AI Workflow to update a Recipe:
 * 1. Fetch current Recipe configuration
 * 2. Analyze user's natural language update prompt
 * 3. Extract only the changes requested
 * 4. Apply updates to Recipe
 * 5. Recompile engine config if needed
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const updateSchema = z.object({
      prompt: z.string().min(1, 'Update prompt is required'),
    });

    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR');
    }

    const { prompt } = parsed.data;

    // Execute Recipe update workflow
    const result = await updateRecipeFromPrompt({
      recipeId: id,
      updatePrompt: prompt,
      recipeRepository,
      sourceRepository,
    });

    const { recipe, source, changes } = result;

    const response: ApiResponse = {
      success: true,
      data: {
        recipe: {
          id: recipe.id,
          name: recipe.name,
          description: recipe.description,
          source_id: recipe.source_id,
          base_url: recipe.base_url,
          extraction: recipe.extraction,
          execution: {
            engine: recipe.execution.engine,
            engine_config: recipe.execution.engine_config,
          },
          status: recipe.status,
          updated_at: recipe.updated_at,
        },
        source: {
          id: source.id,
          url: source.url,
          domain: source.domain,
        },
        changes,
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    console.error('[Recipes] Update error:', error);
    next(error);
  }
});

/**
 * DELETE /api/recipes/:id
 * Delete a Recipe
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const deleted = await recipeRepository.delete(id);

    if (!deleted) {
      throw new ApiError('Recipe not found', 404, 'NOT_FOUND');
    }

    const response: ApiResponse = {
      success: true,
      data: { deleted: true },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    console.error('[Recipes] Error:', error);
    next(error);
  }
});

/**
 * POST /api/recipes/:id/execute
 * Execute a Recipe and return the scraped data
 */
router.post('/:id/execute', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { user_id = 'default_user' } = req.body;

    const recipe = await recipeRepository.findById(id);
    if (!recipe) {
      throw new ApiError('Recipe not found', 404, 'NOT_FOUND');
    }

    // Import execution service
    const { RecipeExecutionService } = await import('../services/recipeExecutionService.js');
    const executionService = new RecipeExecutionService();

    // Execute recipe synchronously and wait for results
    const result = await executionService.executeRecipeSync(id, user_id);

    const response: ApiResponse = {
      success: true,
      data: {
        execution: {
          id: result.execution.id,
          status: result.execution.status,
          stats: result.execution.stats,
          error: result.execution.error,
        },
        data: result.data,
        recipe: {
          id: recipe.id,
          name: recipe.name,
          base_url: recipe.base_url,
        },
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    console.error('[Recipes] Execute error:', error);
    next(error);
  }
});

export default router;
