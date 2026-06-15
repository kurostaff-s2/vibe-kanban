import { useQuery } from '@tanstack/react-query';
import { makeCouncilRequest } from '@/shared/lib/councilApiTransport';
import type { WorkflowRun } from 'shared/council-types';

/**
 * Fetch workflow runs, optionally filtered by work_item_id.
 */
export function useCouncilWorkflowRuns(workItemId?: string) {
  return useQuery<WorkflowRun[]>({
    queryKey: ['council', 'workflow-runs', workItemId ?? 'all'],
    queryFn: async () => {
      const res = await makeCouncilRequest('/v1/workflow-runs');
      if (!res.ok) throw new Error(`Failed to fetch workflow runs: ${res.status}`);
      const data = await res.json();
      const runs = Array.isArray(data) ? data : [];

      // Filter: active, not deleted
      let filtered = runs.filter(
        (r: WorkflowRun) => r.status === 'active' && r.is_deleted === 0
      );

      if (workItemId) {
        filtered = filtered.filter((r: WorkflowRun) => r.work_item_id === workItemId);
      }

      // Sort by created_at desc
      return filtered.sort(
        (a: WorkflowRun, b: WorkflowRun) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    refetchInterval: 5000,
    staleTime: 2000,
    enabled: !!workItemId,
  });
}
