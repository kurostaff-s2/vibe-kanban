import { useQuery } from '@tanstack/react-query';
import { makeCouncilRequest } from '@/shared/lib/councilApiTransport';

// ── Lifecycle Tracking (replaces RawSessionEntry) ──

export interface SessionLifecycleEntry {
  source_file: string;
  source_uuid: string | null;
  trace_id: string;
  md_written: number;
  md_part_count: number;
  rollup_id: string | null;
  rollup_tier: string | null;
  ingested_at: string;
  md_finalized_at: string | null;
  consolidated_at: string | null;
  error: string | null;
}

// ── Unconsolidated Sessions (replaces WatcherOutlier) ──

export interface UnconsolidatedSession {
  source_file: string;
  trace_id: string | null;
  md_file_path: string | null;
  ingested_at: string;
  reason: string;
}

// ── Filesystem views (still valid for pending/processed MD files) ──

export interface RawMdFile {
  filename: string;
  size: number;
  modified_at: string;
  trace_id: string;
  source_id?: string;
  source_date?: string;
}

// ── Lifecycle Summary Stats ──

export interface LifecycleSummary {
  total_ingested: number;
  total_md_written: number;
  total_consolidated: number;
  total_awaiting: number;
  total_error: number;
}

// ── Pipeline Details (unified) ──

export interface PipelineDetails {
  // Lifecycle tracking (replaces raw_sessions)
  session_lifecycle: {
    total: number;
    entries: SessionLifecycleEntry[];
  };

  // Filesystem views (still useful for dedup/pending)
  pending_raw_mds: {
    total: number;
    truly_pending: number;
    already_consolidated: number;
    truly_pending_files: RawMdFile[];
    already_consolidated_files: RawMdFile[];
  };
  processed_raw_mds: {
    count: number;
    files: RawMdFile[];
  };

  // Rollup stats
  rollups_last_period: {
    total: number;
    raw: number;
    ok: number;
    indexed: number;
  };

  // LLM state
  llm: {
    total_slots: number;
    processing: number;
    idle: number;
    active_tasks: any[];
    error?: string;
  };

  // Sessions awaiting consolidation (replaces watcher_outliers)
  unconsolidated_sessions: {
    count: number;
    entries: UnconsolidatedSession[];
  };

  days_filter: number;
}

export function usePipelineDetails(days: number = 15) {
  return useQuery<PipelineDetails>({
    queryKey: ['council', 'pipeline-details', days],
    queryFn: async () => {
      const res = await makeCouncilRequest(`/v1/consolidation/pipeline?days=${days}`);
      if (!res.ok) throw new Error(`Failed to fetch pipeline details: ${res.status}`);
      return res.json();
    },
    refetchInterval: 15000,
    staleTime: 10000,
  });
}
