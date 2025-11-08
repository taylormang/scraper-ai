'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function RecipeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const recipeId = params.id as string;

  const [recipe, setRecipe] = useState<any | null>(null);
  const [executions, setExecutions] = useState<any[]>([]);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updatePrompt, setUpdatePrompt] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState<string[] | null>(null);

  useEffect(() => {
    loadRecipe();
    loadExecutions();
    loadDatasets();
  }, [recipeId]);

  const loadRecipe = async () => {
    try {
      setLoading(true);
      const response = await api.recipes.get(recipeId);
      setRecipe(response.data.recipe);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load recipe');
    } finally {
      setLoading(false);
    }
  };

  const loadExecutions = async () => {
    try {
      const response = await api.executions.list(recipeId);
      setExecutions(response.data.executions || []);
    } catch (err: any) {
      console.error('Failed to load executions:', err);
    }
  };

  const loadDatasets = async () => {
    try {
      const response = await api.datasets.list(recipeId);
      setDatasets(response.data.datasets || []);
    } catch (err: any) {
      console.error('Failed to load datasets:', err);
    }
  };

  const handleExecute = async () => {
    try {
      setExecuting(true);
      const response = await api.recipes.execute(recipeId, 'default_user');
      const executionId = response.data.execution.id;
      router.push(`/executions/${executionId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to execute recipe');
    } finally {
      setExecuting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updatePrompt.trim()) return;

    try {
      setUpdating(true);
      setUpdateSuccess(null);
      const response = await api.recipes.update(recipeId, { prompt: updatePrompt });

      // Show what changed
      if (response.data.changes && response.data.changes.length > 0) {
        setUpdateSuccess(response.data.changes);
      } else {
        setUpdateSuccess(['No changes needed - recipe already matches your request']);
      }

      // Reload recipe to show updated data
      await loadRecipe();
      setUpdatePrompt('');

      // Close modal after 3 seconds
      setTimeout(() => {
        setShowUpdateModal(false);
        setUpdateSuccess(null);
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update recipe');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${recipe.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      setDeleting(true);
      await api.recipes.delete(recipeId);
      router.push('/recipes');
    } catch (err: any) {
      setError(err.message || 'Failed to delete recipe');
      setDeleting(false);
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
          <div className="text-center text-gray-600 dark:text-gray-400">Loading recipe...</div>
        </div>
      </main>
    );
  }

  if (error && !recipe) {
    return (
      <main className="min-h-screen px-6 py-20 bg-gray-50 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-400 font-semibold">Error</p>
            <p className="text-red-600 dark:text-red-300">{error}</p>
          </div>
          <Link href="/recipes" className="mt-4 inline-block text-blue-600 dark:text-blue-400 hover:underline">
            ← Back to Recipes
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-20 bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link href="/recipes" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
            ← Back to Recipes
          </Link>
        </div>

        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">{recipe.name}</h1>
            {recipe.description && (
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">{recipe.description}</p>
            )}
            <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{recipe.id}</code>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExecute}
              disabled={executing}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              {executing ? 'Executing...' : '▶ Execute'}
            </button>
            <button
              onClick={() => setShowUpdateModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              ✏ Update
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-400 font-semibold">Error</p>
            <p className="text-red-600 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Update Modal */}
        {showUpdateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 max-w-2xl w-full">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Update Recipe
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Describe what you'd like to change. For example: "Change to 20 pages" or "Add a 'score' field"
              </p>

              {updateSuccess && (
                <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-green-700 dark:text-green-400 font-semibold mb-2">✓ Recipe Updated</p>
                  <ul className="text-sm text-green-600 dark:text-green-300 space-y-1">
                    {updateSuccess.map((change, i) => (
                      <li key={i}>• {change}</li>
                    ))}
                  </ul>
                </div>
              )}

              <form onSubmit={handleUpdate}>
                <textarea
                  value={updatePrompt}
                  onChange={(e) => setUpdatePrompt(e.target.value)}
                  placeholder="e.g., Change to scrape 20 pages instead of 10"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 mb-4"
                  rows={4}
                  disabled={updating}
                  required
                />

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUpdateModal(false);
                      setUpdatePrompt('');
                      setUpdateSuccess(null);
                    }}
                    disabled={updating}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updating || !updatePrompt.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
                  >
                    {updating ? 'Updating...' : 'Update Recipe'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Configuration */}
          <div className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Configuration</h2>
            <div className="space-y-3 text-sm">
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">URL:</span>{' '}
                <a
                  href={recipe.base_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {recipe.base_url}
                </a>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Strategy:</span>{' '}
                <span className="text-gray-600 dark:text-gray-400">{recipe.extraction.limit_strategy}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Pages:</span>{' '}
                <span className="text-gray-600 dark:text-gray-400">
                  {recipe.extraction.page_count || 'N/A'}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Status:</span>{' '}
                <span
                  className={
                    recipe.status === 'active'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-600 dark:text-gray-400'
                  }
                >
                  {recipe.status}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Engine:</span>{' '}
                <span className="text-gray-600 dark:text-gray-400">{recipe.execution.engine}</span>
              </div>
            </div>
          </div>

          {/* Fields */}
          <div className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Fields to Extract</h2>
            <ul className="space-y-2 text-sm">
              {recipe.extraction.fields.map((field: any) => (
                <li key={field.name} className="text-gray-600 dark:text-gray-400">
                  • <span className="font-medium">{field.name}</span>{' '}
                  <span className="text-gray-500 dark:text-gray-500">({field.type})</span>
                  {field.required && <span className="text-red-500 dark:text-red-400">*</span>}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Executions */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Executions ({executions.length})
          </h2>
          {executions.length === 0 ? (
            <div className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-center">
              <p className="text-gray-600 dark:text-gray-400">No executions yet. Execute this recipe to get started!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {executions.slice(0, 5).map((execution) => (
                <div
                  key={execution.id}
                  className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                          {execution.id}
                        </code>
                        <span className={`text-sm font-semibold ${getStatusColor(execution.status)}`}>
                          {execution.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {execution.stats?.items_scraped || 0} items • {execution.stats?.pages_scraped || 0} pages
                        {execution.started_at && (
                          <> • {new Date(execution.started_at).toLocaleString()}</>
                        )}
                      </div>
                    </div>
                    <Link
                      href={`/executions/${execution.id}`}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                    >
                      View Logs
                    </Link>
                  </div>
                </div>
              ))}
              {executions.length > 5 && (
                <Link
                  href={`/executions?recipe_id=${recipeId}`}
                  className="block text-center text-blue-600 dark:text-blue-400 hover:underline text-sm"
                >
                  View all {executions.length} executions →
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Datasets */}
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Datasets ({datasets.length})
          </h2>
          {datasets.length === 0 ? (
            <div className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-center">
              <p className="text-gray-600 dark:text-gray-400">No datasets yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {datasets.map((dataset) => (
                <Link
                  key={dataset.id}
                  href={`/datasets?id=${dataset.id}`}
                  className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
                >
                  <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded block mb-2">
                    {dataset.id}
                  </code>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {dataset.stats.item_count} items
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {new Date(dataset.created_at).toLocaleString()}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
