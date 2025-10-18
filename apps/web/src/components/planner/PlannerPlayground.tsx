'use client';

import { useState, useRef, useCallback } from 'react';
import { getApiBaseUrl } from '@/lib/config';
import { SUGGESTED_PROMPTS } from '@/components/runs/constants';
import { ScrapeThoughtLog } from '@/components/scrapes/ScrapeThoughtLog';
import type {
  PlanResponse,
  ReconResponse,
  PaginationInferenceResponse,
  ExtractionSchemaResponse,
  JobAssemblyResponse,
} from '@/types/planner';
import type { WorkflowLog, ThoughtSeverity } from '@/types/scrape';
import { PlanStep } from './steps/PlanStep';
import { ReconStep } from './steps/ReconStep';
import { PaginationStep } from './steps/PaginationStep';
import { ExtractionStep } from './steps/ExtractionStep';
import { JobAssemblyStep } from './steps/JobAssemblyStep';

type Status = 'idle' | 'loading' | 'success' | 'error';

const PLANNER_WORKFLOW_STEPS = [
  { id: 'plan', label: 'Plan' },
  { id: 'recon', label: 'Recon' },
  { id: 'pagination', label: 'Pagination' },
  { id: 'extraction', label: 'Extraction' },
  { id: 'job', label: 'Job Assembly' },
] as const;

type PlannerWorkflowStepId = (typeof PLANNER_WORKFLOW_STEPS)[number]['id'];

const PLANNER_WORKFLOW_LABEL: Record<PlannerWorkflowStepId, string> = {
  plan: 'Plan',
  recon: 'Recon',
  pagination: 'Pagination',
  extraction: 'Extraction',
  job: 'Job Assembly',
};

function createInitialWorkflow(): WorkflowLog {
  return {
    steps: PLANNER_WORKFLOW_STEPS.map((step) => ({
      id: step.id,
      label: step.label,
      status: 'pending',
      thoughts: [],
    })),
  };
}

function generateThoughtId(): string {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  if (typeof globalThis !== 'undefined') {
    const globalCrypto = (globalThis as { crypto?: Crypto }).crypto;
    if (globalCrypto?.randomUUID) {
      return globalCrypto.randomUUID();
    }
  }
  return Math.random().toString(36).slice(2);
}

export function PlannerPlayground() {
  const [prompt, setPrompt] = useState(
    'Scrape the first 10 pages of Hacker News, capturing title, score, author, and link.'
  );

  const [planStatus, setPlanStatus] = useState<Status>('idle');
  const [planError, setPlanError] = useState<string | null>(null);
  const [planResponse, setPlanResponse] = useState<PlanResponse | null>(null);
  const latestPlanRef = useRef<PlanResponse | null>(null);

  const [reconStatus, setReconStatus] = useState<Status>('idle');
  const [reconError, setReconError] = useState<string | null>(null);
  const [reconResponse, setReconResponse] = useState<ReconResponse | null>(null);
  const [reconUrl, setReconUrl] = useState('');

  const [paginationStatus, setPaginationStatus] = useState<Status>('idle');
  const [paginationError, setPaginationError] = useState<string | null>(null);
  const [paginationResponse, setPaginationResponse] = useState<PaginationInferenceResponse | null>(
    null
  );
  const [extractionStatus, setExtractionStatus] = useState<Status>('idle');
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [extractionResponse, setExtractionResponse] = useState<ExtractionSchemaResponse | null>(
    null
  );
  const [jobStatus, setJobStatus] = useState<Status>('idle');
  const [jobError, setJobError] = useState<string | null>(null);
  const [jobResponse, setJobResponse] = useState<JobAssemblyResponse | null>(null);
  const [workflow, setWorkflow] = useState<WorkflowLog>(() => createInitialWorkflow());

  const resetWorkflow = useCallback(() => {
    setWorkflow(createInitialWorkflow());
  }, []);

  const mutateStep = useCallback(
    (stepId: PlannerWorkflowStepId, updater: (step: WorkflowLog['steps'][number]) => void) => {
      setWorkflow((prev) => ({
        steps: prev.steps.map((step) => {
          if (step.id !== stepId) {
            return step;
          }
          const updated: WorkflowLog['steps'][number] = {
            ...step,
            label: PLANNER_WORKFLOW_LABEL[stepId],
            thoughts: [...step.thoughts],
          };
          updater(updated);
          return updated;
        }),
      }));
    },
    []
  );

  const clearSteps = useCallback((stepIds: PlannerWorkflowStepId[]) => {
    setWorkflow((prev) => ({
      steps: prev.steps.map((step) => {
        if (!stepIds.includes(step.id as PlannerWorkflowStepId)) {
          return step;
        }
        const id = step.id as PlannerWorkflowStepId;
        return {
          id,
          label: PLANNER_WORKFLOW_LABEL[id],
          status: 'pending',
          thoughts: [],
          startedAt: undefined,
          completedAt: undefined,
        };
      }),
    }));
  }, []);

  const beginStep = useCallback(
    (stepId: PlannerWorkflowStepId) => {
      const timestamp = new Date().toISOString();
      mutateStep(stepId, (step) => {
        if (!step.startedAt) {
          step.startedAt = timestamp;
        }
        step.status = 'in_progress';
      });
    },
    [mutateStep]
  );

  const completeStep = useCallback(
    (stepId: PlannerWorkflowStepId, status: 'success' | 'error') => {
      const timestamp = new Date().toISOString();
      mutateStep(stepId, (step) => {
        if (!step.startedAt) {
          step.startedAt = timestamp;
        }
        step.status = status;
        step.completedAt = timestamp;
      });
    },
    [mutateStep]
  );

  const addThought = useCallback(
    (
      stepId: PlannerWorkflowStepId,
      text: string,
      body?: unknown,
      severity: ThoughtSeverity = 'info'
    ) => {
      const timestamp = new Date().toISOString();
      mutateStep(stepId, (step) => {
        if (!step.startedAt) {
          step.startedAt = timestamp;
        }
        if (step.status === 'pending') {
          step.status = 'in_progress';
        }
        step.thoughts.push({
          id: generateThoughtId(),
          text,
          body,
          createdAt: timestamp,
          severity,
        });
      });
    },
    [mutateStep]
  );

  const resetPaginationState = () => {
    setPaginationStatus('idle');
    setPaginationError(null);
    setPaginationResponse(null);
  };

  const resetExtractionState = () => {
    setExtractionStatus('idle');
    setExtractionError(null);
    setExtractionResponse(null);
  };

  const resetJobState = () => {
    setJobStatus('idle');
    setJobError(null);
    setJobResponse(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetWorkflow();
    latestPlanRef.current = null;
    setPlanStatus('loading');
    setPlanError(null);
    setPlanResponse(null);
    setReconStatus('idle');
    setReconError(null);
    setReconResponse(null);
    resetPaginationState();
    resetExtractionState();
    resetJobState();
    beginStep('plan');
    addThought('plan', 'Submitting prompt to planner service', { prompt });

    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/planner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Planner request failed');
      }

      const data = json.data as PlanResponse;
      latestPlanRef.current = data;
      setPlanResponse(data);
      setPlanStatus('success');

      addThought('plan', 'Planner generated structured plan', {
        baseUrl: data.plan.baseUrl,
        extractionFields: data.plan.extractionFields.length,
        paginationStrategy: data.plan.pagination.strategy,
        confidence: data.plan.confidence,
      });
      completeStep('plan', 'success');

      if (data.plan.baseUrl) {
        setReconUrl(data.plan.baseUrl);
        await runRecon(data.plan.baseUrl);
      } else {
        addThought(
          'recon',
          'Recon skipped: planner did not provide a base URL',
          { objective: data.plan.objective },
          'warning'
        );
        completeStep('recon', 'error');
        addThought(
          'pagination',
          'Pagination skipped: recon never executed',
          { reason: 'No base URL from plan' },
          'warning'
        );
        completeStep('pagination', 'error');
        setExtractionStatus('error');
        setExtractionError('Extraction requires a base URL to fetch the first page.');
        setExtractionResponse(null);
        addThought(
          'extraction',
          'Extraction skipped: planner did not provide a base URL',
          { objective: data.plan.objective },
          'warning'
        );
        completeStep('extraction', 'error');
        setJobStatus('error');
        setJobError('Job assembly skipped: planner did not provide a base URL');
        addThought('job', 'Job assembly skipped: planner missing base URL', null, 'warning');
        completeStep('job', 'error');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setPlanError(message);
      setPlanStatus('error');
      latestPlanRef.current = null;

      addThought('plan', 'Planner request failed', { error: message }, 'error');
      completeStep('plan', 'error');
      addThought(
        'recon',
        'Recon skipped: planner failed',
        { reason: message },
        'warning'
      );
      completeStep('recon', 'error');
      addThought(
        'pagination',
        'Pagination skipped: planner failed',
        { reason: message },
        'warning'
      );
      completeStep('pagination', 'error');
      setExtractionStatus('error');
      setExtractionError(message);
      setExtractionResponse(null);
      addThought(
        'extraction',
        'Extraction skipped: planner failed',
        { reason: message },
        'warning'
      );
      completeStep('extraction', 'error');
      setJobStatus('error');
      setJobError(message);
      addThought('job', 'Job assembly skipped: planner failed', { reason: message }, 'warning');
      completeStep('job', 'error');
    }
  };

  const runRecon = async (url: string) => {
    resetExtractionState();
    resetJobState();
    if (!url) {
      clearSteps(['recon', 'pagination', 'extraction', 'job']);
      addThought('recon', 'Recon skipped: missing base URL', undefined, 'warning');
      completeStep('recon', 'error');
      addThought('pagination', 'Pagination skipped: no recon input', undefined, 'warning');
      completeStep('pagination', 'error');
      setExtractionStatus('error');
      setExtractionError('Extraction skipped: missing base URL');
      setExtractionResponse(null);
      addThought('extraction', 'Extraction skipped: missing base URL', undefined, 'warning');
      completeStep('extraction', 'error');
      setJobStatus('error');
      setJobError('Job assembly skipped: missing base URL');
      addThought('job', 'Job assembly skipped: missing base URL', undefined, 'warning');
      completeStep('job', 'error');
      return;
    }

    clearSteps(['recon', 'pagination', 'extraction', 'job']);
    beginStep('recon');
    addThought('recon', 'Fetching the first page', { url });

    setReconStatus('loading');
    setReconError(null);
    setReconResponse(null);
    resetPaginationState();

    let data: ReconResponse;

    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/planner/recon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Recon request failed');
      }

      data = json.data as ReconResponse;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setReconError(message);
      setReconStatus('error');
      addThought('recon', 'Recon failed', { error: message }, 'error');
      completeStep('recon', 'error');
      clearSteps(['pagination', 'extraction', 'job']);
      addThought(
        'pagination',
        'Pagination inference skipped: recon failed',
        { reason: message },
        'warning'
      );
      completeStep('pagination', 'error');
      setExtractionStatus('error');
      setExtractionError(`Extraction skipped: recon failed (${message})`);
      setExtractionResponse(null);
      addThought(
        'extraction',
        'Extraction skipped: recon failed',
        { reason: message },
        'warning'
      );
      completeStep('extraction', 'error');
      setJobStatus('error');
      setJobError(`Job assembly skipped: recon failed (${message})`);
      addThought(
        'job',
        'Job assembly skipped: recon failed',
        { reason: message },
        'warning'
      );
      completeStep('job', 'error');
      return;
    }

    setReconResponse(data);
    setReconStatus('success');

    const statusCode =
      typeof data.metadata === 'object' && data.metadata
        ? (data.metadata as Record<string, unknown>).statusCode
        : undefined;
    const proxyUsed =
      typeof data.metadata === 'object' && data.metadata
        ? (data.metadata as Record<string, unknown>).proxyUsed
        : undefined;

    if (typeof statusCode === 'number' && statusCode >= 400) {
      addThought(
        'recon',
        `Page returned ${statusCode}. Switching strategy and trying again.`,
        { statusCode },
        'warning'
      );
    }

    if (proxyUsed === 'stealth') {
      addThought('recon', 'Stealth proxy engaged for follow-up attempt', { proxyUsed });
    }

    addThought('recon', 'Analyzing page contents', {
      markdownBytes: data.markdown ? data.markdown.length : 0,
      htmlBytes: data.html ? data.html.length : 0,
      hasSummary: Boolean(data.summary),
    });

    if (data.summary) {
      addThought('recon', 'Identifying useful elements like anchors and buttons', {
        anchorsFound: data.summary.anchorSample?.length ?? 0,
        buttonsFound: data.summary.buttonSample?.length ?? 0,
        navigationFragments: data.summary.navigationFragments?.length ?? 0,
      });
    }
    completeStep('recon', 'success');

    await runPagination(data);
  };

  const runPagination = async (input: ReconResponse) => {
    resetExtractionState();
    resetJobState();
    clearSteps(['pagination', 'extraction', 'job']);
    beginStep('pagination');
    addThought('pagination', 'Determining how to get to the next page', { url: input.url });

    setPaginationStatus('loading');
    setPaginationError(null);
    setPaginationResponse(null);

    try {
      const baseUrl = getApiBaseUrl();
      const body: Record<string, unknown> = {
        url: input.url,
      };
      if (input.markdown) body.markdown = input.markdown;
      if (input.html) body.html = input.html;
      if (input.metadata !== undefined) body.metadata = input.metadata;
      if (input.summary) body.summary = input.summary;

      const res = await fetch(`${baseUrl}/api/planner/pagination`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Pagination inference failed');
      }

      const inference = json.data as PaginationInferenceResponse;
      setPaginationResponse(inference);
      setPaginationStatus('success');

      addThought('pagination', 'Analyzing page for navigation cues', {
        strategy: inference.pagination.strategy,
        confidence: inference.pagination.confidence,
        selector: inference.pagination.selector,
        notes: inference.pagination.notes,
      });

      addThought('pagination', 'Building pagination configuration', {
        actions: inference.pagination.actions,
        hrefTemplate: inference.pagination.hrefTemplate,
      });
      completeStep('pagination', 'success');
      await runExtraction(input, inference);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setPaginationError(message);
      setPaginationStatus('error');
      addThought('pagination', 'Pagination inference failed', { error: message }, 'error');
      completeStep('pagination', 'error');
      setExtractionStatus('error');
      setExtractionError(`Extraction skipped: pagination failed (${message})`);
      setExtractionResponse(null);
      addThought(
        'extraction',
        'Extraction skipped: pagination failed',
        { reason: message },
        'warning'
      );
      completeStep('extraction', 'error');
      setJobStatus('error');
      setJobError(`Job assembly skipped: pagination failed (${message})`);
      addThought(
        'job',
        'Job assembly skipped: pagination failed',
        { reason: message },
        'warning'
      );
      completeStep('job', 'error');
    }
  };

  const runExtraction = async (
    recon: ReconResponse,
    pagination?: PaginationInferenceResponse | null
  ) => {
    const plan = latestPlanRef.current;
    if (!plan) {
      setExtractionStatus('error');
      setExtractionError('Extraction skipped: missing plan context');
      addThought('extraction', 'Extraction skipped: missing plan context', null, 'warning');
      completeStep('extraction', 'error');
      return;
    }

    clearSteps(['extraction']);
    beginStep('extraction');
    addThought('extraction', 'Crafting extraction schema for Firecrawl', {
      objective: plan.plan.objective,
      baseUrl: plan.plan.baseUrl,
    });

    setExtractionStatus('loading');
    setExtractionError(null);
    setExtractionResponse(null);

    try {
      const baseUrl = getApiBaseUrl();
      const body: Record<string, unknown> = {
        userPrompt: prompt,
        plan: plan.plan,
        recon: {
          url: recon.url,
          markdown: recon.markdown,
          html: recon.html,
          summary: recon.summary,
        },
      };

      if (pagination?.pagination) {
        body.pagination = pagination.pagination;
      }

      const res = await fetch(`${baseUrl}/api/planner/extraction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Extraction schema generation failed');
      }

      const extraction = json.data as ExtractionSchemaResponse;
      setExtractionResponse(extraction);
      setExtractionStatus('success');

      addThought('extraction', 'Refined extraction prompt ready', {
        refinedPromptPreview: extraction.refinedPrompt.slice(0, 160),
        llmFields: extraction.llmFields.length,
      });

      addThought('extraction', 'Firecrawl returned sample data', {
        status: extraction.extractStatus,
        inferredFields: extraction.inferredFields.length,
      });

      completeStep('extraction', 'success');
      await runJobAssembly(recon, pagination ?? null, extraction);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setExtractionError(message);
      setExtractionStatus('error');
      addThought('extraction', 'Extraction schema generation failed', { error: message }, 'error');
      completeStep('extraction', 'error');
      setJobStatus('error');
      setJobError(`Job assembly skipped: extraction failed (${message})`);
      addThought(
        'job',
        'Job assembly skipped: extraction failed',
        { reason: message },
        'warning'
      );
      completeStep('job', 'error');
    }
  };

  const runJobAssembly = async (
    recon: ReconResponse,
    pagination: PaginationInferenceResponse | null,
    extraction: ExtractionSchemaResponse
  ) => {
    const plan = latestPlanRef.current;
    if (!plan) {
      setJobStatus('error');
      setJobError('Job assembly skipped: missing plan context');
      addThought('job', 'Job assembly skipped: missing plan context', null, 'warning');
      completeStep('job', 'error');
      return;
    }

    clearSteps(['job']);
    beginStep('job');
    addThought('job', 'Assembling Firecrawl crawl configuration', {
      baseUrl: plan.plan.baseUrl,
      paginationStrategy: pagination?.pagination.strategy ?? null,
    });

    setJobStatus('loading');
    setJobError(null);
    setJobResponse(null);

    try {
      const baseUrl = getApiBaseUrl();
      const body: Record<string, unknown> = {
        userPrompt: prompt,
        plan: plan.plan,
        extraction,
      };

      if (pagination) {
        body.pagination = pagination;
      }

      const res = await fetch(`${baseUrl}/api/planner/job`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Job assembly failed');
      }

      const job = json.data as JobAssemblyResponse;
      setJobResponse(job);
      setJobStatus('success');

      addThought('job', 'Firecrawl crawl config ready', {
        limit: job.crawlConfig.limit ?? null,
        formats: job.crawlConfig.scrapeOptions?.formats?.length ?? 0,
        totalFields: job.schema.fields.length,
      });

      if (job.warnings.length) {
        addThought('job', 'Job assembly warnings', job.warnings, 'warning');
      }

      completeStep('job', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setJobError(message);
      setJobStatus('error');
      addThought('job', 'Job assembly failed', { error: message }, 'error');
      completeStep('job', 'error');
    }
  };

  const metadataSnapshot =
    reconResponse?.metadata_snapshot ?? reconResponse?.metadataSnapshot ?? null;
  const planHasBaseUrl = Boolean(planResponse?.plan.baseUrl);
  const hasWorkflowActivity = workflow.steps.some(
    (step) => step.status !== 'pending' || step.thoughts.length > 0
  );

  return (
    <section className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Suggested
          </span>
          {SUGGESTED_PROMPTS.map((item) => (
            <button
              type="button"
              key={item.label}
              onClick={() => setPrompt(item.prompt)}
              className="rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-gray-700 dark:text-gray-200 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
            >
              {item.label}
            </button>
          ))}
        </div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Describe the scrape you want to run
        </label>
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows={6}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={planStatus === 'loading'}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:bg-blue-400"
          >
            {planStatus === 'loading' ? 'Generating…' : 'Generate Plan'}
          </button>
          {planStatus === 'error' && (
            <span className="text-sm text-red-500 dark:text-red-400">{planError}</span>
          )}
        </div>
      </form>

      <div className="space-y-6">
        {hasWorkflowActivity && <ScrapeThoughtLog workflow={workflow} />}

        <PlanStep status={planStatus} error={planError} plan={planResponse} />

        <ReconStep
          status={reconStatus}
          error={reconError}
          reconResponse={reconResponse}
          reconUrl={reconUrl}
          planHasBaseUrl={planHasBaseUrl}
          onReconUrlChange={(event) => setReconUrl(event.target.value)}
          onRunRecon={() => reconUrl && runRecon(reconUrl)}
          metadataSnapshot={metadataSnapshot}
          paginationResponse={paginationResponse}
        />

        <PaginationStep
          status={paginationStatus}
          error={paginationError}
          paginationResponse={paginationResponse}
          reconResponse={reconResponse}
          onRunPagination={() => reconResponse && runPagination(reconResponse)}
        />

        <ExtractionStep
          status={extractionStatus}
          error={extractionError}
          extractionResponse={extractionResponse}
          reconResponse={reconResponse}
          paginationResponse={paginationResponse}
          planAvailable={Boolean(latestPlanRef.current)}
          onRunExtraction={() =>
            reconResponse && runExtraction(reconResponse, paginationResponse ?? null)
          }
        />

        <JobAssemblyStep
          status={jobStatus}
          error={jobError}
          jobResponse={jobResponse}
          hasExtraction={Boolean(extractionResponse)}
          onRunJobAssembly={() =>
            reconResponse &&
            extractionResponse &&
            runJobAssembly(reconResponse, paginationResponse ?? null, extractionResponse)
          }
        />
      </div>
    </section>
  );
}
