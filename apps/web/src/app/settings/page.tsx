export default function SettingsPage() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Configure your scraping preferences and API keys
        </p>

        <div className="space-y-6">
          <div className="border rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">API Keys</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">OpenAI API Key</label>
                <input
                  type="password"
                  placeholder="sk-..."
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
                  disabled
                />
                <p className="text-sm text-gray-500 mt-1">
                  Configure via environment variables for now
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Firecrawl API Key</label>
                <input
                  type="password"
                  placeholder="fc-..."
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
                  disabled
                />
                <p className="text-sm text-gray-500 mt-1">
                  For production scraping with anti-bot protection
                </p>
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Scraping Preferences</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Max Concurrent Scrapes</label>
                <input
                  type="number"
                  value="3"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
                  disabled
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Default Cache TTL (seconds)</label>
                <input
                  type="number"
                  value="3600"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
                  disabled
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Max Pages Per Scrape</label>
                <input
                  type="number"
                  value="100"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
                  disabled
                />
              </div>
            </div>
          </div>

          <div className="border border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2">🚧 Coming Soon</h3>
            <p className="text-gray-700 dark:text-gray-300">
              Settings management is under development. For now, configure via environment variables
              in <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">.env</code>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
