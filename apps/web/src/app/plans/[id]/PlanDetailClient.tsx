'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getApiBaseUrl } from '@/lib/config';
import type { PlanDetail } from '@/types/plan';

interface PlanDetailClientProps {
  planId: string;
  initial: PlanDetail;
}

export function PlanDetailClient({ planId, initial }: PlanDetailClientProps) {
  const router = useRouter();
  const [detail, setDetail] = useState<PlanDetail>(initial);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartRun = async () => {
    setIsRunning(true);
    setError(null);
    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/api/plans/${planId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error?.message ?? 'Failed to start run');
      }
      const runId: string | undefined = json.data?.run?.id;
      if (runId) {
        router.push(`/runs/${runId}`);
      } else {
        router.push('/runs');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsRunning(false);
    }
  };

  const plan = detail.plan;
  const recipe = detail.recipe;

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6 shadow-sm">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Plan Details
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
              {plan.prompt}
            </p>
          </div>
          <button
            onClick={handleStartRun}
            disabled={isRunning}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:bg-blue-400"
          >
            {isRunning ? 'Starting…' : 'Start New Run'}
          </button>
        </header>
        {error && (
          <p className="mt-3 text-sm text-red-500 dark:text-red-400">{error}</p>
        )}

        <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
          <div>
            <dt className="font-medium text-gray-700 dark:text-gray-300">Status</dt>
            <dd className="text-gray-600 dark:text-gray-400 capitalize">{plan.status}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-700 dark:text-gray-300">Site</dt>
            <dd className="text-gray-600 dark:text-gray-400">{plan.site ?? '—'}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-700 dark:text-gray-300">Base URL</dt>
            <dd className="text-gray-600 dark:text-gray-400">{plan.baseUrl ?? '—'}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-700 dark:text-gray-300">Starting URL</dt>
            <dd className="text-gray-600 dark:text-gray-400">{plan.startingUrl ?? '—'}</dd>
          </div>
        </dl>

        <div className="mt-6 space-y-3">
          {plan.paginationOverrides != null && (
            <DetailsBlock title="Pagination Overrides" data={plan.paginationOverrides} />
          )}
          {recipe && (
            <DetailsBlock
              title="Recipe Pagination"
              data={recipe.pagination ?? '(none)'}
            />
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6 shadow-sm">
        <header className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Runs
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {detail.runs.length} {detail.runs.length === 1 ? 'run' : 'runs'} executed from this plan
            </p>
          </div>
        </header>
        <div className="mt-4">
          {detail.runs.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {detail.runs.map((entry) => {
                const run = entry.run;
                if (!run) {
                  return null;
                }

                const statusColors = {
                  queued: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
                  running: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
                  completed: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
                  failed: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
                  cancelled: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
                };

                const statusColor = statusColors[run.status as keyof typeof statusColors] || statusColors.queued;

                return (
                  <article
                    key={run.id}
                    className="py-4 first:pt-0 last:pb-0 hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors"
                  >
                    <a href={`/runs/${run.id}`} className="block">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor}`}>
                              {run.status}
                            </span>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {run.phase}
                            </span>
                          </div>
                          <div className="flex items-baseline gap-2 text-sm">
                            <span className="text-gray-500 dark:text-gray-500">
                              {formatRelativeTime(run.createdAt)}
                            </span>
                            {run.completedAt && (
                              <span className="text-xs text-gray-400 dark:text-gray-600">
                                • Completed {formatRelativeTime(run.completedAt)}
                              </span>
                            )}
                          </div>
                          {run.error && (
                            <p className="mt-2 text-xs text-red-600 dark:text-red-400 line-clamp-2">
                              {run.error}
                            </p>
                          )}
                        </div>
                        <svg
                          className="w-5 h-5 text-gray-400 dark:text-gray-600 flex-shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </a>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                No runs have been executed for this plan yet.
              </p>
              <button
                onClick={handleStartRun}
                disabled={isRunning}
                className="mt-4 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:bg-blue-400"
              >
                {isRunning ? 'Starting…' : 'Start First Run'}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function DetailsBlock({ title, data }: { title: string; data: unknown }) {
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

function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }
}
