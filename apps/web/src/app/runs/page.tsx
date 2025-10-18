import { RunPromptForm } from '@/components/runs/RunPromptForm';
import { RunListTable } from '@/components/runs/RunListTable';
import type { RunListItem } from '@/types/run';
import { getApiBaseUrl } from '@/lib/config';

async function fetchRuns(): Promise<RunListItem[]> {
  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/runs`, { cache: 'no-store' });
    if (!response.ok) {
      console.error('Failed to fetch runs', response.statusText);
      return [];
    }
    const json = await response.json();
    if (!json.success) {
      console.error('Runs endpoint returned error', json.error);
      return [];
    }
    const runs: RunListItem[] = json.data?.runs ?? [];
    return runs;
  } catch (error) {
    console.error('Failed to fetch runs', error);
    return [];
  }
}

export default async function RunsPage() {
  const runs = await fetchRuns();

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 px-6 py-10 md:px-12">
      <div className="mx-auto max-w-6xl space-y-10">
        <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6 shadow-sm">
          <header className="space-y-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Trigger a run
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Submit a prompt to orchestrate the end-to-end planning workflow. Runs persist and
              stream progress in real time.
            </p>
          </header>
          <div className="mt-6">
            <RunPromptForm />
          </div>
        </section>

        <section className="space-y-4">
          <header className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Recent Runs
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Showing {runs.length} {runs.length === 1 ? 'run' : 'runs'}
            </span>
          </header>
          <RunListTable runs={runs} />
        </section>
      </div>
    </main>
  );
}
