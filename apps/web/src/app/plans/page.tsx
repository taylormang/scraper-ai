import Link from 'next/link';
import { getApiBaseUrl } from '@/lib/config';
import type { PlanListItem } from '@/types/plan';

async function fetchPlans(): Promise<PlanListItem[]> {
  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/plans`, { cache: 'no-store' });
    if (!response.ok) {
      console.error('Failed to fetch plans', response.statusText);
      return [];
    }
    const json = await response.json();
    if (!json.success) {
      console.error('Plans endpoint returned error', json.error);
      return [];
    }
    const plans = json.data?.plans ?? [];
    return plans.map((item: any) => ({
      id: item.plan.id,
      prompt: item.plan.prompt,
      status: item.plan.status,
      site: item.recipe?.site ?? null,
      baseUrl: item.plan.baseUrl ?? null,
      startingUrl: item.plan.startingUrl ?? null,
      recipeId: item.recipe?.id ?? null,
      run: item.run
        ? {
            id: item.run.id,
            status: item.run.status,
            createdAt: item.run.createdAt,
            completedAt: item.run.completedAt ?? null,
          }
        : null,
    }));
  } catch (error) {
    console.error('Failed to fetch plans', error);
    return [];
  }
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default async function PlansPage() {
  const plans = await fetchPlans();

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 px-6 py-10 md:px-12">
      <div className="mx-auto max-w-5xl space-y-8">
        <section className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Plans
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Review saved plans and reuse them to trigger new runs.
          </p>
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Prompt
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Site
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Last Run
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {plans.map((plan) => (
                <tr key={plan.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-900/60">
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                    <Link
                      href={`/plans/${plan.id}`}
                      className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {plan.prompt}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                    <div>{plan.site ?? '—'}</div>
                    {plan.baseUrl && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {plan.baseUrl}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                    {plan.run ? formatDate(plan.run.createdAt) : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 capitalize">
                    {plan.status}
                  </td>
                </tr>
              ))}
              {plans.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No plans yet. Run a scrape to capture planning data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
