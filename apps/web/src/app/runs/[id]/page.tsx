import { notFound } from 'next/navigation';
import { RunDetailClient } from '@/components/runs/RunDetailClient';
import type { RunDetail } from '@/types/run';
import { getApiBaseUrl } from '@/lib/config';

async function fetchRun(id: string): Promise<RunDetail | null> {
  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/runs/${id}`, { cache: 'no-store' });
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      console.error('Failed to fetch run detail', response.statusText);
      return null;
    }
    const json = await response.json();
    if (!json.success) {
      console.error('Run detail endpoint returned error', json.error);
      return null;
    }
    return json.data as RunDetail;
  } catch (error) {
    console.error('Failed to fetch run detail', error);
    return null;
  }
}

export default async function RunDetailPage({ params }: { params: { id: string } }) {
  const data = await fetchRun(params.id);
  if (!data) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 px-6 py-10 md:px-12">
      <div className="mx-auto max-w-5xl space-y-8">
        <RunDetailClient initial={data} runId={params.id} />
      </div>
    </main>
  );
}
