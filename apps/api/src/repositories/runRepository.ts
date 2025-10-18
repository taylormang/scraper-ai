import type {
  RunStatusEnum,
  RunPhaseEnum,
  RunStepStatusEnum,
  RunLogSeverityEnum,
  PlanStatusEnum,
} from '../types/run.js';
import type {
  Run,
  Plan,
  RunStep,
  RunLog,
} from '../db/index.js';

export interface CreateRunParams {
  prompt: string;
  status?: RunStatusEnum;
  phase?: RunPhaseEnum;
  summary?: Record<string, unknown> | null;
}

export interface UpdateRunParams {
  status?: RunStatusEnum;
  phase?: RunPhaseEnum;
  summary?: Record<string, unknown> | null;
  error?: string | null;
  completedAt?: Date | null;
}

export interface CreatePlanParams {
  runId: string;
  prompt: string;
  objective?: string | null;
  baseUrl?: string | null;
  site?: string | null;
  reasoning?: string | null;
  model?: string | null;
  traceId?: string | null;
}

export interface UpdatePlanParams {
  status?: PlanStatusEnum;
  error?: string | null;
  objective?: string | null;
  baseUrl?: string | null;
  site?: string | null;
  prompt?: string;
  reasoning?: string | null;
  sample?: unknown;
  schema?: unknown;
  pagination?: unknown;
  config?: unknown;
  meta?: unknown;
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

export interface RunWithRelations {
  run: Run;
  plan: Plan | null;
  steps: RunStep[];
  logs: RunLog[];
}

export interface RunListItem {
  run: Run;
  plan: Plan | null;
}

export interface RunRepository {
  createRun(params: CreateRunParams): Promise<Run>;
  updateRun(id: string, params: UpdateRunParams): Promise<Run>;
  getRunById(id: string): Promise<Run | null>;
  getRunWithRelations(id: string): Promise<RunWithRelations | null>;
  listRuns(limit?: number): Promise<RunListItem[]>;
  createPlan(params: CreatePlanParams): Promise<Plan>;
  updatePlan(id: string, params: UpdatePlanParams): Promise<Plan>;
  upsertStep(params: CreateStepParams): Promise<RunStep>;
  updateStep(id: string, params: UpdateStepParams): Promise<RunStep>;
  appendLog(params: AppendLogParams): Promise<RunLog>;
  getLogsAfter(runId: string, sequence: number): Promise<RunLog[]>;
  getSteps(runId: string): Promise<RunStep[]>;
}

export type { Run, Plan, RunStep, RunLog };
