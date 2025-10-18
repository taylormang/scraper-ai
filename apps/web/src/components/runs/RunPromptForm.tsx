'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getApiBaseUrl } from '@/lib/config';
import { SUGGESTED_PROMPTS } from '@/components/runs/constants';

interface RunPromptFormProps {
  initialPrompt?: string;
}

export function RunPromptForm({ initialPrompt }: RunPromptFormProps) {
  const router = useRouter();
  const [prompt, setPrompt] = useState(
    initialPrompt ??
      'Scrape the first 10 pages of Hacker News, capturing title, score, author, and link.'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!prompt.trim()) {
      setError('Prompt cannot be empty.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/api/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error?.message ?? 'Failed to create run');
      }

      const runId: string | undefined = json.data?.run?.id;
      if (!runId) {
        throw new Error('Run ID missing from response');
      }

      router.push(`/runs/${runId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Suggested
        </span>
        {SUGGESTED_PROMPTS.map((item) => (
          <button
            type="button"
            key={item.label}
            onClick={() => setPrompt(item.prompt)}
            className="rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-gray-700 dark:text-gray-200 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
          >
            {item.label}
          </button>
        ))}
      </div>

      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Describe the scrape you want to run
      </label>

      <textarea
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        rows={6}
        className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:bg-blue-400"
        >
          {isSubmitting ? 'Starting…' : 'Start Run'}
        </button>
        {error && <span className="text-sm text-red-500 dark:text-red-400">{error}</span>}
      </div>
    </form>
  );
}
