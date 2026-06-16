import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_LLAMA_SWAP_BASE,
  MAX_STATS_ENTRIES,
  SSE_RECONNECT_BASE_MS,
  SSE_RECONNECT_MAX_MS,
  SSE_RECONNECT_MULTIPLIER,
  type LlamaActivityEntry,
  type LlamaGpuStat,
  type LlamaInFlight,
  type LlamaLogEntry,
  type LlamaModel,
  type LlamaSysStat,
  type LlamaSwapActions,
  type LlamaSwapStats,
} from '@/shared/types/llama-swap';

// ── Initial State ──────────────────────────────────────────────────────

const EMPTY_STATS: LlamaSwapStats = {
  models: [],
  loadingModels: [],
  activityEntries: [],
  totalRequests: 0,
  totalInputTokens: 0,
  totalOutputTokens: 0,
  totalCacheTokens: 0,
  inflightRequests: [],
  sysStats: [],
  gpuStats: [],
  logs: [],
  connected: false,
  error: null,
};

// ── API Helpers ────────────────────────────────────────────────────────

async function llamaFetch(path: string, init?: RequestInit): Promise<Response> {
  // Try proxied path first, fall back to direct
  const baseUrl =
    typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? DEFAULT_LLAMA_SWAP_BASE
      : DEFAULT_LLAMA_SWAP_BASE;

  const resp = await fetch(`${baseUrl}${path}`, init);
  if (!resp.ok) {
    throw new Error(`llama-swap ${path}: HTTP ${resp.status}`);
  }
  return resp;
}

// ── Hook ───────────────────────────────────────────────────────────────

export function useLlamaSwapStats(
  baseUrl: string = DEFAULT_LLAMA_SWAP_BASE
): LlamaSwapStats & LlamaSwapActions {
  const [stats, setStats] = useState<LlamaSwapStats>(EMPTY_STATS);
  const reconnectRef = useRef<number>(SSE_RECONNECT_BASE_MS);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const esRef = useRef<EventSource | null>(null);

  // ── SSE Connection ─────────────────────────────────────────────────

  const connectSse = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    const eventsUrl = `${baseUrl}/api/events`;
    const es = new EventSource(eventsUrl);
    esRef.current = es;

    es.onopen = () => {
      reconnectRef.current = SSE_RECONNECT_BASE_MS;
      setStats((prev) => ({
        ...prev,
        connected: true,
        error: null,
      }));
    };

    es.addEventListener('model_state', (e: MessageEvent) => {
      try {
        const data: LlamaModel[] = JSON.parse(e.data);
        setStats((prev) => ({
          ...prev,
          models: data,
          loadingModels: data
            .filter((m) => m.state === 'starting' || m.state === 'stopping')
            .map((m) => m.id),
        }));
      } catch {
        // ignore parse errors
      }
    });

    es.addEventListener('activity', (e: MessageEvent) => {
      try {
        const entry: LlamaActivityEntry = JSON.parse(e.data);
        setStats((prev) => {
          const entries = [...prev.activityEntries, entry].slice(
            -MAX_STATS_ENTRIES
          );
          return {
            ...prev,
            activityEntries: entries,
            totalRequests: prev.totalRequests + 1,
            totalInputTokens:
              prev.totalInputTokens + (entry.tokens?.input_tokens ?? 0),
            totalOutputTokens:
              prev.totalOutputTokens + (entry.tokens?.output_tokens ?? 0),
            totalCacheTokens:
              prev.totalCacheTokens + (entry.tokens?.cache_tokens ?? 0),
          };
        });
      } catch {
        // ignore
      }
    });

    es.addEventListener('sys_stats', (e: MessageEvent) => {
      try {
        const entry: LlamaSysStat = JSON.parse(e.data);
        setStats((prev) => ({
          ...prev,
          sysStats: [...prev.sysStats, entry].slice(-MAX_STATS_ENTRIES),
        }));
      } catch {
        // ignore
      }
    });

    es.addEventListener('gpu_stats', (e: MessageEvent) => {
      try {
        const entry: LlamaGpuStat = JSON.parse(e.data);
        setStats((prev) => {
          // Replace GPU stats by GPU id
          const existing = prev.gpuStats.filter((g) => g.id !== entry.id);
          return {
            ...prev,
            gpuStats: [...existing, entry].slice(-MAX_STATS_ENTRIES),
          };
        });
      } catch {
        // ignore
      }
    });

    es.addEventListener('inflight', (e: MessageEvent) => {
      try {
        const data: LlamaInFlight[] = JSON.parse(e.data);
        setStats((prev) => ({ ...prev, inflightRequests: data }));
      } catch {
        // ignore
      }
    });

    es.addEventListener('log', (e: MessageEvent) => {
      try {
        const entry: LlamaLogEntry = JSON.parse(e.data);
        setStats((prev) => ({
          ...prev,
          logs: [...prev.logs, entry].slice(-MAX_STATS_ENTRIES),
        }));
      } catch {
        // ignore
      }
    });

    es.addEventListener('error', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        const msg =
          typeof data === 'string' ? data : (data?.message as string) ?? 'Unknown error';
        setStats((prev) => ({ ...prev, error: msg }));
      } catch {
        setStats((prev) => ({ ...prev, error: e.data ?? 'SSE error' }));
      }
    });

    es.onerror = () => {
      es.close();
      esRef.current = null;

      setStats((prev) => ({
        ...prev,
        connected: false,
      }));

      // Exponential backoff reconnect
      const delay = Math.min(
        reconnectRef.current,
        SSE_RECONNECT_MAX_MS
      );
      reconnectRef.current = Math.min(
        reconnectRef.current * SSE_RECONNECT_MULTIPLIER,
        SSE_RECONNECT_MAX_MS
      );

      timeoutRef.current = setTimeout(() => {
        connectSse();
      }, delay);
    };
  }, [baseUrl]);

  // ── Lifecycle ──────────────────────────────────────────────────────

  useEffect(() => {
    connectSse();
    return () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [connectSse]);

  // ── Actions ────────────────────────────────────────────────────────

  const loadModel = useCallback(
    async (modelId: string) => {
      try {
        await llamaFetch(`/upstream/${modelId}`);
      } catch (e) {
        setStats((prev) => ({
          ...prev,
          error: e instanceof Error ? e.message : 'Failed to load model',
        }));
      }
    },
    []
  );

  const unloadModel = useCallback(
    async (modelId: string) => {
      try {
        await llamaFetch(`/api/models/unload/${modelId}`, { method: 'POST' });
      } catch (e) {
        setStats((prev) => ({
          ...prev,
          error: e instanceof Error ? e.message : 'Failed to unload model',
        }));
      }
    },
    []
  );

  const unloadAll = useCallback(async () => {
    try {
      await llamaFetch('/api/models/unload', { method: 'POST' });
    } catch (e) {
      setStats((prev) => ({
        ...prev,
        error: e instanceof Error ? e.message : 'Failed to unload all models',
      }));
    }
  }, []);

  const refreshPerformance = useCallback(async () => {
    try {
      const resp = await llamaFetch('/api/performance');
      const data = await resp.json();
      if (data?.sysStats) {
        setStats((prev) => ({
          ...prev,
          sysStats: [...prev.sysStats, data.sysStats].slice(-MAX_STATS_ENTRIES),
        }));
      }
      if (data?.gpuStats) {
        setStats((prev) => {
          const updated: LlamaGpuStat[] = [];
          for (const g of data.gpuStats) {
            const existing = prev.gpuStats.filter((pg) => pg.id !== g.id);
            updated.push(...existing, g);
          }
          return { ...prev, gpuStats: updated.slice(-MAX_STATS_ENTRIES) };
        });
      }
    } catch {
      // ignore — SSE will catch up
    }
  }, []);

  return {
    ...stats,
    loadModel,
    unloadModel,
    unloadAll,
    refreshPerformance,
  };
}

export default useLlamaSwapStats;
