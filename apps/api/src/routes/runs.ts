import { Router, type Response } from 'express';
import { z } from 'zod';
import { RunPreparationService } from '../services/runPreparation.js';
import { runEventBus } from '../services/runEvents.js';
import type { Run, Plan, RunStep, RunLog } from '../db/index.js';
import { ApiError, type ApiResponse } from '../types/index.js';

const router = Router();
const runService = new RunPreparationService();

const createRunSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
});

const listRunsSchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => {
      if (!value) return undefined;
      const parsed = Number.parseInt(value, 10);
      return Number.isNaN(parsed) ? undefined : Math.max(Math.min(parsed, 200), 1);
    }),
});

router.post('/', async (req, res, next) => {
  try {
    const parsed = createRunSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR');
    }

    const { run, steps } = await runService.createRun(parsed.data.prompt);

    const response: ApiResponse = {
      success: true,
      data: {
        run: serializeRun(run),
        steps: steps.map(serializeStep),
      },
      timestamp: new Date().toISOString(),
    };

    res.status(202).json(response);
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const parsed = listRunsSchema.safeParse(req.query);
    if (!parsed.success) {
      throw new ApiError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR');
    }

    const rows = await runService.listRuns(parsed.data.limit);

    const response: ApiResponse = {
      success: true,
      data: {
        runs: rows.map((row) => ({
          ...serializeRun(row.run),
          planStatus: row.plan?.status ?? null,
          site: row.plan?.site ?? null,
          startUrl:
            (row.plan?.pagination as { start_url?: string } | null | undefined)?.start_url ??
            row.plan?.baseUrl ?? null,
          objective: row.plan?.objective ?? null,
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
    const record = await runService.getRunWithDetails(id);

    if (!record) {
      throw new ApiError('Run not found', 404, 'NOT_FOUND');
    }

    const response: ApiResponse = {
      success: true,
      data: serializeRunDetail(record.run, record.plan, record.steps, record.logs),
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/logs', async (req, res, next) => {
  try {
    const { id } = req.params;
    const after = Number.parseInt((req.query.after as string) ?? '0', 10);

    if (Number.isNaN(after) || after < 0) {
      throw new ApiError('Query parameter "after" must be a non-negative integer', 400, 'VALIDATION_ERROR');
    }

    const logs = await runService.getLogsAfter(id, after);

    const response: ApiResponse = {
      success: true,
      data: {
        logs: logs.map(serializeLog),
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/stream', async (req, res, next) => {
  try {
    const { id } = req.params;
    const run = await runService.getRunWithDetails(id);

    if (!run) {
      throw new ApiError('Run not found', 404, 'NOT_FOUND');
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const initialPayload = serializeRunDetail(run.run, run.plan, run.steps, run.logs);
    writeEvent(res, 'run.snapshot', initialPayload);

    const sendHeartbeat = () => res.write(':heartbeat\n\n');
    const heartbeatInterval = setInterval(sendHeartbeat, 25_000);

    const unsubscribe = runEventBus.subscribe(id, (event) => {
      switch (event.type) {
        case 'run.updated':
          writeEvent(res, 'run.updated', serializeRun(event.run));
          break;
        case 'run.plan.updated':
          writeEvent(res, 'run.plan', serializePlan(event.plan));
          break;
        case 'run.step.updated':
          writeEvent(res, 'run.step', serializeStep(event.step));
          break;
        case 'run.log.appended':
          writeEvent(res, 'run.log', serializeLog(event.log), String(event.log.sequence));
          break;
        default:
          break;
      }
    });

    req.on('close', () => {
      clearInterval(heartbeatInterval);
      unsubscribe();
    });
  } catch (error) {
    next(error);
  }
});

function serializeRun(run: Run) {
  return {
    id: run.id,
    prompt: run.prompt,
    status: run.status,
    phase: run.phase,
    summary: run.summary ?? null,
    error: run.error ?? null,
    createdAt: run.createdAt.toISOString(),
    updatedAt: run.updatedAt.toISOString(),
    completedAt: run.completedAt ? run.completedAt.toISOString() : null,
  };
}

function serializePlan(plan: Plan | null) {
  if (!plan) {
    return null;
  }

  return {
    id: plan.id,
    runId: plan.runId,
    status: plan.status,
    error: plan.error ?? null,
    prompt: plan.prompt,
    site: plan.site ?? null,
    objective: plan.objective ?? null,
    baseUrl: plan.baseUrl ?? null,
    reasoning: plan.reasoning ?? null,
    sample: plan.sample ?? null,
    schema: plan.schema ?? null,
    pagination: plan.pagination ?? null,
    config: plan.config ?? null,
    meta: plan.meta ?? null,
    model: plan.model ?? null,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  };
}

function serializeStep(step: RunStep) {
  return {
    id: step.id,
    runId: step.runId,
    identifier: step.identifier,
    label: step.label,
    status: step.status,
    position: step.position,
    context: step.context ?? null,
    startedAt: step.startedAt ? step.startedAt.toISOString() : null,
    completedAt: step.completedAt ? step.completedAt.toISOString() : null,
  };
}

function serializeLog(log: RunLog) {
  return {
    id: log.id,
    runId: log.runId,
    stepId: log.stepId ?? null,
    sequence: Number(log.sequence),
    severity: log.severity,
    message: log.message,
    payload: log.payload ?? null,
    createdAt: log.createdAt.toISOString(),
  };
}

function serializeRunDetail(
  run: Run,
  plan: Plan | null,
  steps: RunStep[],
  logs: RunLog[]
) {
  return {
    ...serializeRun(run),
    plan: serializePlan(plan),
    steps: steps.map(serializeStep),
    logs: logs.map(serializeLog),
  };
}

function writeEvent(res: Response, event: string, payload: unknown, id?: string) {
  if (id) {
    res.write(`id: ${id}\n`);
  }
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export default router;
