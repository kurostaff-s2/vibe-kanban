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
      if (import.meta.env.DEV) {
        console.log('[llama-swap] SSE connection opened');
      }
      setStats((prev) => ({
        ...prev,
        connected: true,
        error: null,
      }));
    };

    // llama-swap emits all events as 'message' with a JSON envelope:
    // { type: "modelStatus" | "metrics" | "inflight" | "logData", data: <payload> }
    es.onmessage = (e: MessageEvent) => {
      try {
        const envelope = JSON.parse(e.data);
        const type = envelope?.type;
        const payload = envelope?.data;

        switch (type) {
          case 'modelStatus': {
            let parsed: unknown =
              typeof payload === 'string' ? JSON.parse(payload) : payload;
            if (!Array.isArray(parsed)) {
              if (import.meta.env.DEV) {
                console.warn('[llama-swap] modelStatus payload is not an array:', parsed);
              }
              break;
            }
            const models: LlamaModel[] = parsed;
            if (import.meta.env.DEV) {
              console.log(`[llama-swap] modelStatus: ${models.length} models`, models.map(m => `${m.id}(${m.state})`).join(', '));
            }
            setStats((prev) => ({
              ...prev,
              models,
              loadingModels: models
                .filter((m) => m.state === 'starting' || m.state === 'stopping')
                .map((m) => m.id),
            }));
            break;
          }
          case 'metrics': {
            const entries: LlamaActivityEntry[] =
              typeof payload === 'string' ? JSON.parse(payload) : payload;
            if (Array.isArray(entries) && entries.length > 0) {
              setStats((prev) => {
                const all = [...prev.activityEntries, ...entries].slice(
                  -MAX_STATS_ENTRIES
                );
                return {
                  ...prev,
                  activityEntries: all,
                  totalRequests: prev.totalRequests + entries.length,
                  totalInputTokens:
                    prev.totalInputTokens +
                    entries.reduce(
                      (s, e) => s + (e.tokens?.input_tokens ?? 0),
                      0
                    ),
                  totalOutputTokens:
                    prev.totalOutputTokens +
                    entries.reduce(
                      (s, e) => s + (e.tokens?.output_tokens ?? 0),
                      0
                    ),
                  totalCacheTokens:
                    prev.totalCacheTokens +
                    entries.reduce(
                      (s, e) => s + (e.tokens?.cache_tokens ?? 0),
                      0
                    ),
                };
              });
            }
            break;
          }
          case 'inflight': {
            const raw =
              typeof payload === 'string' ? JSON.parse(payload) : payload;
            // inflight can be { total: N } or an array
            const data: LlamaInFlight[] = Array.isArray(raw) ? raw : [];
            setStats((prev) => ({ ...prev, inflightRequests: data }));
            break;
          }
          case 'logData': {
            const raw =
              typeof payload === 'string' ? JSON.parse(payload) : payload;
            const entry: LlamaLogEntry = {
              type: raw?.source === 'upstream' ? 'upstream' : 'proxy',
              timestamp: new Date().toISOString(),
              message: raw?.data ?? '',
            };
            setStats((prev) => ({
              ...prev,
              logs: [...prev.logs, entry].slice(-MAX_STATS_ENTRIES),
            }));
            break;
          }
          case 'sys_stats': {
            const entry: LlamaSysStat =
              typeof payload === 'string' ? JSON.parse(payload) : payload;
            setStats((prev) => ({
              ...prev,
              sysStats: [...prev.sysStats, entry].slice(-MAX_STATS_ENTRIES),
            }));
            break;
          }
          case 'gpu_stats': {
            const entry: LlamaGpuStat =
              typeof payload === 'string' ? JSON.parse(payload) : payload;
            setStats((prev) => {
              const existing = prev.gpuStats.filter((g) => g.id !== entry.id);
              return {
                ...prev,
                gpuStats: [...existing, entry].slice(-MAX_STATS_ENTRIES),
              };
            });
            break;
          }
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn('[llama-swap] SSE parse error:', err, e.data?.slice(0, 200));
        }
      }
    };

    es.onerror = (evt) => {
      // Extract error detail if available
      const errDetail = evt?.type || 'SSE connection error';
      setStats((prev) => ({
        ...prev,
        connected: false,
        error: `Disconnected: ${errDetail} (reconnecting...)`,
      }));

      es.close();
      esRef.current = null;

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
        await llamaFetch(`/upstream/${modelId}/`);
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
