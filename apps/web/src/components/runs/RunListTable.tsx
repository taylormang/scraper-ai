import Link from 'next/link';
import type { RunListItem } from '@/types/run';
import { RunStatusBadge } from '@/components/runs/RunStatusBadge';

interface RunListTableProps {
  runs: RunListItem[];
}

function formatDate(value: string | null | undefined): string {
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

function truncate(text: string, max = 80): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export function RunListTable({ runs }: RunListTableProps) {
  if (!runs.length) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 p-10 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          No runs yet. Start by submitting a prompt above.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Prompt
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Start URL
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Created
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Last Updated
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
          {runs.map((run) => (
            <tr key={run.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-900/60">
              <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                <Link
                  href={`/runs/${run.id}`}
                  className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {truncate(run.prompt)}
                </Link>
              </td>
              <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 space-y-1">
                <RunStatusBadge status={run.status} />
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Phase: {run.phase}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Plan: {run.planStatus ?? '—'}
                </div>
                {run.error && (
                  <div className="text-xs text-red-500 dark:text-red-400">{run.error}</div>
                )}
              </td>
              <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                {run.startUrl ? (
                  <a
                    href={run.startUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {truncate(run.startUrl, 50)}
                  </a>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
                {run.site && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">{run.site}</div>
                )}
              </td>
              <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                {formatDate(run.createdAt)}
              </td>
              <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                {formatDate(run.updatedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
