import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getApiBaseUrl } from '@/lib/config';
import type { ApiResponse, ScrapeRecord } from '@/types/scrape';

interface ScrapeDetailParams {
  params: {
    id: string;
  };
}

async function fetchScrape(id: string): Promise<ScrapeRecord> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/scrapes/${id}`, {
    cache: 'no-store',
  });

  if (response.status === 404) {
    notFound();
  }

  if (!response.ok) {
    throw new Error(`Failed to load scrape (${response.status})`);
  }

  const json = (await response.json()) as ApiResponse<ScrapeRecord>;

  if (!json.success || !json.data) {
    const message = json.error?.message || 'Unknown error';
    throw new Error(`Scrapes API error: ${message}`);
  }

  return json.data;
}

function formatDate(value?: string) {
  if (!value) return 'Unknown';
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

function renderStatusBadge(status: string) {
  const variant: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-300',
    processing:
      'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-300',
    completed:
      'bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-300',
    failed: 'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-300',
  };

  const className =
    variant[status.toLowerCase()] || 'bg-gray-100 text-gray-800 dark:bg-gray-800';

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${className}`}>
      {status}
    </span>
  );
}

export default async function ScrapeDetailPage({ params }: ScrapeDetailParams) {
  let scrape: ScrapeRecord | null = null;
  let loadError: string | null = null;

  try {
    scrape = await fetchScrape(params.id);
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : 'Unable to load this scrape.';
  }

  if (!scrape) {
    return (
      <main className="min-h-screen p-8 bg-gray-50 dark:bg-gray-950">
        <div className="max-w-5xl mx-auto space-y-4">
          <Link
            href="/scrapes"
            className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Back to Scrapes
          </Link>
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-900 rounded-xl p-6">
            <h1 className="text-2xl font-semibold text-red-700 dark:text-red-300 mb-2">
              Unable to load scrape
            </h1>
            <p className="text-sm text-red-600 dark:text-red-200">
              {loadError ?? 'An unexpected error occurred.'}
            </p>
          </div>
        </div>
      </main>
    );
  }

  const { results } = scrape;
  const prompt = scrape.config?.prompt || results?.prompt;
  const structuredJson =
    results?.structuredData !== undefined
      ? JSON.stringify(results.structuredData, null, 2)
      : null;

  return (
    <main className="min-h-screen p-8 bg-gray-50 dark:bg-gray-950">
      <div className="max-w-5xl mx-auto space-y-6">
        <Link
          href="/scrapes"
          className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          ← Back to Scrapes
        </Link>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">
                {results?.metadata?.title || scrape.name}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 break-all">
                {scrape.name}
              </p>
            </div>
            {renderStatusBadge(scrape.status)}
          </div>

          <dl className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div>
              <dt className="font-medium text-gray-900 dark:text-gray-200">
                Scrape ID
              </dt>
              <dd className="mt-1 break-all">{scrape.id}</dd>
            </div>
            {results?.metadata?.sourceURL && (
              <div>
                <dt className="font-medium text-gray-900 dark:text-gray-200">
                  Source
                </dt>
                <dd className="mt-1">
                  <a
                    href={results.metadata.sourceURL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {results.metadata.sourceURL}
                  </a>
                </dd>
              </div>
            )}
            {prompt && (
              <div className="md:col-span-2">
                <dt className="font-medium text-gray-900 dark:text-gray-200">
                  JSON Prompt
                </dt>
                <dd className="mt-1 whitespace-pre-wrap text-gray-600 dark:text-gray-400">
                  {prompt}
                </dd>
              </div>
            )}
            <div>
              <dt className="font-medium text-gray-900 dark:text-gray-200">
                Created
              </dt>
              <dd className="mt-1">{formatDate(scrape.createdAt)}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-900 dark:text-gray-200">
                Last Updated
              </dt>
              <dd className="mt-1">{formatDate(scrape.updatedAt)}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-900 dark:text-gray-200">
                Duration
              </dt>
              <dd className="mt-1">
                {results?.duration
                  ? `${(results.duration / 1000).toFixed(2)}s`
                  : 'Unknown'}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-gray-900 dark:text-gray-200">
                Language
              </dt>
              <dd className="mt-1">{results?.metadata?.language || 'Unknown'}</dd>
            </div>
          </dl>

          {scrape.error && (
            <div className="mt-6 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-200">
              <strong className="block font-semibold mb-1">Error</strong>
              <span>{scrape.error}</span>
            </div>
          )}
        </div>

        {structuredJson && (
          <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm">
            <header className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Structured JSON Output
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Generated using the prompt provided for this scrape.
              </p>
            </header>
            <pre className="overflow-x-auto whitespace-pre-wrap px-6 py-4 text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-950 rounded-b-2xl">
{structuredJson}
            </pre>
          </section>
        )}

        {results?.markdown && (
          <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm">
            <header className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Markdown Output
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Raw markdown captured from the scrape.
              </p>
            </header>
            <pre className="overflow-x-auto whitespace-pre-wrap px-6 py-4 text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-950 rounded-b-2xl">
{results.markdown}
            </pre>
          </section>
        )}

        {results?.html && (
          <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm">
            <header className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                HTML Snapshot
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Raw HTML returned by the scrape.
              </p>
            </header>
            <pre className="overflow-x-auto whitespace-pre-wrap px-6 py-4 text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-950 rounded-b-2xl">
{results.html}
            </pre>
          </section>
        )}
      </div>
    </main>
  );
}
