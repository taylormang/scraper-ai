'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function ExecutionsPage() {
  const [executions, setExecutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadExecutions();
  }, []);

  const loadExecutions = async () => {
    try {
      setLoading(true);
      const response = await api.executions.list();
      setExecutions(response.data.executions || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load executions');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 dark:text-green-400';
      case 'running':
        return 'text-blue-600 dark:text-blue-400';
      case 'failed':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen px-6 py-20 bg-gray-50 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto">
          <div className="text-center text-gray-600 dark:text-gray-400">Loading executions...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-20 bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">Executions</h1>

        {error && (
          <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-400 font-semibold">Error</p>
            <p className="text-red-600 dark:text-red-300">{error}</p>
          </div>
        )}

        {executions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No executions yet. Create and execute a recipe to get started!
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Create Recipe
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {executions.map((execution) => (
              <div
                key={execution.id}
                className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      {execution.recipe_name}
                    </h2>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                        {execution.id}
                      </code>
                      <span className={`text-sm font-semibold ${getStatusColor(execution.status)}`}>
                        {execution.status}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/executions/${execution.id}`}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                  >
                    View Logs
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Pages Scraped:</span>{' '}
                    <span className="text-gray-600 dark:text-gray-400">
                      {execution.stats?.pages_scraped || 0}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Items Scraped:</span>{' '}
                    <span className="text-gray-600 dark:text-gray-400">
                      {execution.stats?.items_scraped || 0}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Errors:</span>{' '}
                    <span className="text-gray-600 dark:text-gray-400">
                      {execution.stats?.errors || 0}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Started:</span>{' '}
                    <span className="text-gray-600 dark:text-gray-400">
                      {execution.started_at
                        ? new Date(execution.started_at).toLocaleString()
                        : 'Not started'}
                    </span>
                  </div>
                </div>

                {execution.error && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                    <p className="text-sm text-red-700 dark:text-red-400">
                      <span className="font-semibold">Error:</span> {execution.error}
                    </p>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex gap-4 text-sm">
                  <Link
                    href={`/recipes/${execution.recipe_id}`}
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    View Recipe →
                  </Link>
                  {execution.status === 'completed' && (
                    <Link
                      href={`/datasets?execution_id=${execution.id}`}
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View Dataset →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
