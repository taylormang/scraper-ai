import { Router } from 'express';
import { z } from 'zod';
import { PlanService } from '../services/plan.js';
import { ApiError, type ApiResponse } from '../types/index.js';
import type { Plan, Recipe, Run } from '../db/index.js';
import type { RunWithRelations } from '../repositories/runRepository.js';

const router = Router();
const planService = new PlanService();

const listSchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => {
      if (!value) return undefined;
      const parsed = Number.parseInt(value, 10);
      return Number.isNaN(parsed) ? undefined : Math.max(Math.min(parsed, 200), 1);
    }),
});

router.get('/', async (req, res, next) => {
  try {
    const parsed = listSchema.safeParse(req.query);
    if (!parsed.success) {
      throw new ApiError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR');
    }

    const plans = await planService.listPlans(parsed.data.limit);

    const response: ApiResponse = {
      success: true,
      data: {
        plans: plans.map((item) => ({
          plan: serializePlan(item.plan),
          recipe: serializeRecipe(item.recipe ?? null),
          run: serializeRunSummary(item.run ?? null),
        })),
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const detail = await planService.getPlanDetail(id);
    if (!detail) {
      throw new ApiError('Plan not found', 404, 'NOT_FOUND');
    }

    const response: ApiResponse = {
      success: true,
      data: {
        plan: serializePlan(detail.plan),
        recipe: serializeRecipe(detail.recipe),
        runs: detail.runs.map((run) => serializeRunDetail(run)),
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/run', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await planService.startRunFromPlan(id);
    const response: ApiResponse = {
      success: true,
      data: {
        run: {
          ...serializeRunSummary(result.run),
          steps: result.steps.map((step) => ({
            id: step.id,
            identifier: step.id,
            status: step.status,
          })),
        },
      },
      timestamp: new Date().toISOString(),
    };

    res.status(202).json(response);
  } catch (error) {
    next(error);
  }
});

function serializePlan(plan: Plan) {
  return {
    id: plan.id,
    prompt: plan.prompt,
    status: plan.status,
    error: plan.error ?? null,
    site: plan.site ?? null,
    objective: plan.objective ?? null,
    baseUrl: plan.baseUrl ?? null,
    startingUrl: plan.startingUrl ?? null,
    paginationOverrides: plan.paginationOverrides ?? null,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  };
}

function serializeRecipe(recipe: Recipe | null) {
  if (!recipe) {
    return null;
  }
  return {
    id: recipe.id,
    site: recipe.site,
    baseUrl: recipe.baseUrl,
    pagination: recipe.pagination ?? null,
    createdAt: recipe.createdAt.toISOString(),
    updatedAt: recipe.updatedAt.toISOString(),
  };
}

function serializeRunSummary(run: Run | null) {
  if (!run) return null;
  return {
    id: run.id,
    prompt: run.prompt,
    status: run.status,
    phase: run.phase,
    createdAt: run.createdAt.toISOString(),
    updatedAt: run.updatedAt.toISOString(),
    completedAt: run.completedAt ? run.completedAt.toISOString() : null,
    summary: run.summary ?? null,
    error: run.error ?? null,
  };
}

function serializeRunDetail(run: RunWithRelations) {
  return {
    run: serializeRunSummary(run.run),
    logs: run.logs.map((log) => ({
      id: log.id,
      sequence: Number(log.sequence),
      message: log.message,
      severity: log.severity,
      createdAt: log.createdAt.toISOString(),
    })),
    executions: run.executions.map((execution) => ({
      id: execution.execution.id,
      status: execution.execution.status,
      engine: execution.execution.engine,
      createdAt: execution.execution.createdAt.toISOString(),
    })),
  };
}

export default router;
