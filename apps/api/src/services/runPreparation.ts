import type { Run, Plan, Recipe, RunStep, RunLog } from '../db/index.js';
import { getRunRepository } from '../repositories/index.js';
import type { RunRepository, UpdatePlanParams } from '../repositories/runRepository.js';
import { PlannerService } from './planner.js';
import { ReconService, type ReconOutput } from './recon.js';
import { PaginationInferenceService } from './pagination.js';
import { ExtractionSchemaService } from './extraction.js';
import { JobAssemblyService } from './jobAssembly.js';
import { ExecutionService } from './execution.js';
import { runEventBus } from './runEvents.js';
import type {
  RunLogSeverityEnum,
  RunSummary,
} from '../types/run.js';
import type { PlanResponse } from '../types/planner.js';
import type { PaginationInferenceResponse } from '../types/pagination.js';
import type { ExtractionSchemaResponse } from '../types/extraction.js';
import type { JobAssemblyResponse } from '../types/job.js';

const STEP_BLUEPRINT = [
  { identifier: 'plan.summary', label: 'Plan Summary', position: 1, parent: null as string | null },
  { identifier: 'plan.recon', label: 'Recon', position: 2, parent: 'plan.summary' },
  { identifier: 'plan.pagination', label: 'Pagination', position: 3, parent: 'plan.summary' },
  { identifier: 'plan.extraction', label: 'Extraction', position: 4, parent: 'plan.summary' },
  { identifier: 'plan.job', label: 'Job Assembly', position: 5, parent: 'plan.summary' },
] as const;

interface StepContextMap {
  [identifier: string]: RunStep;
}

export interface CreateRunResult {
  run: Run;
  steps: RunStep[];
}

export class RunPreparationService {
  constructor(
    private readonly runRepository: RunRepository = getRunRepository(),
    private readonly planner: PlannerService = new PlannerService(),
    private readonly recon: ReconService = new ReconService(),
    private readonly pagination: PaginationInferenceService = new PaginationInferenceService(),
    private readonly extraction: ExtractionSchemaService = new ExtractionSchemaService(),
    private readonly jobAssembly: JobAssemblyService = new JobAssemblyService(),
    private readonly executionService: ExecutionService = new ExecutionService()
  ) {}

  async createRun(prompt: string): Promise<CreateRunResult> {
    if (!prompt || !prompt.trim()) {
      throw new Error('Prompt is required');
    }

    const run = await this.runRepository.createRun({
      prompt: prompt.trim(),
      status: 'queued',
      phase: 'plan',
    });

    const steps = await this.ensurePlanSteps(run.id);
    runEventBus.publish(run.id, { type: 'run.updated', run });
    steps.forEach((step) => {
      runEventBus.publish(run.id, { type: 'run.step.updated', step });
    });

    setImmediate(() => {
      this.processRun(run.id, prompt.trim()).catch((error) => {
        console.error('[RunPreparationService] Unhandled run error', error);
      });
    });

    return {
      run,
      steps,
    };
  }

  async getRun(id: string): Promise<Run | null> {
    return this.runRepository.getRunById(id);
  }

  async getRunWithDetails(id: string) {
    return this.runRepository.getRunWithRelations(id);
  }

  async listRuns(limit?: number) {
    return this.runRepository.listRuns(limit);
  }

  async getLogsAfter(runId: string, sequence: number): Promise<RunLog[]> {
    return this.runRepository.getLogsAfter(runId, sequence);
  }

  private async ensurePlanSteps(runId: string): Promise<RunStep[]> {
    const cache = new Map<string, RunStep>();

    for (const blueprint of STEP_BLUEPRINT) {
      const parentStep = blueprint.parent
        ? cache.get(blueprint.parent)
        : null;

      const step = await this.runRepository.upsertStep({
        runId,
        identifier: blueprint.identifier,
        label: blueprint.label,
        parentStepId: parentStep?.id ?? null,
        position: blueprint.position,
      });

      cache.set(blueprint.identifier, step);
    }

    return Array.from(cache.values()).sort((a, b) => a.position - b.position);
  }

  private async processRun(runId: string, prompt: string): Promise<void> {
    const stepIndex = await this.buildStepIndex(runId);

    const deriveSite = (value?: string | null): string | null => {
      if (!value) {
        return null;
      }
      try {
        const parsed = new URL(value);
        return parsed.hostname || null;
      } catch {
        return null;
      }
    };

    const normalizeBaseUrl = (value?: string | null): string | null => {
      if (!value) {
        return null;
      }
      try {
        const parsed = new URL(value);
        parsed.search = '';
        parsed.hash = '';
        const normalized = parsed.toString();
        return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
      } catch {
        return null;
      }
    };

    const publishRun = async (run: Run) => {
      runEventBus.publish(runId, { type: 'run.updated', run });
    };

    const publishStep = (step: RunStep) => {
      stepIndex[step.identifier] = step;
      runEventBus.publish(runId, { type: 'run.step.updated', step });
    };

    const appendLog = async (
      identifier: string | null,
      message: string,
      payload?: unknown,
      severity: RunLogSeverityEnum = 'info'
    ): Promise<RunLog> => {
      let stepId: string | undefined;

      if (identifier) {
        const target = stepIndex[identifier];
        if (!target) {
          throw new Error(`Unknown step identifier: ${identifier}`);
        }
        await startStep(identifier);
        stepId = target.id;
      }

      const log = await this.runRepository.appendLog({
        runId,
        stepId,
        message,
        severity,
        payload,
      });

      runEventBus.publish(runId, { type: 'run.log.appended', log });
      return log;
    };

    const startStep = async (identifier: string): Promise<RunStep> => {
      const step = stepIndex[identifier];
      if (!step) {
        throw new Error(`Unknown step identifier: ${identifier}`);
      }

      if (step.status !== 'pending') {
        return step;
      }

      const updatePayload: Parameters<RunRepository['updateStep']>[1] = {
        status: 'in_progress',
        startedAt: step.startedAt ? undefined : new Date(),
      };

      const updated = await this.runRepository.updateStep(step.id, updatePayload);
      publishStep(updated);
      return updated;
    };

    const completeStep = async (
      identifier: string,
      status: 'success' | 'error',
      context?: unknown
    ): Promise<RunStep> => {
      const step = stepIndex[identifier];
      if (!step) {
        throw new Error(`Unknown step identifier: ${identifier}`);
      }

      const updatePayload: Parameters<RunRepository['updateStep']>[1] = {
        status,
        completedAt: new Date(),
      };

      if (!step.startedAt) {
        updatePayload.startedAt = new Date();
      }

      if (context !== undefined) {
        updatePayload.context = context as Record<string, unknown>;
      }

      const updated = await this.runRepository.updateStep(step.id, updatePayload);
      publishStep(updated);
      return updated;
    };

    let runClosed = false;
    const finalizeRun = async (
      status: 'completed' | 'failed',
      params: {
        summary?: RunSummary | null;
        errorMessage?: string | null;
      } = {}
    ): Promise<Run> => {
      if (runClosed) {
        const current = await this.runRepository.getRunById(runId);
        if (!current) {
          throw new Error(`Run ${runId} not found during finalize`);
        }
        return current;
      }

      runClosed = true;

      const updated = await this.runRepository.updateRun(runId, {
        status,
        phase: 'plan',
        summary: params.summary ?? null,
        error: params.errorMessage ?? null,
        completedAt: new Date(),
      });

      await publishRun(updated);
      return updated;
    };

    const run = await this.runRepository.updateRun(runId, {
      status: 'running',
      phase: 'plan',
    });
    await publishRun(run);

    let planResponse: PlanResponse | null = null;
    let planRecord: Plan | null = null;
    let recipeRecord: Recipe | null = null;
    let reconOutput: ReconOutput | null = null;
    let paginationOutput: PaginationInferenceResponse | null = null;
    let extractionOutput: ExtractionSchemaResponse | null = null;
    let jobOutput: JobAssemblyResponse | null = null;

    const applyPlanUpdate = async (changes: UpdatePlanParams) => {
      if (!planRecord) {
        return;
      }
      planRecord = await this.runRepository.updatePlan(planRecord.id, changes);
      runEventBus.publish(runId, {
        type: 'run.plan.updated',
        plan: planRecord,
      });
    };

    try {
      await startStep('plan.summary');
      await appendLog('plan.summary', 'Submitting prompt to planner service', { prompt });

      planResponse = await this.planner.generatePlan(prompt);

      await appendLog('plan.summary', 'Planner generated structured plan', {
        baseUrl: planResponse.plan.baseUrl,
        extractionFields: planResponse.plan.extractionFields.length,
        paginationStrategy: planResponse.plan.pagination.strategy,
        confidence: planResponse.plan.confidence,
      });

      const normalizedBaseUrl = normalizeBaseUrl(planResponse.plan.baseUrl);
      const recipeSite =
        deriveSite(normalizedBaseUrl) ??
        deriveSite(planResponse.plan.baseUrl) ??
        'unknown';

      if (normalizedBaseUrl) {
        recipeRecord =
          (await this.runRepository.findRecipeByBaseUrl(normalizedBaseUrl)) ??
          (await this.runRepository.createRecipe({
            site: recipeSite,
            baseUrl: normalizedBaseUrl,
          }));
      }

      planRecord = await this.runRepository.createPlan({
        recipeId: recipeRecord?.id ?? null,
        prompt,
        objective: planResponse.plan.objective,
        baseUrl: planResponse.plan.baseUrl,
        startingUrl: planResponse.plan.baseUrl,
        site: deriveSite(planResponse.plan.baseUrl) ?? recipeSite,
        reasoning: planResponse.reasoning,
        model: 'gpt-4o-mini',
        paginationOverrides: planResponse.plan.pagination,
      });

      await this.runRepository.updateRun(runId, {
        planId: planRecord.id,
      });

      runEventBus.publish(runId, {
        type: 'run.plan.updated',
        plan: planRecord,
      });

      await completeStep('plan.summary', 'success', {
        planId: planRecord.id,
        baseUrl: planResponse.plan.baseUrl,
        extractionFields: planResponse.plan.extractionFields,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Planner request failed';
      await appendLog('plan.summary', 'Planner request failed', { error: message }, 'error');
      await completeStep('plan.summary', 'error', { message });
      await applyPlanUpdate({
        status: 'failed',
        error: message,
      });
      await finalizeRun('failed', {
        errorMessage: message,
      });
      return;
    }

    if (!planResponse.plan.baseUrl) {
      const message = 'Planner did not provide a base URL';
      await appendLog(
        'plan.recon',
        'Recon skipped: planner did not provide a base URL',
        { objective: planResponse.plan.objective },
        'warning'
      );
      await completeStep('plan.recon', 'error', { reason: message });

      await applyPlanUpdate({
        status: 'failed',
        error: message,
      });

      await appendLog(
        'plan.pagination',
        'Pagination skipped: recon never executed',
        { reason: message },
        'warning'
      );
      await completeStep('plan.pagination', 'error', { reason: message });

      await appendLog(
        'plan.extraction',
        'Extraction skipped: planner did not provide a base URL',
        { reason: message },
        'warning'
      );
      await completeStep('plan.extraction', 'error', { reason: message });

      await appendLog(
        'plan.job',
        'Job assembly skipped: planner missing base URL',
        { reason: message },
        'warning'
      );
      await completeStep('plan.job', 'error', { reason: message });

      await finalizeRun('failed', {
        errorMessage: message,
      });
      return;
    }

    try {
      await startStep('plan.recon');
      await appendLog('plan.recon', 'Fetching the first page', {
        url: planResponse.plan.baseUrl,
      });

      reconOutput = await this.recon.runRecon(planResponse.plan.baseUrl);

      await appendLog('plan.recon', 'Analyzing page contents', {
        markdownBytes: reconOutput.markdown ? reconOutput.markdown.length : 0,
        htmlBytes: reconOutput.html ? reconOutput.html.length : 0,
        hasSummary: Boolean(reconOutput.summary),
      });

      await completeStep('plan.recon', 'success', {
        url: reconOutput.url,
        metadata: reconOutput.metadata,
        summary: reconOutput.summary,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Recon failed';
      await appendLog('plan.recon', 'Recon failed', { error: message }, 'error');
      await completeStep('plan.recon', 'error', { message });

      await applyPlanUpdate({
        status: 'failed',
        error: message,
      });

      await appendLog(
        'plan.pagination',
        'Pagination skipped: recon failed',
        { reason: message },
        'warning'
      );
      await completeStep('plan.pagination', 'error', { reason: message });

      await appendLog(
        'plan.extraction',
        'Extraction skipped: recon failed',
        { reason: message },
        'warning'
      );
      await completeStep('plan.extraction', 'error', { reason: message });

      await appendLog(
        'plan.job',
        'Job assembly skipped: recon failed',
        { reason: message },
        'warning'
      );
      await completeStep('plan.job', 'error', { reason: message });

      await finalizeRun('failed', {
        errorMessage: message,
      });
      return;
    }

    try {
      await startStep('plan.pagination');
      await appendLog('plan.pagination', 'Determining how to paginate', {
        url: reconOutput.url,
      });

      paginationOutput = await this.pagination.inferPagination({
        url: reconOutput.url,
        markdown: reconOutput.markdown ?? undefined,
        html: reconOutput.html ?? undefined,
        metadata: reconOutput.metadata ?? undefined,
        summary: reconOutput.summary ?? undefined,
      });

      await appendLog('plan.pagination', 'Pagination inference complete', {
        strategy: paginationOutput.pagination.strategy,
        confidence: paginationOutput.pagination.confidence,
        selector: paginationOutput.pagination.selector,
      });

      await completeStep('plan.pagination', 'success', {
        pagination: paginationOutput.pagination,
        reasoning: paginationOutput.reasoning,
      });

      if (recipeRecord) {
        try {
          recipeRecord = await this.runRepository.updateRecipe(recipeRecord.id, {
            pagination: paginationOutput.pagination,
          });
        } catch (error) {
          console.error('[RunPreparationService] Failed to persist recipe pagination', error);
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Pagination inference failed';
      await appendLog(
        'plan.pagination',
        'Pagination inference failed',
        { error: message },
        'error'
      );
      await completeStep('plan.pagination', 'error', { message });

      await applyPlanUpdate({
        status: 'failed',
        error: message,
      });

      await appendLog(
        'plan.extraction',
        'Extraction skipped: pagination failed',
        { reason: message },
        'warning'
      );
      await completeStep('plan.extraction', 'error', { reason: message });

      await appendLog(
        'plan.job',
        'Job assembly skipped: pagination failed',
        { reason: message },
        'warning'
      );
      await completeStep('plan.job', 'error', { reason: message });

      await finalizeRun('failed', {
        errorMessage: message,
      });
      return;
    }

    try {
      await startStep('plan.extraction');
      await appendLog('plan.extraction', 'Building extraction schema', {
        url: reconOutput.url,
      });

      extractionOutput = await this.extraction.generateExtractionSchema({
        userPrompt: prompt,
        plan: planResponse.plan,
        recon: {
          url: reconOutput.url,
          markdown: reconOutput.markdown ?? undefined,
          html: reconOutput.html ?? undefined,
          summary: reconOutput.summary ?? undefined,
        },
        pagination: paginationOutput?.pagination,
      });

      await appendLog('plan.extraction', 'Extraction schema generated', {
        llmFields: extractionOutput.llmFields.length,
        inferredFields: extractionOutput.inferredFields.length,
        hasSample: Boolean(extractionOutput.sample),
      });

      await completeStep('plan.extraction', 'success', {
        refinedPrompt: extractionOutput.refinedPrompt,
        notes: extractionOutput.notes ?? null,
        llmFields: extractionOutput.llmFields,
        inferredFields: extractionOutput.inferredFields,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Extraction schema generation failed';
      await appendLog(
        'plan.extraction',
        'Extraction schema generation failed',
        { error: message },
        'error'
      );
      await completeStep('plan.extraction', 'error', { message });

      await applyPlanUpdate({
        status: 'failed',
        error: message,
      });

      await appendLog(
        'plan.job',
        'Job assembly skipped: extraction schema missing',
        { reason: message },
        'warning'
      );
      await completeStep('plan.job', 'error', { reason: message });

      await finalizeRun('failed', {
        errorMessage: message,
      });
      return;
    }

    try {
      await startStep('plan.job');
      await appendLog('plan.job', 'Assembling Firecrawl job configuration');

      jobOutput = this.jobAssembly.assembleJob({
        userPrompt: prompt,
        plan: planResponse.plan,
        pagination: paginationOutput ?? undefined,
        extraction: extractionOutput,
      });

      await appendLog('plan.job', 'Job assembly complete', {
        totalFields: jobOutput.schema.fields.length,
        warnings: jobOutput.warnings.length,
      });

      await completeStep('plan.job', 'success', {
        crawlConfig: jobOutput.crawlConfig,
        schema: jobOutput.schema,
        warnings: jobOutput.warnings,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Job assembly failed';
      await appendLog('plan.job', 'Job assembly failed', { error: message }, 'error');
      await completeStep('plan.job', 'error', { message });

      await applyPlanUpdate({
        status: 'failed',
        error: message,
      });

      await finalizeRun('failed', {
        errorMessage: message,
      });
      return;
    }

    const finalPlan = planResponse;
    if (!finalPlan) {
      throw new Error('Plan response missing after planning stage');
    }

    const paginationDetails =
      paginationOutput && finalPlan.plan
        ? {
            start_url: finalPlan.plan.baseUrl,
            limit_strategy: finalPlan.plan.pagination.strategy,
            limit_value: finalPlan.plan.pagination.targetValue ?? null,
            notes:
              paginationOutput.reasoning ??
              finalPlan.plan.pagination.notes ??
              null,
            actions: paginationOutput.pagination.actions ?? [],
            pagination_strategy: paginationOutput.pagination.strategy,
            confidence: paginationOutput.pagination.confidence,
            selector: paginationOutput.pagination.selector,
            hrefTemplate: paginationOutput.pagination.hrefTemplate,
          }
        : null;

    const configDetails = jobOutput ? { firecrawl: jobOutput.crawlConfig } : null;

    await applyPlanUpdate({
      status: 'completed',
      error: null,
      objective: jobOutput?.summary.objective ?? finalPlan.plan.objective,
      baseUrl: jobOutput?.crawlConfig.url ?? finalPlan.plan.baseUrl,
      site: deriveSite(jobOutput?.crawlConfig.url ?? finalPlan.plan.baseUrl),
      reasoning: finalPlan.reasoning,
      sample: extractionOutput?.sample ?? null,
      schema: jobOutput?.schema ?? null,
      pagination: paginationDetails,
      config: configDetails,
      meta: {
        extractionFields: {
          plan: finalPlan.plan.extractionFields.length,
          llm: extractionOutput?.llmFields.length ?? 0,
          inferred: extractionOutput?.inferredFields.length ?? 0,
        },
        timestamps: {
          completedAt: new Date().toISOString(),
        },
      },
      paginationOverrides: finalPlan.plan.pagination,
      recipeId: recipeRecord?.id ?? planRecord?.recipeId ?? null,
    });

    const summary: RunSummary = {
      planId: planRecord?.id ?? null,
      baseUrl: jobOutput?.crawlConfig.url ?? finalPlan.plan.baseUrl,
      paginationStrategy: paginationOutput?.pagination.strategy ?? null,
      paginationConfidence: paginationOutput?.pagination.confidence ?? null,
      extractionFields: {
        llm: extractionOutput?.llmFields.length ?? 0,
        inferred: extractionOutput?.inferredFields.length ?? 0,
      },
      jobWarnings: jobOutput?.warnings ?? [],
      completedAt: new Date().toISOString(),
      firecrawlConfig: jobOutput?.crawlConfig ?? null,
      jobSchema: jobOutput?.schema ?? null,
    };

    if (planRecord) {
      await this.executionService.startFirecrawlExecution({
        runId,
        planId: planRecord.id,
        config: jobOutput?.crawlConfig as Record<string, unknown>,
        metadata: {
          warnings: jobOutput?.warnings ?? [],
        },
        initialSummary: summary as Record<string, unknown>,
      });
    } else {
      console.warn('[RunPreparationService] Plan record missing before execution start');
    }
  }

  private async buildStepIndex(runId: string): Promise<StepContextMap> {
    const steps = await this.runRepository.getSteps(runId);
    return steps.reduce<StepContextMap>((acc, step) => {
      acc[step.identifier] = step;
      return acc;
    }, {});
  }
}
