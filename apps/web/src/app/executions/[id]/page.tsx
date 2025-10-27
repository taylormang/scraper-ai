'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function ExecutionDetailPage() {
  const params = useParams();
  const executionId = params.id as string;

  const [execution, setExecution] = useState<any | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadExecution();

    // Auto-refresh every 3 seconds if execution is running
    const interval = setInterval(() => {
      if (autoRefresh) {
        loadExecution();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [executionId, autoRefresh]);

  const loadExecution = async () => {
    try {
      const response = await api.executions.get(executionId);
      const exec = response.data.execution;
      const execLogs = response.data.logs || [];

      setExecution(exec);
      setLogs(execLogs);
      setError(null);

      // Stop auto-refresh if execution is complete
      if (exec.status === 'completed' || exec.status === 'failed' || exec.status === 'cancelled') {
        setAutoRefresh(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load execution');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen px-6 py-20 bg-gray-50 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto">
          <div className="text-center text-gray-600 dark:text-gray-400">Loading execution...</div>
        </div>
      </main>
    );
  }

  if (error || !execution) {
    return (
      <main className="min-h-screen px-6 py-20 bg-gray-50 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-400 font-semibold">Error</p>
            <p className="text-red-600 dark:text-red-300">{error || 'Execution not found'}</p>
          </div>
        </div>
      </main>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 dark:text-green-400';
      case 'failed':
        return 'text-red-600 dark:text-red-400';
      case 'running':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'cancelled':
        return 'text-gray-600 dark:text-gray-400';
      default:
        return 'text-blue-600 dark:text-blue-400';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'text-red-600 dark:text-red-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'info':
        return 'text-blue-600 dark:text-blue-400';
      case 'debug':
        return 'text-gray-600 dark:text-gray-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <main className="min-h-screen px-6 py-20 bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link
            href="/datasets"
            className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
          >
            ← Back to Datasets
          </Link>
        </div>

        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Execution Details
            </h1>
            <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
              {execution.id}
            </code>
          </div>
          <div className="flex items-center gap-3">
            {(execution.status === 'running' || execution.status === 'queued') && (
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded"
                />
                Auto-refresh
              </label>
            )}
            <span className={`text-lg font-semibold ${getStatusColor(execution.status)}`}>
              {execution.status.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Overview */}
          <div className="lg:col-span-1">
            <div className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Overview
              </h2>

              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-gray-500 dark:text-gray-500">Recipe</div>
                  <div className="text-gray-900 dark:text-white">
                    {execution.recipe_name || execution.recipe_id}
                  </div>
                </div>

                <div>
                  <div className="text-gray-500 dark:text-gray-500">Progress</div>
                  <div className="text-gray-900 dark:text-white">
                    {execution.progress?.percentage || 0}% ({execution.progress?.phase || 'unknown'}
                    )
                  </div>
                </div>

                {execution.progress?.current_page && (
                  <div>
                    <div className="text-gray-500 dark:text-gray-500">Pages</div>
                    <div className="text-gray-900 dark:text-white">
                      {execution.progress.current_page} / {execution.progress.total_pages || '?'}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-gray-500 dark:text-gray-500">Items Extracted</div>
                  <div className="text-gray-900 dark:text-white">
                    {execution.progress?.items_count || execution.stats?.items_scraped || 0}
                  </div>
                </div>

                {execution.dataset_id && (
                  <div>
                    <div className="text-gray-500 dark:text-gray-500">Dataset</div>
                    <Link
                      href={`/datasets?id=${execution.dataset_id}`}
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {execution.dataset_id}
                    </Link>
                  </div>
                )}

                {execution.error && (
                  <div>
                    <div className="text-gray-500 dark:text-gray-500">Error</div>
                    <div className="text-red-600 dark:text-red-400">{execution.error}</div>
                  </div>
                )}

                <div>
                  <div className="text-gray-500 dark:text-gray-500">Created</div>
                  <div className="text-gray-900 dark:text-white">
                    {new Date(execution.created_at).toLocaleString()}
                  </div>
                </div>

                {execution.started_at && (
                  <div>
                    <div className="text-gray-500 dark:text-gray-500">Started</div>
                    <div className="text-gray-900 dark:text-white">
                      {new Date(execution.started_at).toLocaleString()}
                    </div>
                  </div>
                )}

                {execution.completed_at && (
                  <div>
                    <div className="text-gray-500 dark:text-gray-500">Completed</div>
                    <div className="text-gray-900 dark:text-white">
                      {new Date(execution.completed_at).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Progress Events */}
            {execution.events && execution.events.length > 0 && (
              <div className="mt-6 p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Progress Events
                </h2>
                <div className="space-y-2 text-sm">
                  {execution.events.map((event: any, idx: number) => (
                    <div key={idx} className="flex gap-2">
                      <span className="text-gray-500 dark:text-gray-500 whitespace-nowrap">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                      <span className={getSeverityColor(event.type)}>{event.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Execution Logs */}
          <div className="lg:col-span-2">
            <div className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Execution Logs ({logs.length})
                </h2>
                <button
                  onClick={loadExecution}
                  className="px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-sm transition-colors"
                >
                  Refresh
                </button>
              </div>

              {logs.length === 0 ? (
                <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                  No logs yet
                </div>
              ) : (
                <div className="space-y-2 font-mono text-xs max-h-[600px] overflow-y-auto">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 bg-gray-50 dark:bg-gray-800 rounded border-l-4 border-gray-300 dark:border-gray-700"
                      style={{
                        borderLeftColor:
                          log.severity === 'error'
                            ? '#ef4444'
                            : log.severity === 'warning'
                              ? '#f59e0b'
                              : log.severity === 'info'
                                ? '#3b82f6'
                                : '#6b7280',
                      }}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className={`font-semibold ${getSeverityColor(log.severity)}`}>
                          [{log.severity.toUpperCase()}]
                        </span>
                        <span className="text-gray-500 dark:text-gray-500">
                          {new Date(log.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-gray-900 dark:text-white mb-1">{log.message}</div>
                      {log.payload && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                            Show payload
                          </summary>
                          <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-900 rounded overflow-x-auto text-gray-700 dark:text-gray-300">
                            {JSON.stringify(log.payload, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
