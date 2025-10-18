'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getApiBaseUrl } from '@/lib/config';
import { RunStatusBadge } from '@/components/runs/RunStatusBadge';
import { ScrapeThoughtLog } from '@/components/scrapes/ScrapeThoughtLog';
import type { RunDetail, RunLog, RunPlan, RunStep } from '@/types/run';
import type { WorkflowLog, ThoughtEntry } from '@/types/scrape';

interface RunDetailClientProps {
  initial: RunDetail;
  runId: string;
}

export function RunDetailClient({ initial, runId }: RunDetailClientProps) {
  const [state, setState] = useState<RunDetail>(initial);
  const logIdsRef = useRef(new Set(initial.logs.map((log) => log.id)));

  useEffect(() => {
    const baseUrl = getApiBaseUrl();
    const source = new EventSource(`${baseUrl}/api/runs/${runId}/stream`);

    const handleSnapshot = (event: MessageEvent) => {
      const data = JSON.parse(event.data) as RunDetail;
      logIdsRef.current = new Set(data.logs.map((log) => log.id));
      setState(data);
    };

    const handleRunUpdated = (event: MessageEvent) => {
      const data = JSON.parse(event.data) as RunDetail;
      setState((prev) => ({
        ...prev,
        status: data.status,
        phase: data.phase,
        summary: data.summary ?? prev.summary ?? null,
        error: data.error ?? null,
        updatedAt: data.updatedAt,
        completedAt: data.completedAt ?? prev.completedAt,
      }));
    };

    const handlePlan = (event: MessageEvent) => {
      const data = JSON.parse(event.data) as RunPlan;
      setState((prev) => ({
        ...prev,
        plan: data,
      }));
    };

    const handleStep = (event: MessageEvent) => {
      const data = JSON.parse(event.data) as RunStep;
      setState((prev) => {
        const nextSteps = [...prev.steps];
        const index = nextSteps.findIndex((step) => step.id === data.id);
        if (index >= 0) {
          nextSteps[index] = data;
        } else {
          nextSteps.push(data);
        }
        nextSteps.sort((a, b) => a.position - b.position);
        return {
          ...prev,
          steps: nextSteps,
        };
      });
    };

    const handleLog = (event: MessageEvent) => {
      const data = JSON.parse(event.data) as RunLog;
      if (logIdsRef.current.has(data.id)) {
        return;
      }
      logIdsRef.current.add(data.id);
      setState((prev) => {
        const nextLogs = [...prev.logs, data];
        nextLogs.sort((a, b) => a.sequence - b.sequence);
        return {
          ...prev,
          logs: nextLogs,
        };
      });
    };

    source.addEventListener('run.snapshot', handleSnapshot);
    source.addEventListener('run.updated', handleRunUpdated);
    source.addEventListener('run.plan', handlePlan);
    source.addEventListener('run.step', handleStep);
    source.addEventListener('run.log', handleLog);

    source.onerror = () => {
      source.close();
    };

    return () => {
      source.removeEventListener('run.snapshot', handleSnapshot);
      source.removeEventListener('run.updated', handleRunUpdated);
      source.removeEventListener('run.plan', handlePlan);
      source.removeEventListener('run.step', handleStep);
      source.removeEventListener('run.log', handleLog);
      source.close();
    };
  }, [runId]);

  const workflow = useMemo(
    () => buildWorkflowLog(state.steps, state.logs),
    [state.steps, state.logs]
  );

  const contexts = useMemo(
    () => state.steps.filter((step) => Boolean(step.context)),
    [state.steps]
  );

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              Run Details
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
              {state.prompt}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
              <span>Created {new Date(state.createdAt).toLocaleString()}</span>
              <span>·</span>
              <span>Updated {new Date(state.updatedAt).toLocaleString()}</span>
              {state.completedAt && (
                <>
                  <span>·</span>
                  <span>Completed {new Date(state.completedAt).toLocaleString()}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-col items-start gap-2">
            <RunStatusBadge status={state.status} />
            <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Phase: {state.phase}
            </span>
            {state.error && (
              <span className="text-xs text-red-500 dark:text-red-400 max-w-xs">
                {state.error}
              </span>
            )}
          </div>
        </div>
      </section>

      {state.plan && <PlanSummary plan={state.plan} />}

      {contexts.length > 0 && <StepOutputs steps={contexts} />}

      <ScrapeThoughtLog workflow={workflow} />
    </div>
  );
}

function buildWorkflowLog(steps: RunStep[], logs: RunLog[]): WorkflowLog {
  const stepThoughts = new Map<string, ThoughtEntry[]>();

  for (const step of steps) {
    stepThoughts.set(step.id, []);
  }

  for (const log of logs) {
    if (!log.stepId) continue;
    const bucket = stepThoughts.get(log.stepId);
    if (!bucket) continue;

    bucket.push({
      id: log.id,
      text: log.message,
      body: log.payload,
      createdAt: log.createdAt,
      severity: toThoughtSeverity(log.severity),
    });
  }

  return {
    steps: steps.map((step) => ({
      id: step.identifier,
      label: formatStepLabel(step),
      status: step.status,
      startedAt: step.startedAt ?? undefined,
      completedAt: step.completedAt ?? undefined,
      thoughts: (stepThoughts.get(step.id) ?? []).sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ),
    })),
  };
}

function toThoughtSeverity(severity: RunLog['severity']): ThoughtEntry['severity'] {
  if (severity === 'warning' || severity === 'error') {
    return severity;
  }
  return 'info';
}

function PlanSummary({ plan }: { plan: RunPlan }) {
  return (
    <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6 shadow-sm">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Plan
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Culmination of the preparation workflow
          </p>
        </div>
        {plan.baseUrl && (
          <a
            href={plan.baseUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Open base URL
          </a>
        )}
      </header>

      <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3 text-sm">
        <div>
          <dt className="font-medium text-gray-700 dark:text-gray-300">Status</dt>
          <dd className="text-gray-600 dark:text-gray-400 capitalize">
            {plan.status}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-gray-700 dark:text-gray-300">Objective</dt>
          <dd className="text-gray-600 dark:text-gray-400">
            {plan.objective ?? '—'}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-gray-700 dark:text-gray-300">Site</dt>
          <dd className="text-gray-600 dark:text-gray-400">
            {plan.site ?? '—'}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-gray-700 dark:text-gray-300">Model</dt>
          <dd className="text-gray-600 dark:text-gray-400">
            {plan.model ?? '—'}
          </dd>
        </div>
        <div className="sm:col-span-3">
          <dt className="font-medium text-gray-700 dark:text-gray-300">Prompt</dt>
          <dd className="text-gray-600 dark:text-gray-400">
            {plan.prompt}
          </dd>
        </div>
      </dl>

      <div className="mt-4 space-y-3">
        {plan.pagination != null && (
          <PlanDetails title="Pagination" data={plan.pagination} />
        )}
        {plan.config != null && (
          <PlanDetails title="Config" data={plan.config} />
        )}
        {plan.schema != null && (
          <PlanDetails title="Schema" data={plan.schema} />
        )}
        {plan.sample != null && (
          <PlanDetails title="Sample" data={plan.sample} />
        )}
        {plan.meta != null && <PlanDetails title="Meta" data={plan.meta} />}
        {plan.error && (
          <div className="text-sm text-red-500 dark:text-red-400">
            {plan.error}
          </div>
        )}
      </div>
    </section>
  );
}

function PlanDetails({ title, data }: { title: string; data: unknown }) {
  return (
    <details className="group">
      <summary className="flex cursor-pointer items-center justify-between text-sm font-medium text-blue-600 dark:text-blue-400">
        {title}
        <span className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">
          Expand
        </span>
      </summary>
      <pre className="mt-2 overflow-auto rounded-lg bg-gray-900/80 p-4 text-xs text-gray-100">
{JSON.stringify(data, null, 2)}
      </pre>
    </details>
  );
}

function StepOutputs({ steps }: { steps: RunStep[] }) {
  return (
    <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6 shadow-sm space-y-4">
      <header>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Step Outputs
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Inline context captured during each preparation step.
        </p>
      </header>
      <div className="space-y-3">
        {steps.map((step) => (
          <details key={step.id} className="group">
            <summary className="flex cursor-pointer items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-900 px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-200">
              <span>{formatStepLabel(step)}</span>
              <span className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Expand
              </span>
            </summary>
            <pre className="mt-2 overflow-auto rounded-lg bg-gray-900/80 p-4 text-xs text-gray-100">
{JSON.stringify(step.context, null, 2)}
            </pre>
          </details>
        ))}
      </div>
    </section>
  );
}

function formatStepLabel(step: RunStep): string {
  if (step.identifier === 'plan.summary' || step.identifier === 'plan') {
    return 'Plan Summary';
  }
  return step.label;
}
