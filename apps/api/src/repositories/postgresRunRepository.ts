import { randomUUID } from 'node:crypto';
import { sql, eq, desc, gt, and, inArray } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import type {
  Run,
  Plan,
  Recipe,
  RunStep,
  RunLog,
  Execution,
  ExecutionLog,
} from '../db/index.js';
import type {
  RunRepository,
  CreateRunParams,
  UpdateRunParams,
  CreatePlanParams,
  UpdatePlanParams,
  CreateStepParams,
  UpdateStepParams,
  AppendLogParams,
  CreateRecipeParams,
  UpdateRecipeParams,
  RunWithRelations,
  RunListItem,
  PlanListEntry,
  CreateExecutionParams,
  UpdateExecutionParams,
  AppendExecutionLogParams,
  ExecutionWithLogs,
} from './runRepository.js';

export class PostgresRunRepository implements RunRepository {
  constructor(private readonly database = db) {}

  async createRun(params: CreateRunParams): Promise<Run> {
    const now = new Date();
    const id = randomUUID();

    const payload: typeof schema.runs.$inferInsert = {
      id,
      planId: params.planId ?? null,
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
    if (params.planId !== undefined) {
      updateData.planId = params.planId ?? null;
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

    const plan = run.planId
      ? await this.database
          .select()
          .from(schema.plans)
          .where(eq(schema.plans.id, run.planId))
          .limit(1)
          .then((rows) => rows[0] ?? null)
      : null;

    const steps = await this.getSteps(id);
    const logs = await this.database
      .select()
      .from(schema.runLogs)
      .where(eq(schema.runLogs.runId, id))
      .orderBy(schema.runLogs.sequence);

    const recipe = plan?.recipeId
      ? await this.database
          .select()
          .from(schema.recipes)
          .where(eq(schema.recipes.id, plan.recipeId))
          .limit(1)
          .then((rows) => rows[0] ?? null)
      : null;

    const executions = await this.listExecutions(id);

    return {
      run,
      plan: plan ?? null,
      recipe,
      steps,
      logs,
      executions,
    };
  }

  async listRuns(limit = 50): Promise<RunListItem[]> {
    const rows = await this.database
      .select({
        run: schema.runs,
        plan: schema.plans,
        recipe: schema.recipes,
      })
      .from(schema.runs)
      .leftJoin(schema.plans, eq(schema.plans.id, schema.runs.planId))
      .leftJoin(schema.recipes, eq(schema.recipes.id, schema.plans.recipeId))
      .orderBy(desc(schema.runs.createdAt))
      .limit(limit);

    return rows.map((row) => ({
      run: row.run,
      plan: row.plan ?? null,
      recipe: row.recipe ?? null,
    }));
  }

  async listPlans(limit = 50): Promise<PlanListEntry[]> {
    const plans = await this.database
      .select()
      .from(schema.plans)
      .orderBy(desc(schema.plans.createdAt))
      .limit(limit);

    if (plans.length === 0) {
      return [];
    }

    const planIds = plans.map((plan) => plan.id);

    const recipeIds = plans
      .map((plan) => plan.recipeId)
      .filter((id): id is string => Boolean(id));

    const recipeMap = new Map<string, Recipe>();
    if (recipeIds.length > 0) {
      const recipes = await this.database
        .select()
        .from(schema.recipes)
        .where(inArray(schema.recipes.id, recipeIds));
      for (const recipe of recipes) {
        recipeMap.set(recipe.id, recipe);
      }
    }

    const runs = await this.database
      .select()
      .from(schema.runs)
      .where(inArray(schema.runs.planId, planIds))
      .orderBy(desc(schema.runs.createdAt));

    const latestRunByPlan = new Map<string, typeof schema.runs.$inferSelect>();
    for (const run of runs) {
      if (!latestRunByPlan.has(run.planId ?? '')) {
        latestRunByPlan.set(run.planId ?? '', run);
      }
    }

    return plans.map((plan) => ({
      plan,
      recipe: plan.recipeId ? recipeMap.get(plan.recipeId) ?? null : null,
      run: plan.id ? latestRunByPlan.get(plan.id) ?? null : null,
    }));
  }

  async getPlanById(id: string): Promise<Plan | null> {
    const [plan] = await this.database
      .select()
      .from(schema.plans)
      .where(eq(schema.plans.id, id))
      .limit(1);

    return plan ?? null;
  }

  async createPlan(params: CreatePlanParams): Promise<Plan> {
    const now = new Date();
    const [plan] = await this.database
      .insert(schema.plans)
      .values({
        id: randomUUID(),
        recipeId: params.recipeId ?? null,
        status: 'planning',
        error: null,
        prompt: params.prompt,
        site: params.site ?? null,
        objective: params.objective ?? null,
        baseUrl: params.baseUrl ?? null,
        startingUrl: params.startingUrl ?? params.baseUrl ?? null,
        reasoning: params.reasoning ?? null,
        sample: null,
        schema: null,
        pagination: null,
        config: null,
        meta: null,
        paginationOverrides:
          (params.paginationOverrides as Record<string, unknown> | undefined) ?? null,
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
    if (params.recipeId !== undefined) {
      updateData.recipeId = params.recipeId ?? null;
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
    if (params.startingUrl !== undefined) {
      updateData.startingUrl = params.startingUrl ?? null;
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
    if (params.paginationOverrides !== undefined) {
      updateData.paginationOverrides =
        (params.paginationOverrides as Record<string, unknown> | undefined) ?? null;
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

  async findRecipeByBaseUrl(baseUrl: string): Promise<Recipe | null> {
    const [recipe] = await this.database
      .select()
      .from(schema.recipes)
      .where(eq(schema.recipes.baseUrl, baseUrl))
      .limit(1);

    return recipe ?? null;
  }

  async getRecipeById(id: string): Promise<Recipe | null> {
    const [recipe] = await this.database
      .select()
      .from(schema.recipes)
      .where(eq(schema.recipes.id, id))
      .limit(1);

    return recipe ?? null;
  }

  async createRecipe(params: CreateRecipeParams): Promise<Recipe> {
    const now = new Date();
    try {
      const [recipe] = await this.database
        .insert(schema.recipes)
        .values({
          id: randomUUID(),
          site: params.site,
          baseUrl: params.baseUrl,
          pagination:
            (params.pagination as Record<string, unknown> | undefined) ?? null,
          metadata:
            (params.metadata as Record<string, unknown> | undefined) ?? null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return recipe;
    } catch (error) {
      if (
        error instanceof Error &&
        typeof (error as { code?: string }).code === 'string' &&
        (error as { code?: string }).code === '23505'
      ) {
        const existing = await this.findRecipeByBaseUrl(params.baseUrl);
        if (existing) {
          return existing;
        }
      }
      throw error;
    }
  }

  async updateRecipe(id: string, params: UpdateRecipeParams): Promise<Recipe> {
    const updateData: Partial<typeof schema.recipes.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (params.site !== undefined) {
      updateData.site = params.site ?? null;
    }
    if (params.baseUrl !== undefined) {
      updateData.baseUrl = params.baseUrl ?? null;
    }
    if (params.pagination !== undefined) {
      updateData.pagination =
        (params.pagination as Record<string, unknown> | undefined) ?? null;
    }
    if (params.metadata !== undefined) {
      updateData.metadata =
        (params.metadata as Record<string, unknown> | undefined) ?? null;
    }

    const [updated] = await this.database
      .update(schema.recipes)
      .set(updateData)
      .where(eq(schema.recipes.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Recipe ${id} not found`);
    }

    return updated;
  }

  async createExecution(params: CreateExecutionParams): Promise<Execution> {
    const now = new Date();
    const [execution] = await this.database
      .insert(schema.executions)
      .values({
        id: randomUUID(),
        runId: params.runId,
        planId: params.planId ?? null,
        engine: params.engine,
        status: 'queued',
        config: params.config as Record<string, unknown>,
        metadata: (params.metadata as Record<string, unknown>) ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return execution;
  }

  async updateExecution(id: string, params: UpdateExecutionParams): Promise<Execution> {
    const updateData: Partial<typeof schema.executions.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (params.status) {
      updateData.status = params.status;
    }
    if (params.result !== undefined) {
      updateData.result = (params.result as Record<string, unknown>) ?? null;
    }
    if (params.error !== undefined) {
      updateData.error = params.error ?? null;
    }
    if (params.metadata !== undefined) {
      updateData.metadata = (params.metadata as Record<string, unknown>) ?? null;
    }
    if (params.startedAt !== undefined) {
      updateData.startedAt = params.startedAt ?? null;
    }
    if (params.completedAt !== undefined) {
      updateData.completedAt = params.completedAt ?? null;
    }

    const [updated] = await this.database
      .update(schema.executions)
      .set(updateData)
      .where(eq(schema.executions.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Execution ${id} not found`);
    }

    return updated;
  }

  async appendExecutionLog(params: AppendExecutionLogParams): Promise<ExecutionLog> {
    const [next] = await this.database
      .select({
        value: sql<number>`COALESCE(MAX(${schema.executionLogs.sequence}), 0) + 1`,
      })
      .from(schema.executionLogs)
      .where(eq(schema.executionLogs.executionId, params.executionId));

    const sequence = next?.value ?? 1;
    const [log] = await this.database
      .insert(schema.executionLogs)
      .values({
        id: randomUUID(),
        executionId: params.executionId,
        runId: params.runId,
        sequence,
        severity: params.severity ?? 'info',
        message: params.message,
        payload:
          params.payload === undefined ? null : (params.payload as Record<string, unknown>),
        createdAt: new Date(),
      })
      .returning();

    return log;
  }

  async getExecutionLogs(executionId: string, after = 0): Promise<ExecutionLog[]> {
    return await this.database
      .select()
      .from(schema.executionLogs)
      .where(
        and(
          eq(schema.executionLogs.executionId, executionId),
          gt(schema.executionLogs.sequence, after)
        )
      )
      .orderBy(schema.executionLogs.sequence);
  }

  async listExecutions(runId: string): Promise<ExecutionWithLogs[]> {
    const executions = await this.database
      .select()
      .from(schema.executions)
      .where(eq(schema.executions.runId, runId))
      .orderBy(desc(schema.executions.createdAt));

    if (!executions.length) {
      return [];
    }

    const logs = await this.database
      .select()
      .from(schema.executionLogs)
      .where(eq(schema.executionLogs.runId, runId))
      .orderBy(schema.executionLogs.sequence);

    const logMap = new Map<string, ExecutionLog[]>();
    for (const log of logs) {
      if (!logMap.has(log.executionId)) {
        logMap.set(log.executionId, []);
      }
      logMap.get(log.executionId)!.push(log);
    }

    return executions.map((execution) => ({
      execution,
      logs: logMap.get(execution.id) ?? [],
    }));
  }

  async listRunsByPlan(planId: string): Promise<RunWithRelations[]> {
    const rows = await this.database
      .select({ run: schema.runs })
      .from(schema.runs)
      .where(eq(schema.runs.planId, planId))
      .orderBy(desc(schema.runs.createdAt));

    const results: RunWithRelations[] = [];
    for (const row of rows) {
      const detail = await this.getRunWithRelations(row.run.id);
      if (detail) {
        results.push(detail);
      }
    }
    return results;
  }
}
