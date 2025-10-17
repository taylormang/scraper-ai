import Link from 'next/link';
import { getApiBaseUrl } from '@/lib/config';
import type { ApiResponse, ScrapeListData, ScrapeRecord } from '@/types/scrape';

async function fetchScrapes(): Promise<ScrapeRecord[]> {
  const baseUrl = getApiBaseUrl();
  try {
    const response = await fetch(`${baseUrl}/api/scrapes`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to load scrapes (${response.status})`);
    }

    const json = (await response.json()) as ApiResponse<ScrapeListData>;

    if (!json.success || !json.data) {
      const message = json.error?.message || 'Unknown error';
      throw new Error(`Scrapes API error: ${message}`);
    }

    return json.data.scrapes;
  } catch (error) {
    console.error('[ScrapesPage] Failed to load scrapes', error);
    throw error;
  }
}

function formatDate(value: string) {
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'Unknown';
    }
    return new Intl.DateTimeFormat('en', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  } catch {
    return 'Unknown';
  }
}

function getHostname(value: string) {
  try {
    return new URL(value).hostname;
  } catch {
    return value;
  }
}

const statusVariant: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-300',
  processing: 'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-300',
};

export default async function ScrapesPage() {
  let scrapes: ScrapeRecord[] = [];
  let loadError: string | null = null;

  try {
    scrapes = await fetchScrapes();
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : 'Unable to load scrapes right now.';
  }

  return (
    <main className="min-h-screen p-8 bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold">Scrape History</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Review recent scraping activity across the platform.
            </p>
          </div>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            ← Back to Overview
          </a>
        </div>

        {loadError ? (
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-900 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">
              Trouble loading scrapes
            </h2>
            <p className="text-sm text-red-600 dark:text-red-200">{loadError}</p>
            <p className="mt-3 text-sm text-red-600 dark:text-red-200">
              Ensure the API is running and reachable at{' '}
              <code className="px-1 py-0.5 rounded bg-red-100 dark:bg-red-900/40">
                {getApiBaseUrl()}
              </code>
              .
            </p>
          </div>
        ) : scrapes.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center shadow-sm">
            <div className="text-6xl mb-4">🕸️</div>
            <h2 className="text-2xl font-semibold mb-2">No scrapes yet</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Trigger your first scrape to see results here. You can start from the
              MCP tooling or call the API directly.
            </p>
            <div className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span className="font-medium">Try:</span>
              <code className="bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg">
                curl -X POST {getApiBaseUrl()}/api/scrapes -H "Content-Type:
                application/json" -d &apos;{"{"}"url":"https://example.com"{"}"}&apos;
              </code>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 dark:bg-gray-800/60 text-xs font-semibold uppercase tracking-wider text-gray-500">
              <div className="col-span-5">URL &amp; Prompt</div>
              <div className="col-span-3">Title</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Last Updated</div>
            </div>

            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {scrapes.map((scrape) => {
                const status = scrape.status.toLowerCase();
                const statusClass =
                  statusVariant[status] || 'bg-gray-100 text-gray-800';
                const title =
                  scrape.results?.metadata?.title || getHostname(scrape.name);
                const pageCount = scrape.results?.pages?.length ?? 0;
                const pagination = scrape.config?.pagination;

                return (
                  <Link
                    key={scrape.id}
                    href={`/scrapes/${scrape.id}`}
                    className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900"
                  >
                    <div className="flex flex-col gap-4 px-6 py-5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 md:grid md:grid-cols-12 md:items-center">
                      <div className="md:col-span-5">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-200 break-all">
                          {scrape.name}
                        </p>
                        {scrape.config?.prompt && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 overflow-hidden text-ellipsis">
                            Prompt: {scrape.config.prompt}
                          </p>
                        )}
                        {scrape.error && (
                          <p className="mt-1 text-xs text-red-500">{scrape.error}</p>
                        )}
                        {pageCount > 0 && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Pages captured: {pageCount}
                          </p>
                        )}
                        {pagination && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Pagination: {pagination.autoPaginate === false ? 'manual' : 'auto'}
                            {pagination.maxPages !== undefined && ` · maxPages ${pagination.maxPages}`}
                            {pagination.maxResults !== undefined &&
                              ` · maxResults ${pagination.maxResults}`}
                          </p>
                        )}
                      </div>

                      <div className="md:col-span-3">
                        <p className="text-sm text-gray-900 dark:text-gray-200">
                          {title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 md:hidden">
                          Updated {formatDate(scrape.updatedAt || scrape.createdAt)}
                        </p>
                      </div>

                      <div className="md:col-span-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusClass}`}
                        >
                          {scrape.status}
                        </span>
                      </div>

                      <div className="md:col-span-2 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(scrape.updatedAt || scrape.createdAt)}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
