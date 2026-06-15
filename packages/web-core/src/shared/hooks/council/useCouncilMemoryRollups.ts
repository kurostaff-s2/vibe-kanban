import { useQuery } from '@tanstack/react-query';
import { makeCouncilRequest } from '@/shared/lib/councilApiTransport';
import type { MemoryRollup } from 'shared/council-types';

/**
 * Fetch memory rollups, optionally filtered by tier.
 * Read-only — rollups are produced by the consolidation pipeline.
 */
export function useCouncilMemoryRollups(tierFilter?: string) {
  return useQuery<MemoryRollup[]>({
    queryKey: ['council', 'memory-rollups', tierFilter ?? 'all'],
    queryFn: async () => {
      const res = await makeCouncilRequest('/v1/memory-rollups');
      if (!res.ok) throw new Error(`Failed to fetch memory rollups: ${res.status}`);
      const data = await res.json();
      const rollups = Array.isArray(data) ? data : [];

      let filtered = rollups.filter((r: MemoryRollup) => r.status === 'active');

      if (tierFilter && tierFilter !== 'all') {
        filtered = filtered.filter((r: MemoryRollup) => r.tier === tierFilter);
      }

      // Sort by created_at desc (newest first)
      return filtered.sort(
        (a: MemoryRollup, b: MemoryRollup) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });
}
