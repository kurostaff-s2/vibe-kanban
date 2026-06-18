import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { makeCouncilRequest } from '@/shared/lib/councilApiTransport';
import type { WorkItem, CreateWorkItemRequest, UpdateWorkItemRequest } from 'shared/council-types';

const WORK_ITEMS_KEY = ['council', 'work-items'];
const WORK_ITEM_KEY = 'council-work-item'; // prefix for single-item queries

/**
 * Fetch all work items, optionally filtered by project_id.
 *
 * Your API returns all work items; we filter client-side.
 */
export function useCouncilWorkItems(projectId?: string) {
  return useQuery<WorkItem[]>({
    queryKey: WORK_ITEMS_KEY.concat(projectId ? [projectId] : []),
    queryFn: async () => {
      const res = await makeCouncilRequest('/v1/work-items');
      if (!res.ok) throw new Error(`Failed to fetch work items: ${res.status}`);
      const data = await res.json();
      const items = Array.isArray(data) ? data : [];

      // Filter: not deleted, and optionally by project
      // is_deleted is 0 (SQLite int) or false (PostgreSQL bool) — handle both
      let filtered = items.filter((w: WorkItem) => !w.is_deleted);

      if (projectId) {
        filtered = filtered.filter((w: WorkItem) => w.project_id === projectId);
      }

      // Sort by created_at desc (most recent first)
      return filtered.sort(
        (a: WorkItem, b: WorkItem) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    refetchInterval: 3000, // poll every 3s
    staleTime: 1000,
    enabled: !!projectId, // only fetch when projectId is set
  });
}

/**
 * Create a new work item.
 */
export function useCreateWorkItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateWorkItemRequest) => {
      const body: Record<string, unknown> = { ...input };
      if (input.tags) {
        body.tags = JSON.stringify(input.tags);
      }
      if (input.metadata) {
        body.metadata = JSON.stringify(input.metadata);
      }

      const res = await makeCouncilRequest('/v1/work-items', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Failed to create work item: ${res.status}`);
      return res.json();
    },
    onSuccess: () => {
      // Invalidate work items cache to refetch
      queryClient.invalidateQueries({ queryKey: WORK_ITEMS_KEY });
    },
  });
}

/**
 * Fetch a single work item by ID.
 */
export function useCouncilWorkItem(id: string | undefined) {
  return useQuery<WorkItem, Error, WorkItem, [string, string | undefined]>({
    queryKey: [WORK_ITEM_KEY, id],
    queryFn: async () => {
      if (!id) throw new Error('No work item ID provided');
      const res = await makeCouncilRequest(`/v1/work-items/${id}`);
      if (!res.ok) throw new Error(`Failed to fetch work item: ${res.status}`);
      return res.json();
    },
    enabled: !!id,
    refetchInterval: 3000,
    staleTime: 1000,
  });
}

/**
 * Soft-delete a work item via PATCH (backend doesn't support DELETE).
 */
export function useDeleteWorkItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Fetch current revision first
      const fetchRes = await makeCouncilRequest(`/v1/work-items/${id}`);
      if (!fetchRes.ok) throw new Error(`Failed to fetch work item: ${fetchRes.status}`);
      const current = await fetchRes.json();

      const body = {
        patch: { is_deleted: 1 },
        expected_revision: current.revision,
      };

      const res = await makeCouncilRequest(`/v1/work-items/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`Failed to delete work item: ${res.status} ${JSON.stringify(err)}`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORK_ITEMS_KEY });
      queryClient.removeQueries({ queryKey: [WORK_ITEM_KEY] as const });
    },
  });
}

/**
 * Update a work item.
 *
 * Your API requires PATCH with { patch: { ... }, expected_revision: N }.
 * This hook handles the revision automatically.
 */
export function useUpdateWorkItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateWorkItemRequest['patch'] }) => {
      // First, fetch current revision
      const fetchRes = await makeCouncilRequest(`/v1/work-items/${id}`);
      if (!fetchRes.ok) throw new Error(`Failed to fetch work item: ${fetchRes.status}`);
      const current = await fetchRes.json();

      const patch: Record<string, unknown> = { ...updates };
      if (updates.tags !== undefined) {
        patch.tags = JSON.stringify(updates.tags);
      }
      if (updates.metadata !== undefined) {
        patch.metadata = JSON.stringify(updates.metadata);
      }

      const body = {
        patch,
        expected_revision: current.revision,
      };

      const res = await makeCouncilRequest(`/v1/work-items/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`Failed to update work item: ${res.status} ${JSON.stringify(err)}`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORK_ITEMS_KEY });
    },
  });
}
