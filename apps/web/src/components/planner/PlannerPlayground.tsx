'use client';

import { useState } from 'react';
import { getApiBaseUrl } from '@/lib/config';
import type {
  PlanResponse,
  ReconResponse,
  PaginationInferenceResponse,
} from '@/types/planner';

type Status = 'idle' | 'loading' | 'success' | 'error';

export function PlannerPlayground() {
  const [prompt, setPrompt] = useState(
    'Scrape the first 10 pages of Hacker News, capturing title, score, author, and link.'
  );

  const [planStatus, setPlanStatus] = useState<Status>('idle');
  const [planError, setPlanError] = useState<string | null>(null);
  const [planResponse, setPlanResponse] = useState<PlanResponse | null>(null);

  const [reconStatus, setReconStatus] = useState<Status>('idle');
  const [reconError, setReconError] = useState<string | null>(null);
  const [reconResponse, setReconResponse] = useState<ReconResponse | null>(null);
  const [reconUrl, setReconUrl] = useState('');

  const [paginationStatus, setPaginationStatus] = useState<Status>('idle');
  const [paginationError, setPaginationError] = useState<string | null>(null);
  const [paginationResponse, setPaginationResponse] = useState<PaginationInferenceResponse | null>(
    null
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPlanStatus('loading');
    setPlanError(null);
    setPlanResponse(null);
    resetRecon();
    resetPagination();

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
      setPlanResponse(data);
      setPlanStatus('success');

      if (data.plan.baseUrl) {
        setReconUrl(data.plan.baseUrl);
        await runRecon(data.plan.baseUrl);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setPlanError(message);
      setPlanStatus('error');
    }
  };

  const resetRecon = () => {
    setReconStatus('idle');
    setReconError(null);
    setReconResponse(null);
  };

  const resetPagination = () => {
    setPaginationStatus('idle');
    setPaginationError(null);
    setPaginationResponse(null);
  };

  const runRecon = async (url: string) => {
    if (!url) return;
    setReconStatus('loading');
    setReconError(null);
    setReconResponse(null);
    resetPagination();

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

      const data = json.data as ReconResponse;
      setReconResponse(data);
      setReconStatus('success');
      await runPagination(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setReconError(message);
      setReconStatus('error');
    }
  };

  const runPagination = async (input: ReconResponse) => {
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

      setPaginationResponse(json.data as PaginationInferenceResponse);
      setPaginationStatus('success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setPaginationError(message);
      setPaginationStatus('error');
    }
  };

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
        <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
          <header className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Step 1 · Plan
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Natural-language prompt translated into a structured scrape plan.
            </p>
          </header>
          {planStatus === 'loading' && (
            <p className="text-sm text-gray-600 dark:text-gray-400">Generating plan…</p>
          )}
          {planStatus === 'error' && (
            <p className="text-sm text-red-500 dark:text-red-400">{planError}</p>
          )}
          {planStatus === 'success' && planResponse && (
            <div className="space-y-4">
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700 dark:text-gray-300">
                <div>
                  <dt className="font-semibold text-gray-900 dark:text-gray-100">Objective</dt>
                  <dd className="mt-1">{planResponse.plan.objective}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-gray-900 dark:text-gray-100">Base URL</dt>
                  <dd className="mt-1">
                    {planResponse.plan.baseUrl || 'Not specified'}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-gray-900 dark:text-gray-100">Extraction Format</dt>
                  <dd className="mt-1 uppercase">{planResponse.plan.extractionFormat}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-gray-900 dark:text-gray-100">Pagination Target</dt>
                  <dd className="mt-1">
                    {planResponse.plan.pagination.strategy === 'unknown'
                      ? 'Unknown'
                      : `${planResponse.plan.pagination.strategy} → ${planResponse.plan.pagination.targetValue ?? 'n/a'}`}
                  </dd>
                </div>
              </dl>
              {planResponse.plan.extractionFields.length > 0 && (
                <section className="text-sm">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">Fields</h3>
                  <ul className="mt-2 space-y-1 text-gray-700 dark:text-gray-300">
                    {planResponse.plan.extractionFields.map((field) => (
                      <li key={field.name}>
                        <span className="font-medium">{field.name}</span> – {field.description}
                        {!field.required && <span className="text-xs text-gray-500"> (optional)</span>}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              <details className="text-sm">
                <summary className="cursor-pointer text-blue-600 dark:text-blue-400">
                  View raw plan JSON
                </summary>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap bg-gray-50 dark:bg-gray-950 rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-gray-200">
{JSON.stringify(planResponse, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
          <header className="mb-4 space-y-1">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Step 2 · Recon
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Fetch the base page once to understand its structure.
            </p>
            <div className="flex flex-col md:flex-row md:items-center gap-2 mt-3">
              <input
                type="url"
                value={reconUrl}
                onChange={(event) => setReconUrl(event.target.value)}
                placeholder="https://example.com"
                className="w-full md:flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => reconUrl && runRecon(reconUrl)}
                disabled={reconStatus === 'loading' || !reconUrl}
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-blue-700 disabled:bg-blue-400"
              >
                {reconStatus === 'loading' ? 'Running…' : 'Run Recon'}
              </button>
            </div>
          </header>

          {reconStatus === 'error' && (
            <p className="text-sm text-red-500 dark:text-red-400">{reconError}</p>
          )}
          {reconStatus === 'loading' && (
            <p className="text-sm text-gray-600 dark:text-gray-400">Fetching base page…</p>
          )}
          {reconStatus === 'success' && reconResponse && (
            <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Recon URL</h3>
                <p className="mt-1 break-words">{reconResponse.url}</p>
              </div>
              {reconResponse.metadata && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">Metadata</h3>
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap bg-gray-50 dark:bg-gray-950 rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-gray-200">
{JSON.stringify(reconResponse.metadata, null, 2)}
                  </pre>
                </div>
              )}
              {reconResponse.markdown && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">Markdown Snapshot</h3>
                  <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap bg-gray-50 dark:bg-gray-950 rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-gray-200">
{truncate(reconResponse.markdown, 4000)}
                  </pre>
                </div>
              )}
              {reconResponse.html && (
                <details>
                  <summary className="cursor-pointer text-blue-600 dark:text-blue-400 text-xs">
                    View HTML snapshot
                  </summary>
                  <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap bg-gray-50 dark:bg-gray-950 rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-gray-200">
{truncate(reconResponse.html, 4000)}
                  </pre>
                </details>
              )}
              {reconResponse.summary && (
                <details>
                  <summary className="cursor-pointer text-blue-600 dark:text-blue-400 text-xs">
                    View pagination summary JSON
                  </summary>
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap bg-gray-50 dark:bg-gray-950 rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-gray-200">
{JSON.stringify(reconResponse.summary, null, 2)}
                  </pre>
                </details>
              )}
              {paginationResponse?.summary && (
                <details>
                  <summary className="cursor-pointer text-blue-600 dark:text-blue-400 text-xs">
                    View pagination summary JSON
                  </summary>
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap bg-gray-50 dark:bg-gray-950 rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-gray-200">
{JSON.stringify(paginationResponse.summary, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}
          {reconStatus === 'idle' && planStatus === 'success' && !planResponse?.plan.baseUrl && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Planner did not specify a base URL. Provide one above to continue.
            </p>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
          <header className="mb-4 space-y-1">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Step 3 · Pagination Inference
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Analyze the recon output to identify pagination behaviour automatically.
            </p>
            <div className="flex flex-col md:flex-row md:items-center gap-2 mt-3">
              <button
                type="button"
                onClick={() => reconResponse && runPagination(reconResponse)}
                disabled={paginationStatus === 'loading' || !reconResponse}
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-blue-700 disabled:bg-blue-400"
              >
                {paginationStatus === 'loading' ? 'Inferring…' : 'Re-run Inference'}
              </button>
            </div>
          </header>

          {paginationStatus === 'idle' && !reconResponse && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Run recon first to infer pagination.
            </p>
          )}
          {paginationStatus === 'error' && (
            <p className="text-sm text-red-500 dark:text-red-400">{paginationError}</p>
          )}
          {paginationStatus === 'loading' && (
            <p className="text-sm text-gray-600 dark:text-gray-400">Analyzing pagination…</p>
          )}
              {paginationStatus === 'success' && paginationResponse && (
                <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="font-semibold text-gray-900 dark:text-gray-100">Strategy</dt>
                  <dd className="mt-1 capitalize">
                    {paginationResponse.pagination.strategy.replace('_', ' ')}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-gray-900 dark:text-gray-100">Confidence</dt>
                  <dd className="mt-1 capitalize">{paginationResponse.pagination.confidence}</dd>
                </div>
                {paginationResponse.pagination.selector && (
                  <div className="md:col-span-2">
                    <dt className="font-semibold text-gray-900 dark:text-gray-100">Selector</dt>
                    <dd className="mt-1 font-mono text-xs break-words">
                      {paginationResponse.pagination.selector}
                    </dd>
                  </div>
                )}
                {paginationResponse.pagination.hrefTemplate && (
                  <div className="md:col-span-2">
                    <dt className="font-semibold text-gray-900 dark:text-gray-100">Href Template</dt>
                    <dd className="mt-1 font-mono text-xs break-words">
                      {paginationResponse.pagination.hrefTemplate}
                    </dd>
                  </div>
                )}
              </dl>

              {paginationResponse.pagination.actions.length > 0 && (
                <details>
                  <summary className="cursor-pointer text-blue-600 dark:text-blue-400 text-xs">
                    View recommended actions
                  </summary>
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap bg-gray-50 dark:bg-gray-950 rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-gray-200">
{JSON.stringify(paginationResponse.pagination.actions, null, 2)}
                  </pre>
                </details>
              )}

              {paginationResponse.pagination.notes && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">Notes</h3>
                  <p className="mt-1 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {paginationResponse.pagination.notes}
                  </p>
                </div>
              )}

              {paginationResponse.reasoning && (
                <details>
                  <summary className="cursor-pointer text-blue-600 dark:text-blue-400 text-xs">
                    View reasoning
                  </summary>
                  <p className="mt-2 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {paginationResponse.reasoning}
                  </p>
                </details>
              )}

              <details className="text-sm">
                <summary className="cursor-pointer text-blue-600 dark:text-blue-400">
                  View raw inference JSON
                </summary>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap bg-gray-50 dark:bg-gray-950 rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-gray-200">
{JSON.stringify(paginationResponse, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  const half = Math.floor(max / 2);
  const head = value.slice(0, half);
  const tail = value.slice(-half);
  return `${head}\n… [content truncated, total ${value.length} chars] …\n${tail}`;
}

const SUGGESTED_PROMPTS = [
  {
    label: 'Hacker News · 10 pages',
    prompt:
      'Scrape the first 10 pages of Hacker News, capturing title, score, author, and link.',
  },
  {
    label: 'Zendesk Apps · 3 pages',
    prompt:
      'Scrape the first 3 pages of https://www.zendesk.com/marketplace/apps/, capturing app name, description, type, ratings.',
  },
  {
    label: 'Amazon joggers · 2 pages',
    prompt:
      'Get the first 2 pages on Amazon for mens jogger pants, extracting product name, rating, price.',
  },
];
