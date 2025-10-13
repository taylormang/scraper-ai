export default function DatasetsPage() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">Datasets</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          View and manage your scraped data
        </p>

        <div className="bg-gray-50 dark:bg-gray-900 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-12 text-center">
          <div className="text-6xl mb-4">📦</div>
          <h2 className="text-2xl font-semibold mb-2">No datasets yet</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Start scraping data using the MCP server or create your first scraping job
          </p>
          <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Create First Dataset
          </button>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Getting Started</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Via Claude Desktop</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Use the MCP server with Claude to scrape data conversationally
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Via Web Interface</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Coming soon: Create and manage scraping jobs directly from the web
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
