import { useQuery } from '@tanstack/react-query';
import { makeCouncilRequest } from '@/shared/lib/councilApiTransport';

export interface ConsolidationTier {
  id: string;
  label: string;
  window_days: number;
  ttl_days: number;
  last_run_at: string | null;
  is_active: boolean;
  rollups: { total: number; raw: number; ok: number; latest: string | null };
  md_file_count: number;
  time_since_last_run: string | null;
}

export interface LlmActiveTask {
  slot_id: number;
  task_id: number | null;
  prompt_tokens: number;
  decoded: number;
  remaining: number;
  max_tokens: number;
}

export interface LlmState {
  total_slots: number;
  processing: number;
  idle: number;
  active_tasks: LlmActiveTask[];
  error?: string;
}

export interface RecentRollup {
  id: string | null;
  tier: string;
  source_id: string | null;
  parse_status: string;
  is_indexed: boolean;
  summary_preview: string;
  created_at: string;
}

export interface ConsolidationStatus {
  model: string;
  tiers: ConsolidationTier[];
  llm: LlmState;
  recent_rollups: RecentRollup[];
  total_rollups: number;
  total_raw: number;
  total_ok: number;
}

export function useConsolidationStatus() {
  return useQuery<ConsolidationStatus>({
    queryKey: ['council', 'consolidation-status'],
    queryFn: async () => {
      const res = await makeCouncilRequest('/v1/consolidation/status');
      if (!res.ok) throw new Error(`Failed to fetch consolidation status: ${res.status}`);
      return res.json();
    },
    refetchInterval: 10000,
    staleTime: 5000,
  });
}
