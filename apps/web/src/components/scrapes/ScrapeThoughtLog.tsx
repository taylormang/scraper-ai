import type { WorkflowLog, WorkflowStep, ThoughtEntry, WorkflowStepStatus } from '@/types/scrape';

interface ScrapeThoughtLogProps {
  workflow: WorkflowLog;
}

export function ScrapeThoughtLog({ workflow }: ScrapeThoughtLogProps) {
  if (!workflow.steps.length) {
    return null;
  }

  return (
    <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm">
      <header className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          Thought Log
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Lightweight transcript of each step with expandable details.
        </p>
      </header>
      <div className="px-5 py-4 space-y-5">
        {workflow.steps.map((step) => (
          <StepLog key={step.id} step={step} />
        ))}
      </div>
    </section>
  );
}

function StepLog({ step }: { step: WorkflowStep }) {
  const duration = computeDuration(step.startedAt, step.completedAt);

  return (
    <article className="space-y-3">
      <header className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {step.label}
        </h3>
        <StepStatusBadge status={step.status} />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {renderTiming(step.startedAt, step.completedAt)}
          {duration ? ` · ${duration}` : ''}
        </p>
      </header>

      {step.thoughts.length === 0 ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          No thoughts recorded.
        </p>
      ) : (
        <ol className="space-y-2 border-l border-gray-200 dark:border-gray-800 pl-3">
          {step.thoughts.map((thought) => (
            <ThoughtEntryItem key={thought.id} thought={thought} />
          ))}
        </ol>
      )}
    </article>
  );
}

function ThoughtEntryItem({ thought }: { thought: ThoughtEntry }) {
  const hasBody = thought.body !== undefined && thought.body !== null;
  const severityColor = getSeverityColor(thought.severity);
  const timestamp = formatTime(thought.createdAt);

  if (!hasBody) {
    return (
      <li className="flex items-start gap-2">
        <span aria-hidden="true" className={`mt-1 h-2 w-2 rounded-full ${severityColor}`} />
        <div className="flex-1 space-y-1">
          <p className="text-sm text-gray-800 dark:text-gray-200">{thought.text}</p>
          <time className="block text-xs text-gray-500 dark:text-gray-400">{timestamp}</time>
        </div>
      </li>
    );
  }

  return (
    <li>
      <details className="group">
        <summary className="flex cursor-pointer items-start gap-2">
          <span
            aria-hidden="true"
            className={`mt-1 h-2 w-2 flex-none rounded-full ${severityColor}`}
          />
          <div className="flex-1 space-y-1">
            <p className="text-sm text-gray-800 dark:text-gray-200">{thought.text}</p>
            <time className="block text-xs text-gray-500 dark:text-gray-400">{timestamp}</time>
          </div>
          <span className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
            {`Expand`}
          </span>
        </summary>
        <ThoughtBody body={thought.body} />
      </details>
    </li>
  );
}

function ThoughtBody({ body }: { body: unknown }) {
  if (typeof body === 'string') {
    const trimmed = body.trim();
    return (
      <p className="mt-2 rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-2 text-xs leading-relaxed text-gray-700 dark:text-gray-300">
        {trimmed.length ? trimmed : '(empty)'}
      </p>
    );
  }

  const json = safeStringify(body);
  return (
    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-gray-900/80 px-3 py-2 text-[11px] text-gray-100">
{json}
    </pre>
  );
}

function StepStatusBadge({ status }: { status: WorkflowStepStatus }) {
  const styles: Record<WorkflowStepStatus, string> = {
    pending:
      'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    in_progress:
      'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
    success:
      'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-300',
    error: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300',
  };

  const label = status.replace('_', ' ');

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${styles[status]}`}
    >
      {label}
    </span>
  );
}

function getSeverityColor(severity: ThoughtEntry['severity']): string {
  switch (severity) {
    case 'warning':
      return 'bg-yellow-400';
    case 'error':
      return 'bg-red-500';
    default:
      return 'bg-blue-500';
  }
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown time';
  }
  return new Intl.DateTimeFormat('en', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

function renderTiming(startedAt?: string, completedAt?: string): string {
  const start = startedAt ? new Date(startedAt) : null;
  const end = completedAt ? new Date(completedAt) : null;

  if (start && !Number.isNaN(start.getTime())) {
    if (end && !Number.isNaN(end.getTime())) {
      return `Started ${formatRelative(start)} · Finished ${formatRelative(end)}`;
    }
    return `Started ${formatRelative(start)}`;
  }

  if (end && !Number.isNaN(end.getTime())) {
    return `Finished ${formatRelative(end)}`;
  }

  return 'Timing unknown';
}

function formatRelative(date: Date): string {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function computeDuration(startedAt?: string, completedAt?: string): string | null {
  if (!startedAt || !completedAt) {
    return null;
  }

  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();

  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return null;
  }

  const durationMs = end - start;
  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }

  const seconds = durationMs / 1000;
  return `${seconds.toFixed(2)}s`;
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? 'null';
  } catch {
    return String(value);
  }
}
