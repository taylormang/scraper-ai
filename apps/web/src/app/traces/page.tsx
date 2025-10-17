import { TraceList } from '@/components/traces/TraceList';

export default function TracesPage() {
  return (
    <main className="min-h-screen px-6 py-10 md:px-12 bg-gray-50 dark:bg-gray-950">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="space-y-2 text-center md:text-left">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
            LLM Traces
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Every LLM call is recorded here for audit and debugging. Expand a trace to inspect the prompt, response, and metadata.
          </p>
        </header>
        <TraceList />
      </div>
    </main>
  );
}
