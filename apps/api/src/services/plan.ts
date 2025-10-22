import { getRunRepository } from '../repositories/index.js';
import type {
  PlanListEntry,
  RunRepository,
  RunWithRelations,
} from '../repositories/runRepository.js';
import { ExecutionService } from './execution.js';

export class PlanService {
  constructor(
    private readonly repository: RunRepository = getRunRepository(),
    private readonly executionService: ExecutionService = new ExecutionService()
  ) {}

  async listPlans(limit?: number): Promise<PlanListEntry[]> {
    return await this.repository.listPlans(limit ?? 100);
  }

  async getPlanDetail(planId: string) {
    const plan = await this.repository.getPlanById(planId);
    if (!plan) {
      return null;
    }

    const recipe = plan.recipeId
      ? await this.repository.getRecipeById(plan.recipeId)
      : null;

    const runs = await this.repository.listRunsByPlan(plan.id);

    return {
      plan,
      recipe,
      runs,
    };
  }

  async startRunFromPlan(planId: string) {
    const detail = await this.getPlanDetail(planId);
    if (!detail) {
      throw new Error('Plan not found');
    }

    const plan = detail.plan;
    const firecrawlConfig =
      (plan.config as { firecrawl?: unknown } | null)?.firecrawl ?? plan.config;

    if (!firecrawlConfig || typeof firecrawlConfig !== 'object') {
      throw new Error('Plan is missing Firecrawl configuration');
    }

    const run = await this.repository.createRun({
      prompt: plan.prompt,
      planId: plan.id,
      status: 'queued',
      phase: 'execute',
    });

    await this.executionService.startFirecrawlExecution({
      runId: run.id,
      planId: plan.id,
      config: firecrawlConfig as Record<string, unknown>,
      metadata: {
        planId: plan.id,
        recipeId: plan.recipeId ?? null,
      },
      initialSummary:
        (plan.meta as Record<string, unknown> | undefined) ?? undefined,
    });

    const runDetail = await this.repository.getRunWithRelations(run.id);
    if (!runDetail) {
      throw new Error('Run detail missing after execution start');
    }

    return runDetail;
  }
}

export type { PlanService as PlansService };
