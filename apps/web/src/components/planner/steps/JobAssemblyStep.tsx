import type { JobAssemblyResponse } from '@/types/planner';
import { PlannerStepCard } from '../PlannerStepCard';
import { stringifyForDisplay } from '../helpers';

export interface JobAssemblyStepProps {
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  jobResponse: JobAssemblyResponse | null;
  hasExtraction: boolean;
  onRunJobAssembly: () => void;
}

export function JobAssemblyStep({
  status,
  error,
  jobResponse,
  hasExtraction,
  onRunJobAssembly,
}: JobAssemblyStepProps) {
  return (
    <PlannerStepCard
      title="Step 5 · Job Assembly"
      subtitle="Merge plan, pagination, and extraction details into a Firecrawl crawl payload."
      headerAction={
        <div className="flex flex-col md:flex-row md:items-center gap-2 mt-3 md:mt-0">
          <button
            type="button"
            onClick={onRunJobAssembly}
            disabled={status === 'loading' || !hasExtraction}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-blue-700 disabled:bg-blue-400"
          >
            {status === 'loading' ? 'Assembling…' : 'Re-run Job Assembly'}
          </button>
        </div>
      }
    >
      {status === 'idle' && !hasExtraction && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Complete extraction schema planning to generate the crawl configuration.
        </p>
      )}
      {status === 'error' && error && (
        <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
      )}
      {status === 'loading' && (
        <p className="text-sm text-gray-600 dark:text-gray-400">Building job configuration…</p>
      )}
      {status === 'success' && jobResponse && (
        <div className="space-y-6 text-sm text-gray-700 dark:text-gray-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Summary</h3>
              <ul className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-400">
                <li>
                  <span className="font-medium text-gray-900 dark:text-gray-100">Objective:</span>{' '}
                  {jobResponse.summary.objective}
                </li>
                <li>
                  <span className="font-medium text-gray-900 dark:text-gray-100">Base URL:</span>{' '}
                  {jobResponse.summary.baseUrl ?? 'Unknown'}
                </li>
                <li>
                  <span className="font-medium text-gray-900 dark:text-gray-100">Pagination:</span>{' '}
                  {jobResponse.summary.paginationStrategy
                    ? `${jobResponse.summary.paginationStrategy} (confidence ${jobResponse.summary.paginationConfidence ?? 'n/a'})`
                    : 'Single page'}
                </li>
                <li>
                  <span className="font-medium text-gray-900 dark:text-gray-100">Extraction format:</span>{' '}
                  {jobResponse.summary.extractionFormat}
                </li>
                <li>
                  <span className="font-medium text-gray-900 dark:text-gray-100">Total fields:</span>{' '}
                  {jobResponse.summary.totalFields}
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Warnings &amp; Notes</h3>
              {jobResponse.warnings.length === 0 && jobResponse.notes.length === 0 ? (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  No warnings or additional notes.
                </p>
              ) : (
                <ul className="mt-2 space-y-1 text-xs">
                  {jobResponse.warnings.map((warning, index) => (
                    <li key={`warn-${index}`} className="text-yellow-600 dark:text-yellow-400">
                      ⚠ {warning}
                    </li>
                  ))}
                  {jobResponse.notes.map((note, index) => (
                    <li key={`note-${index}`} className="text-gray-600 dark:text-gray-400">
                      • {note}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Schema Fields</h3>
            {jobResponse.schema.fields.length === 0 ? (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                No fields configured for extraction.
              </p>
            ) : (
              <div className="mt-2 overflow-auto rounded-lg border border-gray-200 dark:border-gray-800">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-800/60">
                    <tr className="text-left text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      <th className="px-3 py-2 font-medium">Name</th>
                      <th className="px-3 py-2 font-medium">Type</th>
                      <th className="px-3 py-2 font-medium">Required</th>
                      <th className="px-3 py-2 font-medium">Source</th>
                      <th className="px-3 py-2 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900">
                    {jobResponse.schema.fields.map((field) => (
                      <tr key={`schema-${field.name}`}>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{field.name}</td>
                        <td className="px-3 py-2">{field.type}</td>
                        <td className="px-3 py-2">{field.required ? 'Yes' : 'No'}</td>
                        <td className="px-3 py-2 capitalize">{field.source}</td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{field.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Firecrawl Crawl Config</h3>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap bg-gray-50 dark:bg-gray-950 rounded-lg px-4 py-3 text-xs text-gray-800 dark:text-gray-200">
{stringifyForDisplay(jobResponse.crawlConfig)}
            </pre>
          </div>
        </div>
      )}
    </PlannerStepCard>
  );
}
