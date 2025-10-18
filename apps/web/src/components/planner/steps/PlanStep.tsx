import type { PlanResponse } from '@/types/planner';
import { PlannerStepCard } from '../PlannerStepCard';

export interface PlanStepProps {
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  plan: PlanResponse | null;
}

export function PlanStep({ status, error, plan }: PlanStepProps) {
  return (
    <PlannerStepCard
      title="Step 1 · Plan"
      subtitle="Natural-language prompt translated into a structured scrape plan."
    >
      {status === 'loading' && (
        <p className="text-sm text-gray-600 dark:text-gray-400">Generating plan…</p>
      )}
      {status === 'error' && error && (
        <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
      )}
      {status === 'success' && plan && (
        <div className="space-y-4">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700 dark:text-gray-300">
            <div>
              <dt className="font-semibold text-gray-900 dark:text-gray-100">Objective</dt>
              <dd className="mt-1">{plan.plan.objective}</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-900 dark:text-gray-100">Base URL</dt>
              <dd className="mt-1">{plan.plan.baseUrl || 'Not specified'}</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-900 dark:text-gray-100">Extraction Format</dt>
              <dd className="mt-1 uppercase">{plan.plan.extractionFormat}</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-900 dark:text-gray-100">Pagination Target</dt>
              <dd className="mt-1">
                {plan.plan.pagination.strategy === 'unknown'
                  ? 'Unknown'
                  : `${plan.plan.pagination.strategy} → ${
                      plan.plan.pagination.targetValue ?? 'n/a'
                    }`}
              </dd>
            </div>
          </dl>

          {plan.plan.extractionFields.length > 0 && (
            <section className="text-sm">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Fields</h3>
              <ul className="mt-2 space-y-1 text-gray-700 dark:text-gray-300">
                {plan.plan.extractionFields.map((field) => (
                  <li key={field.name}>
                    <span className="font-medium">{field.name}</span> – {field.description}
                    {!field.required && (
                      <span className="text-xs text-gray-500"> (optional)</span>
                    )}
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
              {JSON.stringify(plan, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </PlannerStepCard>
  );
}
