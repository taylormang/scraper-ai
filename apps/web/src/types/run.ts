export type RunStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
export type RunPhase = 'plan' | 'execute' | 'store' | 'finalizing';
export type RunStepStatus = 'pending' | 'in_progress' | 'success' | 'error';
export type RunLogSeverity = 'info' | 'warning' | 'error' | 'debug';
export type PlanStatus = 'planning' | 'completed' | 'failed';

export interface RunSummary {
  [key: string]: unknown;
}

export interface RunListItem {
  id: string;
  prompt: string;
  status: RunStatus;
  phase: RunPhase;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  planStatus?: PlanStatus | null;
  site?: string | null;
  startUrl?: string | null;
  objective?: string | null;
  summary?: RunSummary | null;
  error?: string | null;
}

export interface RunPlan {
  id: string;
  runId: string;
  status: PlanStatus;
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
}

export interface RunStep {
  id: string;
  runId: string;
  identifier: string;
  label: string;
  status: RunStepStatus;
  position: number;
  context?: unknown;
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface RunLog {
  id: string;
  runId: string;
  stepId?: string | null;
  sequence: number;
  severity: RunLogSeverity;
  message: string;
  payload?: unknown;
  createdAt: string;
}

export interface RunDetail {
  id: string;
  prompt: string;
  status: RunStatus;
  phase: RunPhase;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  error?: string | null;
  summary?: RunSummary | null;
  plan: RunPlan | null;
  steps: RunStep[];
  logs: RunLog[];
}
