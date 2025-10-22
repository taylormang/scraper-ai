import type {
  RunStatusEnum,
  RunPhaseEnum,
  RunStepStatusEnum,
  RunLogSeverityEnum,
  PlanStatusEnum,
  ExecutionStatusEnum,
} from '../types/run.js';
import type {
  Run,
  Plan,
  Recipe,
  RunStep,
  RunLog,
  Execution,
  ExecutionLog,
} from '../db/index.js';

export interface CreateRunParams {
  prompt: string;
  status?: RunStatusEnum;
  phase?: RunPhaseEnum;
  summary?: Record<string, unknown> | null;
  planId?: string | null;
}

export interface UpdateRunParams {
  status?: RunStatusEnum;
  phase?: RunPhaseEnum;
  summary?: Record<string, unknown> | null;
  error?: string | null;
  completedAt?: Date | null;
  planId?: string | null;
}

export interface CreatePlanParams {
  recipeId?: string | null;
  prompt: string;
  objective?: string | null;
  baseUrl?: string | null;
  startingUrl?: string | null;
  site?: string | null;
  reasoning?: string | null;
  model?: string | null;
  traceId?: string | null;
  paginationOverrides?: unknown;
}

export interface UpdatePlanParams {
  status?: PlanStatusEnum;
  error?: string | null;
  objective?: string | null;
  baseUrl?: string | null;
  site?: string | null;
  recipeId?: string | null;
  startingUrl?: string | null;
  prompt?: string;
  reasoning?: string | null;
  sample?: unknown;
  schema?: unknown;
  pagination?: unknown;
  config?: unknown;
  meta?: unknown;
  paginationOverrides?: unknown;
  model?: string | null;
  traceId?: string | null;
}

export interface StepIdentifier {
  runId: string;
  identifier: string;
}

export interface CreateStepParams extends StepIdentifier {
  label: string;
  parentStepId?: string | null;
  position?: number;
}

export interface UpdateStepParams {
  status?: RunStepStatusEnum;
  label?: string;
  context?: Record<string, unknown> | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
}

export interface AppendLogParams {
  runId: string;
  stepId?: string | null;
  message: string;
  severity?: RunLogSeverityEnum;
  payload?: unknown;
}

export interface CreateRecipeParams {
  site: string;
  baseUrl: string;
  pagination?: unknown;
  metadata?: unknown;
}

export interface UpdateRecipeParams {
  site?: string;
  baseUrl?: string;
  pagination?: unknown;
  metadata?: unknown;
}

export interface RunWithRelations {
  run: Run;
  plan: Plan | null;
  recipe: Recipe | null;
  steps: RunStep[];
  logs: RunLog[];
  executions: ExecutionWithLogs[];
}

export interface RunListItem {
  run: Run;
  plan: Plan | null;
  recipe: Recipe | null;
}

export interface ExecutionWithLogs {
  execution: Execution;
  logs: ExecutionLog[];
}

export interface PlanListEntry {
  plan: Plan;
  recipe: Recipe | null;
  run: Run | null;
}

export interface CreateExecutionParams {
  runId: string;
  planId?: string | null;
  engine: string;
  config: unknown;
  metadata?: unknown;
}

export interface UpdateExecutionParams {
  status?: ExecutionStatusEnum;
  result?: unknown;
  error?: string | null;
  metadata?: unknown;
  startedAt?: Date | null;
  completedAt?: Date | null;
}

export interface AppendExecutionLogParams {
  executionId: string;
  runId: string;
  message: string;
  severity?: RunLogSeverityEnum;
  payload?: unknown;
}

export interface RunRepository {
  createRun(params: CreateRunParams): Promise<Run>;
  updateRun(id: string, params: UpdateRunParams): Promise<Run>;
  getRunById(id: string): Promise<Run | null>;
  getRunWithRelations(id: string): Promise<RunWithRelations | null>;
  listRuns(limit?: number): Promise<RunListItem[]>;
  listPlans(limit?: number): Promise<PlanListEntry[]>;
  getPlanById(id: string): Promise<Plan | null>;
  listRunsByPlan(planId: string): Promise<RunWithRelations[]>;
  createPlan(params: CreatePlanParams): Promise<Plan>;
  updatePlan(id: string, params: UpdatePlanParams): Promise<Plan>;
  upsertStep(params: CreateStepParams): Promise<RunStep>;
  updateStep(id: string, params: UpdateStepParams): Promise<RunStep>;
  appendLog(params: AppendLogParams): Promise<RunLog>;
  getLogsAfter(runId: string, sequence: number): Promise<RunLog[]>;
  getSteps(runId: string): Promise<RunStep[]>;
  findRecipeByBaseUrl(baseUrl: string): Promise<Recipe | null>;
  getRecipeById(id: string): Promise<Recipe | null>;
  createRecipe(params: CreateRecipeParams): Promise<Recipe>;
  updateRecipe(id: string, params: UpdateRecipeParams): Promise<Recipe>;
  createExecution(params: CreateExecutionParams): Promise<Execution>;
  updateExecution(id: string, params: UpdateExecutionParams): Promise<Execution>;
  appendExecutionLog(params: AppendExecutionLogParams): Promise<ExecutionLog>;
  getExecutionLogs(executionId: string, after?: number): Promise<ExecutionLog[]>;
  listExecutions(runId: string): Promise<ExecutionWithLogs[]>;
}

export type { Run, Plan, Recipe, RunStep, RunLog, Execution, ExecutionLog };
