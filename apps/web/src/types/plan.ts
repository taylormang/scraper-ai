import type { PlanStatus, RunDetail, RunStatus } from '@/types/run';

export interface RecipeSummary {
  id: string;
  site: string;
  baseUrl: string;
  pagination?: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface PlanListItem {
  id: string;
  prompt: string;
  status: PlanStatus;
  site?: string | null;
  baseUrl?: string | null;
  startingUrl?: string | null;
  recipeId?: string | null;
  run?: {
    id: string;
    status: RunStatus;
    createdAt: string;
    completedAt?: string | null;
  } | null;
}

export interface PlanDetail {
  plan: {
    id: string;
    prompt: string;
    status: PlanStatus;
    site?: string | null;
    baseUrl?: string | null;
    startingUrl?: string | null;
    paginationOverrides?: unknown;
  };
  recipe: RecipeSummary | null;
  runs: Array<{
    run: {
      id: string;
      prompt: string;
      status: RunStatus;
      phase: string;
      createdAt: string;
      updatedAt: string;
      completedAt?: string | null;
      summary?: unknown;
      error?: string | null;
    } | null;
    logs: Array<{
      id: string;
      sequence: number;
      message: string;
      severity: string;
      createdAt: string;
    }>;
    executions: Array<{
      id: string;
      status: string;
      engine: string;
      createdAt: string;
    }>;
  }>;
}
