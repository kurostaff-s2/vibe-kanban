import { useState, useEffect, useCallback } from 'react';
import { makeCouncilRequest } from '@/shared/lib/councilApiTransport';

// Get current session ID from localStorage (matches useCouncilChat)
function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('council_chat_session_id') || '';
}

export interface AvailableModel {
  id: string;
  label: string;
  status: 'active' | 'loaded' | 'unloaded' | 'error' | 'unknown';
  external: boolean;
  ctx_size?: number;
}

export interface ModelSwapState {
  currentModel: string;
  defaultModel: string;
  models: AvailableModel[];
  isLoading: boolean;
  isSwapping: boolean;
  error: string | null;
}

export function useModelSwap() {
  const [state, setState] = useState<ModelSwapState>({
    currentModel: 'granite-4.1-3b',
    defaultModel: 'granite-4.1-3b',
    models: [],
    isLoading: true,
    isSwapping: false,
    error: null,
  });

  const fetchModels = useCallback(async () => {
    try {
      const res = await makeCouncilRequest('/v1/models/available');
      if (res.ok) {
        const data = await res.json();
        setState((prev) => ({
          ...prev,
          currentModel: data.current || prev.currentModel,
          defaultModel: data.default || prev.defaultModel,
          models: data.models || [],
          isLoading: false,
        }));
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch models',
      }));
    }
  }, []);

  useEffect(() => {
    fetchModels();
    const interval = setInterval(fetchModels, 30_000);
    return () => clearInterval(interval);
  }, [fetchModels]);

  const swapModel = useCallback(async (alias: string) => {
    if (alias === state.currentModel) return;

    setState((prev) => ({ ...prev, isSwapping: true, error: null }));

    try {
      // Notify the model registry
      const swapRes = await makeCouncilRequest('/v1/models/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias }),
      });

      if (!swapRes.ok) {
        const err = await swapRes.json().catch(() => ({}));
        throw new Error(err.error || `Swap failed: ${swapRes.status}`);
      }

      // Set the model for the current chat session
      const sessionId = getSessionId();
      if (sessionId) {
        await makeCouncilRequest('/v1/chat/set-model', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId, model_alias: alias }),
        });
      }

      setState((prev) => ({
        ...prev,
        currentModel: alias,
        isSwapping: false,
      }));

      // Refresh model list
      await fetchModels();
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isSwapping: false,
        error: err instanceof Error ? err.message : 'Swap failed',
      }));
    }
  }, [state.currentModel, fetchModels]);

  const resetToDefault = useCallback(async () => {
    await swapModel(state.defaultModel);
  }, [state.defaultModel, swapModel]);

  return {
    ...state,
    swapModel,
    resetToDefault,
    refreshModels: fetchModels,
  };
}

export default useModelSwap;
