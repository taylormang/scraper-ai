import type { ReactNode } from 'react';

interface PlannerStepCardProps {
  title: string;
  subtitle: string;
  headerAction?: ReactNode;
  children: ReactNode;
}

export function PlannerStepCard({ title, subtitle, headerAction, children }: PlannerStepCardProps) {
  return (
    <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
      <header className="mb-4 space-y-1">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
          </div>
          {headerAction}
        </div>
      </header>
      {children}
    </section>
  );
}
