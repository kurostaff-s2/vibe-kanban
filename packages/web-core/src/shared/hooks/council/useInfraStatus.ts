import { useCallback, useEffect, useRef, useState } from 'react';

export interface InfraService {
  status: 'ok' | 'degraded' | 'error';
  port?: number;
  pid?: number;
  latency_ms?: number;
  model?: string | null;
  cpu_percent?: number | null;
  cpu_cores_hint?: number | null;
  warning?: string | null;
  error?: string | null;
  uptime_seconds?: number;
  outbox_pending?: number;
  table_counts?: Record<string, number>;
  last_consolidation?: string | null;
  last_consolidation_age_min?: number | null;
  collection_count?: number | null;
  chunk_count?: number | null;
  container_name?: string | null;
  nodes?: number | null;
  edges?: number | null;
  db_size_mb?: number | null;
  top_kinds?: Record<string, number> | null;
  top_langs?: Record<string, number> | null;
  model_count?: number | null;
  active_model?: string | null;
  models?: string[] | null;
}

export interface InfraStatus {
  timestamp: string;
  overall: 'ok' | 'degraded' | 'error';
  services: Record<string, InfraService>;
  tiers: {
    critical: string[];
    supporting: string[];
  };
}

const SERVICE_LABELS: Record<string, string> = {
  council_api: 'Council API',
  postgresql: 'PostgreSQL',
  arc_llm: 'ARC LLM',
  memory_service: 'Memory Service',
  milvus: 'Milvus',
  mongodb: 'MongoDB',
  embedding_service: 'Embeddings',
  qwen_s2s: 'Qwen s2s',
  codegraph: 'CodeGraph',
  odysseus: 'Odysseus',
  llama_swap: 'Llama Swap',
};

export function useInfraStatus(refreshMs = 30000) {
  const [data, setData] = useState<InfraStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const resp = await fetch('/v1/infra/status');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json: InfraStatus = await resp.json();
      setData(json);
      setLastUpdated(new Date());
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Start/stop polling
  useEffect(() => {
    fetchStatus();
    intervalRef.current = setInterval(fetchStatus, refreshMs);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchStatus, refreshMs]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    void fetchStatus();
  }, [fetchStatus]);

  return { data, isLoading, error, lastUpdated, refresh };
}

export { SERVICE_LABELS };
