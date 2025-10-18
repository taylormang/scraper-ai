export type RunStatusEnum =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type RunPhaseEnum = 'plan' | 'execute' | 'store' | 'finalizing';

export type RunStepStatusEnum =
  | 'pending'
  | 'in_progress'
  | 'success'
  | 'error';

export type RunLogSeverityEnum = 'info' | 'warning' | 'error' | 'debug';

export type PlanStatusEnum = 'planning' | 'completed' | 'failed';

export interface RunSummary {
  [key: string]: unknown;
}

export interface RunListResponseItem {
  id: string;
  prompt: string;
  status: RunStatusEnum;
  phase: RunPhaseEnum;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  planStatus?: PlanStatusEnum | null;
  site?: string | null;
  startUrl?: string | null;
  objective?: string | null;
  runSummary?: RunSummary | null;
}

export interface RunDetailStep {
  id: string;
  identifier: string;
  label: string;
  status: RunStepStatusEnum;
  startedAt?: string | null;
  completedAt?: string | null;
  context?: unknown;
  position: number;
}

export interface RunDetailLog {
  id: string;
  stepId?: string | null;
  sequence: number;
  severity: RunLogSeverityEnum;
  message: string;
  payload?: unknown;
  createdAt: string;
}

export interface RunDetailResponse {
  id: string;
  prompt: string;
  status: RunStatusEnum;
  phase: RunPhaseEnum;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  error?: string | null;
  summary?: RunSummary | null;
  plan?: {
    id: string;
    status: PlanStatusEnum;
    error?: string | null;
    prompt: string;
    site?: string | null;
    objective?: string | null;
    baseUrl?: string | null;
    reasoning?: string | null;
    sample?: unknown;
    schema?: unknown;
    pagination?: unknown;
    config?: unknown;
    meta?: unknown;
    model?: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  steps: RunDetailStep[];
  logs: RunDetailLog[];
}
