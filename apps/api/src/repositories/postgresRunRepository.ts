import { randomUUID } from 'node:crypto';
import { sql, eq, desc, gt, and } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import type { Run, Plan, RunStep, RunLog } from '../db/index.js';
import type {
  RunRepository,
  CreateRunParams,
  UpdateRunParams,
  CreatePlanParams,
  UpdatePlanParams,
  CreateStepParams,
  UpdateStepParams,
  AppendLogParams,
  RunWithRelations,
  RunListItem,
} from './runRepository.js';

export class PostgresRunRepository implements RunRepository {
  constructor(private readonly database = db) {}

  async createRun(params: CreateRunParams): Promise<Run> {
    const now = new Date();
    const id = randomUUID();

    const payload: typeof schema.runs.$inferInsert = {
      id,
      prompt: params.prompt,
      status: params.status ?? 'queued',
      phase: params.phase ?? 'plan',
      summary: params.summary ?? null,
      error: null,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    };

    try {
      const [created] = await this.database
        .insert(schema.runs)
        .values(payload)
        .returning();

      return created;
    } catch (error) {
      console.error('[PostgresRunRepository] Failed to create run', {
        payload,
        errorMessage: (error as Error)?.message,
        cause: (error as { cause?: unknown })?.cause,
      });
      throw error;
    }
  }

  async updateRun(id: string, params: UpdateRunParams): Promise<Run> {
    const updateData: Partial<typeof schema.runs.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (params.status) {
      updateData.status = params.status;
    }
    if (params.phase) {
      updateData.phase = params.phase;
    }
    if (params.summary !== undefined) {
      updateData.summary = params.summary ?? null;
    }
    if (params.error !== undefined) {
      updateData.error = params.error ?? null;
    }
    if (params.completedAt !== undefined) {
      updateData.completedAt = params.completedAt ?? null;
    }

    const [updated] = await this.database
      .update(schema.runs)
      .set(updateData)
      .where(eq(schema.runs.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Run ${id} not found`);
    }

    return updated;
  }

  async getRunById(id: string): Promise<Run | null> {
    const [run] = await this.database
      .select()
      .from(schema.runs)
      .where(eq(schema.runs.id, id))
      .limit(1);

    return run ?? null;
  }

  async getRunWithRelations(id: string): Promise<RunWithRelations | null> {
    const run = await this.getRunById(id);
    if (!run) {
      return null;
    }

    const [plan] = await this.database
      .select()
      .from(schema.plans)
      .where(eq(schema.plans.runId, id))
      .limit(1);

    const steps = await this.getSteps(id);
    const logs = await this.database
      .select()
      .from(schema.runLogs)
      .where(eq(schema.runLogs.runId, id))
      .orderBy(schema.runLogs.sequence);

    return {
      run,
      plan: plan ?? null,
      steps,
      logs,
    };
  }

  async listRuns(limit = 50): Promise<RunListItem[]> {
    const rows = await this.database
      .select({
        run: schema.runs,
        plan: schema.plans,
      })
      .from(schema.runs)
      .leftJoin(schema.plans, eq(schema.plans.runId, schema.runs.id))
      .orderBy(desc(schema.runs.createdAt))
      .limit(limit);

    return rows.map((row) => ({
      run: row.run,
      plan: row.plan ?? null,
    }));
  }

  async createPlan(params: CreatePlanParams): Promise<Plan> {
    const now = new Date();
    const [plan] = await this.database
      .insert(schema.plans)
      .values({
        id: randomUUID(),
        runId: params.runId,
        status: 'planning',
        error: null,
        prompt: params.prompt,
        site: params.site ?? null,
        objective: params.objective ?? null,
        baseUrl: params.baseUrl ?? null,
        reasoning: params.reasoning ?? null,
        sample: null,
        schema: null,
        pagination: null,
        config: null,
        meta: null,
        model: params.model ?? null,
        traceId: params.traceId ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return plan;
  }

  async updatePlan(
    id: string,
    params: UpdatePlanParams
  ): Promise<Plan> {
    const updateData: Partial<typeof schema.plans.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (params.status) {
      updateData.status = params.status;
    }
    if (params.error !== undefined) {
      updateData.error = params.error ?? null;
    }
    if (params.prompt !== undefined) {
      updateData.prompt = params.prompt;
    }
    if (params.objective !== undefined) {
      updateData.objective = params.objective ?? null;
    }
    if (params.baseUrl !== undefined) {
      updateData.baseUrl = params.baseUrl ?? null;
    }
    if (params.site !== undefined) {
      updateData.site = params.site ?? null;
    }
    if (params.reasoning !== undefined) {
      updateData.reasoning = params.reasoning ?? null;
    }
    if (params.sample !== undefined) {
      updateData.sample = params.sample as Record<string, unknown> | null;
    }
    if (params.schema !== undefined) {
      updateData.schema = params.schema as Record<string, unknown> | null;
    }
    if (params.pagination !== undefined) {
      updateData.pagination =
        params.pagination as Record<string, unknown> | null;
    }
    if (params.config !== undefined) {
      updateData.config = params.config as Record<string, unknown> | null;
    }
    if (params.meta !== undefined) {
      updateData.meta = params.meta as Record<string, unknown> | null;
    }
    if (params.model !== undefined) {
      updateData.model = params.model ?? null;
    }
    if (params.traceId !== undefined) {
      updateData.traceId = params.traceId ?? null;
    }

    const [updated] = await this.database
      .update(schema.plans)
      .set(updateData)
      .where(eq(schema.plans.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Plan ${id} not found`);
    }

    return updated;
  }

  async upsertStep(params: CreateStepParams): Promise<RunStep> {
    const now = new Date();
    const [step] = await this.database
      .insert(schema.runSteps)
      .values({
        id: randomUUID(),
        runId: params.runId,
        identifier: params.identifier,
        label: params.label,
        parentStepId: params.parentStepId ?? null,
        position: params.position ?? 0,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [schema.runSteps.runId, schema.runSteps.identifier],
        set: {
          label: params.label,
          parentStepId: params.parentStepId ?? null,
          position: params.position ?? 0,
          updatedAt: now,
        },
      })
      .returning();

    return step;
  }

  async updateStep(id: string, params: UpdateStepParams): Promise<RunStep> {
    const updateData: Partial<typeof schema.runSteps.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (params.status) {
      updateData.status = params.status;
    }
    if (params.label !== undefined) {
      updateData.label = params.label;
    }
    if (params.context !== undefined) {
      updateData.context = params.context ?? null;
    }
    if (params.startedAt !== undefined) {
      updateData.startedAt = params.startedAt ?? null;
    }
    if (params.completedAt !== undefined) {
      updateData.completedAt = params.completedAt ?? null;
    }

    const [updated] = await this.database
      .update(schema.runSteps)
      .set(updateData)
      .where(eq(schema.runSteps.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Step ${id} not found`);
    }

    return updated;
  }

  async appendLog(params: AppendLogParams): Promise<RunLog> {
    const [next] = await this.database
      .select({
        value: sql<number>`COALESCE(MAX(${schema.runLogs.sequence}), 0) + 1`,
      })
      .from(schema.runLogs)
      .where(eq(schema.runLogs.runId, params.runId));

    const sequence = next?.value ?? 1;

    const [log] = await this.database
      .insert(schema.runLogs)
      .values({
        id: randomUUID(),
        runId: params.runId,
        stepId: params.stepId ?? null,
        sequence,
        severity: params.severity ?? 'info',
        message: params.message,
        payload:
          params.payload === undefined ? null : (params.payload as unknown),
        createdAt: new Date(),
      })
      .returning();

    return log;
  }

  async getLogsAfter(runId: string, sequence: number): Promise<RunLog[]> {
    return await this.database
      .select()
      .from(schema.runLogs)
      .where(
        and(
          eq(schema.runLogs.runId, runId),
          gt(schema.runLogs.sequence, sequence)
        )
      )
      .orderBy(schema.runLogs.sequence);
  }

  async getSteps(runId: string): Promise<RunStep[]> {
    return await this.database
      .select()
      .from(schema.runSteps)
      .where(eq(schema.runSteps.runId, runId))
      .orderBy(schema.runSteps.position, schema.runSteps.createdAt);
  }
}
