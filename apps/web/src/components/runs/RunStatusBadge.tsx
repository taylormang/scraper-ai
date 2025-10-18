import type { RunStatus } from '@/types/run';

interface RunStatusBadgeProps {
  status: RunStatus;
}

const STATUS_STYLES: Record<RunStatus, string> = {
  queued: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  running: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-300',
  failed: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300',
  cancelled: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-300',
};

export function RunStatusBadge({ status }: RunStatusBadgeProps) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {label}
    </span>
  );
}
