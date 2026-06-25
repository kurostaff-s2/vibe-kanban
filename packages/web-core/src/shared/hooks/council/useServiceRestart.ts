import { useCallback, useState } from 'react';

export interface RestartResult {
  ok: boolean;
  error?: string;
  new_pid?: number;
  old_pid?: number;
  service?: string;
  active?: boolean;
}

export interface RestartState {
  [service: string]: 'idle' | 'restarting' | 'success' | 'error';
}

export const RESTARTABLE_SERVICES = [
  { id: 'arc-llm', label: 'ARC LLM', description: 'LLM inference server (:18095)' },
  { id: 'memory-service', label: 'Memory Service', description: 'Council memory MCP server' },
  { id: 'council-backend', label: 'Council Backend', description: 'Council Core API server (:8000)' },
  { id: 'llama-swap', label: 'Llama Swap', description: 'Model swap proxy (:9292)' },
  { id: 'watch', label: 'Watch Service', description: 'CodeGraph auto-index watcher' },
  { id: 'pplx-embed', label: 'Embedding Service', description: 'TEI/Candle embedding server' },
  { id: 'memsearch-watch', label: 'MemSearch Watch', description: 'Memory search index watcher' },
  { id: 'arc-summarizer', label: 'ARC Summarizer', description: 'ARC summarization service' },
];

export function useServiceRestart() {
  const [states, setStates] = useState<RestartState>({});
  const [results, setResults] = useState<Record<string, RestartResult | null>>({});
  const [supervisorRestarting, setSupervisorRestarting] = useState(false);

  const restartService = useCallback(async (serviceId: string) => {
    setStates((prev) => ({ ...prev, [serviceId]: 'restarting' }));
    setResults((prev) => ({ ...prev, [serviceId]: null }));

    try {
      const resp = await fetch('/v1/council/restart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ services: [serviceId] }),
      });

      const data = await resp.json();
      const result = data.services?.[serviceId] ?? data;

      if (resp.ok && result?.ok) {
        setStates((prev) => ({ ...prev, [serviceId]: 'success' }));
        // Reset to idle after 3s
        setTimeout(() => {
          setStates((prev) => ({ ...prev, [serviceId]: 'idle' }));
        }, 3000);
      } else {
        setStates((prev) => ({ ...prev, [serviceId]: 'error' }));
      }
      setResults((prev) => ({ ...prev, [serviceId]: result }));
    } catch (e: any) {
      setStates((prev) => ({ ...prev, [serviceId]: 'error' }));
      setResults((prev) => ({
        ...prev,
        [serviceId]: { ok: false, error: e.message },
      }));
    }
  }, []);

  const restartAll = useCallback(async () => {
    const ids = RESTARTABLE_SERVICES.map((s) => s.id);
    setStates((prev) => ({
      ...prev,
      ...Object.fromEntries(ids.map((id) => [id, 'restarting'] as const)),
    }));

    try {
      const resp = await fetch('/v1/council/restart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ services: ['all'] }),
      });

      const data = await resp.json();
      const resultsMap: Record<string, RestartResult | null> = {};

      for (const svc of RESTARTABLE_SERVICES) {
        const result = data.services?.[svc.id] ?? null;
        resultsMap[svc.id] = result;
        if (result?.ok) {
          setStates((prev) => ({ ...prev, [svc.id]: 'success' }));
          setTimeout(() => {
            setStates((prev) => ({ ...prev, [svc.id]: 'idle' }));
          }, 3000);
        } else {
          setStates((prev) => ({ ...prev, [svc.id]: 'error' }));
        }
      }
      setResults((prev) => ({ ...prev, ...resultsMap }));
    } catch (e: any) {
      for (const svc of RESTARTABLE_SERVICES) {
        setStates((prev) => ({ ...prev, [svc.id]: 'error' }));
      }
    }
  }, []);

  const restartSupervisor = useCallback(async () => {
    setSupervisorRestarting(true);

    try {
      await fetch('/v1/council/supervisor-restart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      // Note: page will disconnect after execv, so we don't expect a response
    } catch {
      // Expected — connection drops after execv
    }
  }, []);

  const controlService = useCallback(async (serviceId: string, action: 'start' | 'stop' | 'restart') => {
    const stateKey = `${serviceId}-${action}`;
    setStates((prev) => ({ ...prev, [stateKey]: 'restarting' }));
    setResults((prev) => ({ ...prev, [stateKey]: null }));

    try {
      const resp = await fetch('/v1/council/service-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: serviceId, action }),
      });

      const data = await resp.json();

      if (resp.ok && data?.ok) {
        setStates((prev) => ({ ...prev, [stateKey]: 'success' }));
        setTimeout(() => {
          setStates((prev) => ({ ...prev, [stateKey]: 'idle' }));
        }, 3000);
      } else {
        setStates((prev) => ({ ...prev, [stateKey]: 'error' }));
      }
      setResults((prev) => ({ ...prev, [stateKey]: data }));
    } catch (e: any) {
      setStates((prev) => ({ ...prev, [stateKey]: 'error' }));
      setResults((prev) => ({
        ...prev,
        [stateKey]: { ok: false, error: e.message },
      }));
    }
  }, []);

  const resetState = useCallback((serviceId?: string) => {
    if (serviceId) {
      setStates((prev) => ({ ...prev, [serviceId]: 'idle' }));
      setResults((prev) => {
        const next = { ...prev };
        delete next[serviceId];
        return next;
      });
    } else {
      setStates({});
      setResults({});
    }
  }, []);

  return {
    states,
    results,
    supervisorRestarting,
    restartService,
    restartAll,
    restartSupervisor,
    controlService,
    resetState,
  };
}
