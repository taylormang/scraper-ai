import Link from 'next/link';

export function Navigation() {
  return (
    <nav className="bg-white dark:bg-gray-950 shadow-sm border-b dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link
              href="/"
              className="flex items-center text-gray-900 dark:text-white font-semibold text-lg hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              🌐 Scraper
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500 dark:text-gray-600">
              <span className="hidden sm:inline">API: </span>
              <span className="text-green-600 dark:text-green-400">● Active</span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
