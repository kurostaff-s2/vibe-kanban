import { useQuery } from '@tanstack/react-query';
import { makeCouncilRequest } from '@/shared/lib/councilApiTransport';
import type { Review } from 'shared/council-types';

/**
 * Fetch reviews, optionally filtered by work_item_id.
 */
export function useCouncilReviews(workItemId?: string) {
  return useQuery<Review[]>({
    queryKey: ['council', 'reviews', workItemId ?? 'all'],
    queryFn: async () => {
      const res = await makeCouncilRequest('/v1/reviews');
      if (!res.ok) throw new Error(`Failed to fetch reviews: ${res.status}`);
      const data = await res.json();
      const reviews = Array.isArray(data) ? data : [];

      // Filter: active, not deleted
      // is_deleted is 0 (SQLite int) or false (PostgreSQL bool) — handle both
      let filtered = reviews.filter(
        (r: Review) => r.status === 'active' && !r.is_deleted
      );

      if (workItemId) {
        filtered = filtered.filter((r: Review) => r.work_item_id === workItemId);
      }

      // Sort by created_at desc
      return filtered.sort(
        (a: Review, b: Review) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    refetchInterval: 10000,
    staleTime: 5000,
    enabled: !!workItemId,
  });
}
