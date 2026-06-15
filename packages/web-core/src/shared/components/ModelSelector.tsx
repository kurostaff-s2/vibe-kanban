import { useEffect, useState, useCallback } from 'react';
import { ArrowsClockwiseIcon, GearIcon } from '@phosphor-icons/react';
import { makeCouncilRequest } from '@/shared/lib/councilApiTransport';

export interface ModelOption {
  id: string;
  label: string;
  status: 'active' | 'loaded' | 'unloaded' | 'error' | 'unknown';
  external: boolean;
  ctx_size?: number;
}

export interface ModelSelectorProps {
  /** Currently selected model alias */
  value: string;
  /** Called when model changes */
  onChange: (alias: string) => void;
  /** Disable swapping */
  disabled?: boolean;
  /** Compact mode (smaller UI) */
  compact?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500',
  loaded: 'bg-blue-500',
  unloaded: 'bg-gray-500',
  error: 'bg-red-500',
  unknown: 'bg-yellow-500',
};

export function ModelSelector({
  value,
  onChange,
  disabled = false,
  compact = true,
}: ModelSelectorProps) {
  const [models, setModels] = useState<ModelOption[]>([]);
  const [isSwapping, setIsSwapping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Fetch available models
  const fetchModels = useCallback(async () => {
    try {
      const res = await makeCouncilRequest('/v1/models/available');
      if (res.ok) {
        const data = await res.json();
        setModels(data.models || []);
      }
    } catch (err) {
      console.error('Failed to fetch models:', err);
    }
  }, []);

  useEffect(() => {
    fetchModels();
    // Refresh every 30s
    const interval = setInterval(fetchModels, 30000);
    return () => clearInterval(interval);
  }, [fetchModels]);

  const handleSwap = async (alias: string) => {
    if (alias === value || disabled || isSwapping) return;

    setIsSwapping(true);
    setError(null);

    try {
      const res = await makeCouncilRequest('/v1/models/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Swap failed: ${res.status}`);
      }

      onChange(alias);
      await fetchModels();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Swap failed');
    } finally {
      setIsSwapping(false);
      setIsOpen(false);
    }
  };

  // Group models by status
  const activeModels = models.filter((m) => m.status === 'active');
  const loadedModels = models.filter((m) => m.status === 'loaded');
  const unloadedModels = models.filter((m) => m.status === 'unloaded');

  const currentModel = models.find((m) => m.id === value);
  const currentLabel = currentModel?.label || value || 'Unknown';

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled || isSwapping}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary border border-border hover:border-white/20 transition-colors disabled:opacity-50"
        >
          {/* Status dot */}
          <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[currentModel?.status || 'unknown']}`} />

          {/* Model label */}
          <span className="text-xs text-high font-mono">{currentLabel}</span>

          {/* Swap icon */}
          {isSwapping ? (
            <ArrowsClockwiseIcon className="w-3.5 h-3.5 text-blue-400 animate-spin" />
          ) : (
            <GearIcon className="w-3.5 h-3.5 text-low" />
          )}
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute top-full right-0 mt-1 w-64 bg-gray-900 border border-border rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
            <div className="p-2 border-b border-border">
              <span className="text-xs text-low font-medium">Swap Model</span>
            </div>

            {activeModels.length > 0 && (
              <ModelGroup title="Active" models={activeModels} current={value} onSwap={handleSwap} disabled={isSwapping} />
            )}
            {loadedModels.length > 0 && (
              <ModelGroup title="Loaded" models={loadedModels} current={value} onSwap={handleSwap} disabled={isSwapping} />
            )}
            {unloadedModels.length > 0 && (
              <ModelGroup title="Unloaded" models={unloadedModels} current={value} onSwap={handleSwap} disabled={isSwapping} />
            )}

            {models.length === 0 && (
              <div className="p-3 text-xs text-low text-center">No models available</div>
            )}
          </div>
        )}

        {/* Error toast */}
        {error && (
          <div className="absolute top-full right-0 mt-1 px-2 py-1 bg-red-500/20 border border-red-500/30 rounded text-xs text-red-400 max-w-72">
            {error}
            <button onClick={() => setError(null)} className="ml-2 hover:text-red-300">✕</button>
          </div>
        )}
      </div>
    );
  }

  // Full size selector
  return (
    <select
      value={value}
      onChange={(e) => handleSwap(e.target.value)}
      disabled={disabled || isSwapping}
      className="px-3 py-1.5 rounded-md bg-secondary border border-border text-sm text-high focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
    >
      {models.map((model) => (
        <option key={model.id} value={model.id}>
          {model.label} ({model.status})
        </option>
      ))}
    </select>
  );
}

function ModelGroup({
  title,
  models,
  current,
  onSwap,
  disabled,
}: {
  title: string;
  models: ModelOption[];
  current: string;
  onSwap: (alias: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="border-b border-border last:border-b-0">
      <div className="px-3 py-1 bg-white/5">
        <span className="text-[10px] text-low uppercase tracking-wider">{title}</span>
      </div>
      {models.map((model) => (
        <button
          key={model.id}
          onClick={() => onSwap(model.id)}
          disabled={disabled || model.id === current}
          className={`w-full text-left px-3 py-2 flex items-center gap-2 text-xs hover:bg-white/5 transition-colors disabled:opacity-40 ${
            model.id === current ? 'bg-blue-500/10 text-blue-400' : 'text-high'
          }`}
        >
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_COLORS[model.status]}`} />
          <span className="truncate font-mono">{model.label}</span>
          {model.id === current && (
            <span className="ml-auto text-[10px] text-blue-400">current</span>
          )}
        </button>
      ))}
    </div>
  );
}

export default ModelSelector;
