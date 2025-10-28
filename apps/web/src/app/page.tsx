'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Create recipe from prompt
      const createResponse = await api.recipes.create({
        prompt: prompt.trim(),
        user_id: 'default_user',
      });

      const recipe = createResponse.data.recipe;

      // Execute the recipe immediately
      const executeResponse = await api.recipes.execute(recipe.id, 'default_user');
      const execution = executeResponse.data.execution;

      // Redirect to execution logs page
      router.push(`/executions/${execution.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create and execute recipe');
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center px-6 py-20 bg-gray-50 dark:bg-gray-950">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">
            Scraper
          </h1>
          <p className="text-2xl text-gray-600 dark:text-gray-400 mb-4">
            AI-Native Web Intelligence Platform
          </p>
          <p className="text-lg text-gray-500 dark:text-gray-500">
            Describe what you want to scrape in natural language
          </p>
        </div>

        {/* Prompt Input */}
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex flex-col gap-4">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Scrape 5 pages of Hacker News front page, get title, author, link, and comments"
              className="w-full p-4 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={4}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Create & Execute Recipe'}
            </button>
          </div>
        </form>

        {/* Error Display */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-400 font-semibold">Error</p>
            <p className="text-red-600 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/recipes"
            className="p-6 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
          >
            <h3 className="text-xl font-semibold mb-2">📋 Recipes</h3>
            <p className="text-gray-600 dark:text-gray-400">
              View and manage your scraping recipes
            </p>
          </Link>

          <Link
            href="/datasets"
            className="p-6 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
          >
            <h3 className="text-xl font-semibold mb-2">📊 Datasets</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Browse and export your scraped data
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}
