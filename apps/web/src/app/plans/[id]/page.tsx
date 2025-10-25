import { notFound } from 'next/navigation';
import { getApiBaseUrl } from '@/lib/config';
import type { PlanDetail } from '@/types/plan';
import { PlanDetailClient } from './PlanDetailClient';

async function fetchPlanDetail(id: string): Promise<PlanDetail | null> {
  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/plans/${id}`, { cache: 'no-store' });
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      console.error('Failed to fetch plan detail', response.statusText);
      return null;
    }
    const json = await response.json();
    if (!json.success) {
      console.error('Plan detail endpoint returned error', json.error);
      return null;
    }
    return json.data as PlanDetail;
  } catch (error) {
    console.error('Failed to fetch plan detail', error);
    return null;
  }
}

export default async function PlanDetailPage({ params }: { params: { id: string } }) {
  const data = await fetchPlanDetail(params.id);
  if (!data) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 px-6 py-10 md:px-12">
      <div className="mx-auto max-w-5xl space-y-8">
        <PlanDetailClient planId={params.id} initial={data} />
      </div>
    </main>
  );
}
