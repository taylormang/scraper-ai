'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [executing, setExecuting] = useState<string | null>(null);

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    try {
      setLoading(true);
      const response = await api.recipes.list('default_user');
      setRecipes(response.data.recipes || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load recipes');
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async (recipeId: string) => {
    try {
      setExecuting(recipeId);
      await api.recipes.execute(recipeId, 'default_user');
      // Reload recipes to get updated stats
      await loadRecipes();
    } catch (err: any) {
      setError(err.message || 'Failed to execute recipe');
    } finally {
      setExecuting(null);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen px-6 py-20 bg-gray-50 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto">
          <div className="text-center text-gray-600 dark:text-gray-400">Loading recipes...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-20 bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Recipes</h1>
          <Link
            href="/"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            + New Recipe
          </Link>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-400 font-semibold">Error</p>
            <p className="text-red-600 dark:text-red-300">{error}</p>
          </div>
        )}

        {recipes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No recipes yet. Create your first recipe!
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Create Recipe
            </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {recipes.map((recipe) => (
              <div
                key={recipe.id}
                className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
              >
                <div className="flex justify-between items-start mb-4">
                  <Link href={`/recipes/${recipe.id}`} className="flex-1">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                      {recipe.name}
                    </h2>
                    {recipe.description && (
                      <p className="text-gray-600 dark:text-gray-400 mb-2">{recipe.description}</p>
                    )}
                    <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                      {recipe.id}
                    </code>
                  </Link>
                  <button
                    onClick={() => handleExecute(recipe.id)}
                    disabled={executing === recipe.id}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed ml-4"
                  >
                    {executing === recipe.id ? 'Executing...' : '▶ Execute'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Configuration
                    </h3>
                    <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                      <li>
                        <span className="font-medium">URL:</span>{' '}
                        <a
                          href={recipe.base_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {recipe.base_url}
                        </a>
                      </li>
                      <li>
                        <span className="font-medium">Strategy:</span>{' '}
                        {recipe.extraction.limit_strategy}
                      </li>
                      <li>
                        <span className="font-medium">Pages:</span>{' '}
                        {recipe.extraction.page_count || 'N/A'}
                      </li>
                      <li>
                        <span className="font-medium">Status:</span>{' '}
                        <span
                          className={
                            recipe.status === 'active'
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-gray-600 dark:text-gray-400'
                          }
                        >
                          {recipe.status}
                        </span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Fields to Extract
                    </h3>
                    <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                      {recipe.extraction.fields.map((field: any) => (
                        <li key={field.name}>
                          • {field.name}{' '}
                          <span className="text-gray-500 dark:text-gray-500">({field.type})</span>
                          {field.required && (
                            <span className="text-red-500 dark:text-red-400">*</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {recipe.datasets?.total_runs > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Stats</h3>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Total executions: {recipe.datasets.total_runs}
                      {recipe.datasets.last_run && (
                        <span className="ml-4">
                          Last run: {recipe.datasets.last_run.status} (
                          {recipe.datasets.last_run.items_scraped} items)
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
