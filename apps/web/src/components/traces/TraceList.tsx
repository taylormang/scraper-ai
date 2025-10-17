'use client';

import { useEffect, useState } from 'react';
import { getApiBaseUrl } from '@/lib/config';
import type { TraceRecord } from '@/types/trace';

type Status = 'idle' | 'loading' | 'success' | 'error';

export function TraceList() {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [traces, setTraces] = useState<TraceRecord[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setStatus('loading');
      setError(null);
      try {
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/api/traces?limit=100`);
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || 'Failed to load traces');
        }

        setTraces(json.data.traces as TraceRecord[]);
        setStatus('success');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        setStatus('error');
      }
    };

    run();
  }, []);

  if (status === 'loading') {
    return <p className="text-sm text-gray-600 dark:text-gray-400">Loading traces…</p>;
  }

  if (status === 'error') {
    return (
      <p className="text-sm text-red-500 dark:text-red-400">
        Failed to load traces: {error}
      </p>
    );
  }

  if (!traces.length) {
    return (
      <p className="text-sm text-gray-600 dark:text-gray-400">
        No traces recorded yet.
      </p>
    );
  }

  const toggle = (id: string) => {
    setExpanded((current) => (current === id ? null : id));
  };

  return (
    <div className="space-y-3">
      {traces.map((trace) => {
        const isExpanded = expanded === trace.id;
        return (
          <div
            key={trace.id}
            className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
          >
            <button
              type="button"
              onClick={() => toggle(trace.id)}
              className="w-full text-left px-5 py-4 flex items-center justify-between text-sm"
            >
              <div className="space-y-1">
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {trace.type}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(trace.createdAt).toLocaleString()} · {trace.model}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                  {trace.prompt}
                </div>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {isExpanded ? 'Hide' : 'View'}
              </span>
            </button>
            {isExpanded && (
              <div className="px-5 pb-5 space-y-4 text-sm">
                <section>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    Prompt
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {trace.prompt}
                  </p>
                </section>
                {trace.response !== undefined && (
                  <section>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      Response
                    </h3>
                    <pre className="overflow-x-auto whitespace-pre-wrap bg-gray-50 dark:bg-gray-950 rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-gray-200">
{JSON.stringify(trace.response, null, 2)}
                    </pre>
                  </section>
                )}
                {trace.metadata !== undefined && (
                  <section>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      Metadata
                    </h3>
                    <pre className="overflow-x-auto whitespace-pre-wrap bg-gray-50 dark:bg-gray-950 rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-gray-200">
{JSON.stringify(trace.metadata, null, 2)}
                    </pre>
                  </section>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
