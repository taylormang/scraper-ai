import { ScrapeTriggerForm } from '@/components/scrapes/ScrapeTriggerForm';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-start gap-16 px-6 py-20 md:px-10 lg:px-16 bg-gray-50 dark:bg-gray-950">
      <div className="max-w-5xl w-full text-center">
        <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">
          Scraper
        </h1>
        <p className="text-2xl text-gray-600 dark:text-gray-400 mb-8">
          AI-Native Web Intelligence Platform
        </p>
        <p className="text-lg text-gray-500 dark:text-gray-500 mb-12 max-w-2xl mx-auto">
          Let your AI go get valuable data while handling queries and tasks for you.
          Conversational access to the entire web.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="p-6 border rounded-lg hover:shadow-lg transition-shadow">
            <h3 className="text-xl font-semibold mb-2">📊 Datasets</h3>
            <p className="text-gray-600 dark:text-gray-400">
              View and manage your scraped data
            </p>
          </div>

          <div className="p-6 border rounded-lg hover:shadow-lg transition-shadow">
            <h3 className="text-xl font-semibold mb-2">🤖 MCP Server</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Conversational scraping via Claude
            </p>
          </div>

          <div className="p-6 border rounded-lg hover:shadow-lg transition-shadow">
            <h3 className="text-xl font-semibold mb-2">⚙️ Settings</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Configure your scraping preferences
            </p>
          </div>
        </div>

        <div className="mt-16 text-sm text-gray-500 dark:text-gray-600">
          <p>Status: MCP Server Foundation ✅</p>
          <p className="mt-1">Next: Implement plan_scrape tool with intent parsing</p>
        </div>
      </div>

      <ScrapeTriggerForm />
    </main>
  );
}
