/**
 * Executions Routes
 *
 * API endpoints for Recipe executions
 */

import { Router } from 'express';
import { z } from 'zod';
import { ApiError, type ApiResponse } from '../types/index.js';
import { RecipeExecutionService } from '../services/recipeExecutionService.js';
import { JsonRecipeRepository } from '../repositories/jsonRecipeRepository.js';

const router = Router();
const executionService = new RecipeExecutionService();
const recipeRepository = new JsonRecipeRepository();

/**
 * POST /api/executions
 * Start a new execution of a Recipe
 */
const executeRecipeSchema = z.object({
  recipe_id: z.string().min(1, 'Recipe ID is required'),
  user_id: z.string().default('default_user'),
});

router.post('/', async (req, res, next) => {
  try {
    const parsed = executeRecipeSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR');
    }

    const { recipe_id, user_id } = parsed.data;

    const execution = await executionService.executeRecipe(recipe_id, user_id);

    const response: ApiResponse = {
      success: true,
      data: {
        execution: {
          id: execution.id,
          recipe_id: execution.recipe_id,
          status: execution.status,
          stats: execution.stats,
          created_at: execution.created_at,
        },
      },
      timestamp: new Date().toISOString(),
    };

    res.status(202).json(response);
  } catch (error) {
    console.error('[Executions] Error:', error);
    next(error);
  }
});

/**
 * GET /api/executions
 * List all executions (optionally filtered by recipe)
 */
router.get('/', async (req, res, next) => {
  try {
    const { recipe_id, limit } = req.query;

    const limitNum = limit ? Number.parseInt(limit as string, 10) : undefined;
    if (limitNum !== undefined && (Number.isNaN(limitNum) || limitNum < 1)) {
      throw new ApiError('Limit must be a positive number', 400, 'VALIDATION_ERROR');
    }

    const executions = await executionService.listExecutions(
      recipe_id as string | undefined,
      limitNum
    );

    // Enrich with recipe names
    const enriched = await Promise.all(
      executions.map(async (execution) => {
        const recipe = await recipeRepository.findById(execution.recipe_id);
        return {
          id: execution.id,
          recipe_id: execution.recipe_id,
          recipe_name: recipe?.name || 'Unknown',
          status: execution.status,
          stats: execution.stats,
          error: execution.error,
          started_at: execution.started_at,
          completed_at: execution.completed_at,
          created_at: execution.created_at,
        };
      })
    );

    const response: ApiResponse = {
      success: true,
      data: {
        executions: enriched,
        count: enriched.length,
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    console.error('[Executions] Error:', error);
    next(error);
  }
});

/**
 * GET /api/executions/:id
 * Get a specific execution with details and logs
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const execution = await executionService.getExecution(id);
    if (!execution) {
      throw new ApiError('Execution not found', 404, 'NOT_FOUND');
    }

    const logs = await executionService.getExecutionLogs(id);
    const recipe = await recipeRepository.findById(execution.recipe_id);

    const response: ApiResponse = {
      success: true,
      data: {
        execution: {
          ...execution,
          recipe_name: recipe?.name || 'Unknown',
        },
        logs: logs.map((log) => ({
          id: log.id,
          sequence: log.sequence,
          severity: log.severity,
          message: log.message,
          payload: log.payload,
          created_at: log.created_at,
        })),
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    console.error('[Executions] Error:', error);
    next(error);
  }
});

/**
 * GET /api/executions/:id/logs
 * Get logs for an execution (with optional polling support)
 */
router.get('/:id/logs', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { after } = req.query;

    const afterSequence = after ? Number.parseInt(after as string, 10) : undefined;
    if (afterSequence !== undefined && Number.isNaN(afterSequence)) {
      throw new ApiError('After parameter must be a number', 400, 'VALIDATION_ERROR');
    }

    const logs = await executionService.getExecutionLogs(id, afterSequence);

    const response: ApiResponse = {
      success: true,
      data: {
        logs: logs.map((log) => ({
          id: log.id,
          sequence: log.sequence,
          severity: log.severity,
          message: log.message,
          payload: log.payload,
          created_at: log.created_at,
        })),
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    console.error('[Executions] Error:', error);
    next(error);
  }
});

export default router;
