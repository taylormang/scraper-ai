import type { ReconResponse, PaginationInferenceResponse } from '@/types/planner';
import { PlannerStepCard } from '../PlannerStepCard';
import { getConfidenceIndicatorColor } from '../helpers';

export interface PaginationStepProps {
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  paginationResponse: PaginationInferenceResponse | null;
  reconResponse: ReconResponse | null;
  onRunPagination: () => void;
}

export function PaginationStep({
  status,
  error,
  paginationResponse,
  reconResponse,
  onRunPagination,
}: PaginationStepProps) {
  return (
    <PlannerStepCard
      title="Step 3 · Pagination Inference"
      subtitle="Analyze the recon output to identify pagination behaviour automatically."
      headerAction={
        <div className="flex flex-col md:flex-row md:items-center gap-2 mt-3 md:mt-0">
          <button
            type="button"
            onClick={onRunPagination}
            disabled={status === 'loading' || !reconResponse}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-blue-700 disabled:bg-blue-400"
          >
            {status === 'loading' ? 'Inferring…' : 'Re-run Inference'}
          </button>
        </div>
      }
    >
      {status === 'idle' && !reconResponse && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Run recon first to infer pagination.
        </p>
      )}
      {status === 'error' && error && (
        <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
      )}
      {status === 'loading' && (
        <p className="text-sm text-gray-600 dark:text-gray-400">Analyzing pagination…</p>
      )}
      {status === 'success' && paginationResponse && (
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
              <dd className="mt-1">
                <span className="inline-flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                  <span
                    aria-hidden="true"
                    className={`h-2.5 w-2.5 rounded-full ${getConfidenceIndicatorColor(
                      paginationResponse.pagination.confidence
                    )}`}
                  />
                  <span className="capitalize">
                    {paginationResponse.pagination.confidence}
                  </span>
                </span>
              </dd>
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
    </PlannerStepCard>
  );
}
