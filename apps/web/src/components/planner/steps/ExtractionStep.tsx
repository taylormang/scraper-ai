import type {
  ExtractionSchemaResponse,
  PaginationInferenceResponse,
  ReconResponse,
} from '@/types/planner';
import { PlannerStepCard } from '../PlannerStepCard';
import { stringifyForDisplay, truncate } from '../helpers';

export interface ExtractionStepProps {
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  extractionResponse: ExtractionSchemaResponse | null;
  reconResponse: ReconResponse | null;
  paginationResponse: PaginationInferenceResponse | null;
  planAvailable: boolean;
  onRunExtraction: () => void;
}

export function ExtractionStep({
  status,
  error,
  extractionResponse,
  reconResponse,
  paginationResponse,
  planAvailable,
  onRunExtraction,
}: ExtractionStepProps) {
  return (
    <PlannerStepCard
      title="Step 4 · Extraction Schema"
      subtitle="Refine the extraction prompt and capture a schema preview from the first page."
      headerAction={
        <div className="flex flex-col md:flex-row md:items-center gap-2 mt-3 md:mt-0">
          <button
            type="button"
            onClick={onRunExtraction}
            disabled={
              status === 'loading' ||
              !reconResponse ||
              !planAvailable ||
              (paginationResponse === null && status !== 'success')
            }
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-blue-700 disabled:bg-blue-400"
          >
            {status === 'loading' ? 'Planning…' : 'Re-run Extraction Schema'}
          </button>
        </div>
      }
    >
      {status === 'idle' && (!reconResponse || !paginationResponse) && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Complete pagination inference to plan the extraction schema.
        </p>
      )}
      {status === 'error' && error && (
        <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
      )}
      {status === 'loading' && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Tuning Firecrawl extraction prompt…
        </p>
      )}
      {status === 'success' && extractionResponse && (
        <div className="space-y-6 text-sm text-gray-700 dark:text-gray-300">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Refined Extraction Prompt
            </h3>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap bg-gray-50 dark:bg-gray-950 rounded-lg px-4 py-3 text-xs text-gray-800 dark:text-gray-200">
              {extractionResponse.refinedPrompt}
            </pre>
            {extractionResponse.notes && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Notes: {extractionResponse.notes}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FieldList title="LLM Suggested Fields" fields={extractionResponse.llmFields} />
            <FieldList title="Inferred From Sample" fields={extractionResponse.inferredFields} />
          </div>

          {extractionResponse.sample !== undefined && (
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Sample Output</h3>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap bg-gray-50 dark:bg-gray-950 rounded-lg px-4 py-3 text-xs text-gray-800 dark:text-gray-200">
                {truncate(stringifyForDisplay(extractionResponse.sample), 4000)}
              </pre>
            </div>
          )}

          {extractionResponse.rawExtract !== undefined && (
            <details>
              <summary className="cursor-pointer text-blue-600 dark:text-blue-400 text-xs">
                View raw Firecrawl extract response
              </summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap bg-gray-50 dark:bg-gray-950 rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-gray-200">
                {truncate(stringifyForDisplay(extractionResponse.rawExtract), 4000)}
              </pre>
            </details>
          )}
        </div>
      )}
    </PlannerStepCard>
  );
}

interface FieldListProps {
  title: string;
  fields: ExtractionSchemaResponse['llmFields'];
}

function FieldList({ title, fields }: FieldListProps) {
  if (!fields.length) {
    return (
      <div>
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          No fields detected for this category.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      <ul className="mt-2 space-y-2">
        {fields.map((field) => (
          <li
            key={`${title}-${field.name}`}
            className="rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-2"
          >
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {field.name}{' '}
              {!field.required && (
                <span className="text-xs text-gray-500 dark:text-gray-400">(optional)</span>
              )}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Type: {field.type}</p>
            {field.description && (
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{field.description}</p>
            )}
            {field.example !== undefined && (
              <details className="mt-2 text-xs">
                <summary className="cursor-pointer text-blue-600 dark:text-blue-400">
                  View example
                </summary>
                <pre className="mt-1 overflow-x-auto whitespace-pre-wrap bg-gray-50 dark:bg-gray-950 rounded-lg px-3 py-2 text-[11px] text-gray-800 dark:text-gray-200">
                  {truncate(stringifyForDisplay(field.example), 1200)}
                </pre>
              </details>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
