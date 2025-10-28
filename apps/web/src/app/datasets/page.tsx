'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function DatasetsPage() {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<any | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDatasets();
  }, []);

  const loadDatasets = async () => {
    try {
      setLoading(true);
      const response = await api.datasets.list();
      setDatasets(response.data.datasets || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load datasets');
    } finally {
      setLoading(false);
    }
  };

  const loadDatasetItems = async (datasetId: string) => {
    try {
      setLoadingItems(true);
      const response = await api.datasets.getItems(datasetId, 100);
      setItems(response.data.items || []);
      setSelectedDataset(datasets.find((d) => d.id === datasetId));
    } catch (err: any) {
      setError(err.message || 'Failed to load dataset items');
    } finally {
      setLoadingItems(false);
    }
  };

  const downloadJSON = (datasetId: string) => {
    const dataset = datasets.find((d) => d.id === datasetId);
    if (!dataset) return;

    // Create blob with pretty-printed JSON
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${datasetId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <main className="min-h-screen px-6 py-20 bg-gray-50 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto">
          <div className="text-center text-gray-600 dark:text-gray-400">Loading datasets...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-20 bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">Datasets</h1>

        {error && (
          <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-400 font-semibold">Error</p>
            <p className="text-red-600 dark:text-red-300">{error}</p>
          </div>
        )}

        {datasets.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">
              No datasets yet. Execute a recipe to create your first dataset!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Datasets List */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                All Datasets ({datasets.length})
              </h2>
              <div className="space-y-3">
                {datasets.map((dataset) => (
                  <div
                    key={dataset.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedDataset?.id === dataset.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700'
                    }`}
                    onClick={() => loadDatasetItems(dataset.id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                        {dataset.id}
                      </code>
                      <span
                        className={`text-sm font-semibold ${
                          dataset.stats.item_count > 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {dataset.stats.item_count} items
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      <div>Recipe: {dataset.recipe_id}</div>
                      <div>Execution: {dataset.execution_id}</div>
                      <div>Created: {new Date(dataset.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dataset Details */}
            <div>
              {selectedDataset ? (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Dataset Items
                    </h2>
                    <div className="flex gap-2">
                      <Link
                        href={`/recipes/${selectedDataset.recipe_id}`}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors"
                      >
                        View Recipe
                      </Link>
                      <Link
                        href={`/executions/${selectedDataset.execution_id}`}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
                      >
                        View Logs
                      </Link>
                      <button
                        onClick={() => downloadJSON(selectedDataset.id)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                        disabled={items.length === 0}
                      >
                        ↓ Download JSON
                      </button>
                    </div>
                  </div>

                  {loadingItems ? (
                    <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                      Loading items...
                    </div>
                  ) : items.length === 0 ? (
                    <div className="p-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-center">
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        No items in this dataset. The scrape may have failed or is still running.
                      </p>
                      <Link
                        href={`/executions/${selectedDataset.execution_id}`}
                        className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                      >
                        View Execution Logs
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                      {items.map((item, idx) => (
                        <div
                          key={item.id}
                          className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                              Item {idx + 1}
                            </span>
                            <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                              {item.id}
                            </code>
                          </div>

                          {item.source_url && (
                            <div className="mb-2 text-xs text-gray-600 dark:text-gray-400">
                              <a
                                href={item.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                {item.source_url}
                              </a>
                            </div>
                          )}

                          <div className="space-y-1">
                            {Object.entries(item.data || {})
                              .filter(([key]) => key !== '_raw')
                              .map(([key, value]) => (
                                <div key={key} className="text-sm">
                                  <span className="font-medium text-gray-700 dark:text-gray-300">
                                    {key}:
                                  </span>{' '}
                                  <span className="text-gray-600 dark:text-gray-400">
                                    {value !== null && value !== undefined
                                      ? typeof value === 'object'
                                        ? JSON.stringify(value)
                                        : String(value)
                                      : 'null'}
                                  </span>
                                </div>
                              ))}
                          </div>

                          <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                            Scraped: {new Date(item.scraped_at).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-600 dark:text-gray-400">
                  Select a dataset to view its items
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
