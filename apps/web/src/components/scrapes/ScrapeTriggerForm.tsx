'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { getApiBaseUrl } from '@/lib/config';
import type { ApiResponse, ScrapeResultPayload } from '@/types/scrape';

type FormState = 'idle' | 'submitting' | 'success' | 'error';

export function ScrapeTriggerForm() {
  const [url, setUrl] = useState('https://example.com');
  const [prompt, setPrompt] = useState('');
  const [autoPaginate, setAutoPaginate] = useState(true);
  const [maxPages, setMaxPages] = useState('');
  const [maxResults, setMaxResults] = useState('');
  const [maxWaitTime, setMaxWaitTime] = useState('');
  const [state, setState] = useState<FormState>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [scrapeId, setScrapeId] = useState<string | null>(null);
  const [responseData, setResponseData] = useState<unknown>(null);
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);

  const parsePositiveInt = (value: string, label: string): number | null => {
    if (!value) return null;
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new Error(`${label} must be a positive integer.`);
    }
    return parsed;
  };

  const buildPaginationPayload = (): Record<string, number | boolean> | null => {
    const payload: Record<string, number | boolean> = {};
    let shouldInclude = false;

    if (!autoPaginate) {
      payload.autoPaginate = false;
      shouldInclude = true;
    }

    if (maxPages) {
      payload.maxPages = parsePositiveInt(maxPages, 'Max pages')!;
      shouldInclude = true;
    }

    if (maxResults) {
      payload.maxResults = parsePositiveInt(maxResults, 'Max results')!;
      shouldInclude = true;
    }

    if (maxWaitTime) {
      payload.maxWaitTime = parsePositiveInt(maxWaitTime, 'Max wait time')!;
      shouldInclude = true;
    }

    return shouldInclude ? payload : null;
  };

  async function triggerScrape(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setScrapeId(null);
    setResponseData(null);
    setIsAccordionOpen(false);

    if (!url.trim()) {
      setState('error');
      setMessage('Please enter a URL to scrape.');
      return;
    }

    try {
      setState('submitting');
      const baseUrl = getApiBaseUrl();
      const trimmedPrompt = prompt.trim();
      const paginationPayload = buildPaginationPayload();

      const body: Record<string, unknown> = { url };

      if (trimmedPrompt) {
        body.prompt = trimmedPrompt;
      }

      // Use maxPages from pagination as limit
      if (paginationPayload && typeof paginationPayload.maxPages === 'number') {
        body.limit = paginationPayload.maxPages;
      }

      const response = await fetch(`${baseUrl}/api/firecrawl/crawl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        const errorMessage =
          json.error?.message || `Failed to start crawl (status ${response.status})`;
        throw new Error(errorMessage);
      }

      setState('success');
      setMessage(
        `Crawl completed! Status: ${json.data.status}, Pages: ${json.data.completed}/${json.data.total}`
      );
      setScrapeId(json.data.id || 'N/A');
      setResponseData(json);
      setUrl('https://example.com');
      setPrompt('');
      setAutoPaginate(true);
      setMaxPages('');
      setMaxResults('');
      setMaxWaitTime('');
    } catch (error) {
      console.error('[ScrapeTriggerForm] Failed to trigger scrape', error);
      setState('error');
      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to trigger scrape right now. Please try again shortly.'
      );
    }
  }

  const isSubmitting = state === 'submitting';

  return (
    <section className="w-full max-w-3xl mx-auto">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-6 md:p-8">
        <h2 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
          Trigger a New Scrape
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Provide a URL and the API will scrape it using the configured Firecrawl integration.
          Results appear in the Scrapes page.
        </p>

        <form className="space-y-6" onSubmit={triggerScrape}>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              URL to scrape
            </label>
            <input
              type="url"
              required
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              JSON extraction prompt (optional)
            </label>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={4}
              placeholder="Describe the structured data you want to extract from the page..."
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              We&apos;ll pass this prompt to Firecrawl&apos;s JSON mode and include the structured result in the scrape details.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                id="autoPaginate"
                type="checkbox"
                checked={autoPaginate}
                onChange={(event) => setAutoPaginate(event.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="autoPaginate" className="text-sm text-gray-700 dark:text-gray-300">
                Auto paginate
              </label>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Configure Firecrawl to follow “next page” links. Leave fields blank to keep defaults.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="flex flex-col space-y-1">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Max pages
                </span>
                <input
                  type="number"
                  min="1"
                  value={maxPages}
                  onChange={(event) => setMaxPages(event.target.value)}
                  placeholder="e.g. 3"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <label className="flex flex-col space-y-1">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Max results
                </span>
                <input
                  type="number"
                  min="1"
                  value={maxResults}
                  onChange={(event) => setMaxResults(event.target.value)}
                  placeholder="e.g. 10"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <label className="flex flex-col space-y-1">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Max wait (sec)
                </span>
                <input
                  type="number"
                  min="1"
                  value={maxWaitTime}
                  onChange={(event) => setMaxWaitTime(event.target.value)}
                  placeholder="e.g. 15"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 text-white px-5 py-3 text-sm font-semibold shadow-sm hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Submitting…' : 'Start Scrape'}
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Need inspiration? Try “Extract the main heading and the first three links with their text.”
            </p>
          </div>
        </form>

        {message && (
          <div
            className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
              state === 'success'
                ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-500/10 dark:border-green-900 dark:text-green-300'
                : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-500/10 dark:border-red-900 dark:text-red-300'
            }`}
          >
            <p>{message}</p>
            {state === 'success' && scrapeId && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">Scrape ID:</span>
                <code className="px-2 py-1 bg-white/60 dark:bg-black/20 rounded">
                  {scrapeId}
                </code>
                <Link
                  href={`/scrapes/${scrapeId}`}
                  className="inline-flex items-center text-blue-700 dark:text-blue-300 hover:underline"
                >
                  View details →
                </Link>
              </div>
            )}
            {state === 'success' && responseData && (
              <div className="mt-4 border-t border-green-200 dark:border-green-900 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAccordionOpen(!isAccordionOpen)}
                  className="flex items-center justify-between w-full text-left text-sm font-medium hover:underline"
                >
                  <span>Full Response</span>
                  <svg
                    className={`w-4 h-4 transition-transform ${
                      isAccordionOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                {isAccordionOpen && (
                  <pre className="mt-3 p-3 bg-white/60 dark:bg-black/40 rounded border border-green-200 dark:border-green-900 overflow-x-auto text-xs">
                    <code>{JSON.stringify(responseData, null, 2)}</code>
                  </pre>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
