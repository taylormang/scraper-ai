export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-20 bg-gray-50 dark:bg-gray-950">
      <div className="max-w-4xl w-full text-center">
        <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">
          Scraper
        </h1>
        <p className="text-2xl text-gray-600 dark:text-gray-400 mb-4">
          AI-Native Web Intelligence Platform
        </p>
        <p className="text-lg text-gray-500 dark:text-gray-500 max-w-2xl mx-auto">
          Let your AI go get valuable data while handling queries and tasks for you.
          Conversational access to the entire web through MCP.
        </p>

        <div className="mt-16 p-8 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900">
          <h2 className="text-2xl font-semibold mb-4">Getting Started</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Use Claude Desktop with the MCP server to start scraping:
          </p>
          <div className="space-y-3 text-left max-w-xl mx-auto">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <code className="text-sm">scrape hackernews</code>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <code className="text-sm">list datasets</code>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <code className="text-sm">get dataset dataset_abc123</code>
            </div>
          </div>
        </div>

        <div className="mt-12 text-sm text-gray-500 dark:text-gray-600">
          <p>Status: Dataset Storage & Field Extraction ✅</p>
        </div>
      </div>
    </main>
  );
}
