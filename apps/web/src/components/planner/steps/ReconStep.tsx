import type { ChangeEventHandler } from 'react';
import type { ReconResponse, PaginationInferenceResponse } from '@/types/planner';
import { PlannerStepCard } from '../PlannerStepCard';
import { truncate } from '../helpers';

export interface ReconStepProps {
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  reconResponse: ReconResponse | null;
  reconUrl: string;
  planHasBaseUrl: boolean;
  onReconUrlChange: ChangeEventHandler<HTMLInputElement>;
  onRunRecon: () => void;
  metadataSnapshot: Record<string, unknown> | null;
  paginationResponse: PaginationInferenceResponse | null;
}

export function ReconStep({
  status,
  error,
  reconResponse,
  reconUrl,
  planHasBaseUrl,
  onReconUrlChange,
  onRunRecon,
  metadataSnapshot,
  paginationResponse,
}: ReconStepProps) {
  return (
    <PlannerStepCard
      title="Step 2 · Recon"
      subtitle="Fetch the base page once to understand its structure."
      headerAction={
        <div className="flex flex-col md:flex-row md:items-center gap-2 mt-3 md:mt-0">
          <input
            type="url"
            value={reconUrl}
            onChange={onReconUrlChange}
            placeholder="https://example.com"
            className="w-full md:w-72 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={onRunRecon}
            disabled={status === 'loading' || !reconUrl}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-blue-700 disabled:bg-blue-400"
          >
            {status === 'loading' ? 'Running…' : 'Run Recon'}
          </button>
        </div>
      }
    >
      {status === 'error' && error && (
        <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
      )}
      {status === 'loading' && (
        <p className="text-sm text-gray-600 dark:text-gray-400">Fetching base page…</p>
      )}
      {status === 'success' && reconResponse && (
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Recon URL</h3>
            <p className="mt-1 break-words">{reconResponse.url}</p>
          </div>
          {reconResponse.metadata && (
            <details>
              <summary className="cursor-pointer text-blue-600 dark:text-blue-400 text-xs">
                View metadata JSON
              </summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap bg-gray-50 dark:bg-gray-950 rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-gray-200">
                {JSON.stringify(reconResponse.metadata, null, 2)}
              </pre>
            </details>
          )}
          {metadataSnapshot && (
            <details>
              <summary className="cursor-pointer text-blue-600 dark:text-blue-400 text-xs">
                View metadata snapshot JSON
              </summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap bg-gray-50 dark:bg-gray-950 rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-gray-200">
                {JSON.stringify(metadataSnapshot, null, 2)}
              </pre>
            </details>
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
          {paginationResponse?.summary && !reconResponse?.summary && (
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
      {status === 'idle' && planHasBaseUrl && !reconResponse && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Planner did not specify a base URL. Provide one above to continue.
        </p>
      )}
    </PlannerStepCard>
  );
}
