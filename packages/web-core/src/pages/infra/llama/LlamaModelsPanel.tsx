import { useCallback, useState } from 'react';
import {
  ArrowClockwiseIcon,
  CaretDownIcon,
  CaretRightIcon,
  CloudArrowUpIcon,
  ListIcon,
  PlugIcon,
  PlugsIcon,
} from '@phosphor-icons/react';
import { cn } from '@/shared/lib/utils';
import {
  MODEL_STATE_COLORS,
  MODEL_STATE_LABELS,
  type LlamaModelState,
  type LlamaModel,
} from '@/shared/types/llama-swap';
import { useLlamaSwapStats } from '@/shared/hooks/council/useLlamaSwapStats';

// ── State Badge ────────────────────────────────────────────────────────

function StateBadge({ state }: { state: LlamaModelState }) {
  const color = MODEL_STATE_COLORS[state] ?? 'bg-gray-400';
  const label = MODEL_STATE_LABELS[state] ?? state;
  const isAnimating = state === 'starting' || state === 'stopping';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium',
        color,
        'text-black'
      )}
    >
      {isAnimating && (
        <ArrowClockwiseIcon
          className="h-3 w-3 animate-spin"
          weight="fill"
        />
      )}
      {label}
    </span>
  );
}

// ── Model Row ──────────────────────────────────────────────────────────

function ModelRow({
  model,
  onLoad,
  onUnload,
  isLoading,
}: {
  model: LlamaModel;
  onLoad: (id: string) => Promise<void>;
  onUnload: (id: string) => Promise<void>;
  isLoading: boolean;
}) {
  const isReady = model.state === 'ready';
  const isTransitioning =
    model.state === 'starting' || model.state === 'stopping';

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2 border-b border-border/30',
        isReady ? 'bg-green-500/5' : ''
      )}
    >
      {/* State */}
      <StateBadge state={model.state} />

      {/* Name */}
      <div className="flex-1 min-w-0">
        <div className="text-sm text-high truncate">{model.name || model.id}</div>
        {model.description && (
          <div className="text-xs text-low truncate">{model.description}</div>
        )}
        {model.aliases && model.aliases.length > 0 && (
          <div className="text-[10px] text-low">
            {model.aliases.join(', ')}
          </div>
        )}
      </div>

      {/* Capabilities */}
      {model.capabilities && (
        <div className="flex gap-1 shrink-0">
          {model.capabilities.vision && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
              vision
            </span>
          )}
          {model.capabilities.audio_transcriptions && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
              audio
            </span>
          )}
          {model.capabilities.image_generation && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300">
              img-gen
            </span>
          )}
          {model.capabilities.reranker && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300">
              rerank
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-1 shrink-0">
        {isReady ? (
          <button
            onClick={() => onUnload(model.id)}
            disabled={isLoading || isTransitioning}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded text-xs cursor-pointer transition-colors',
              'bg-red-500/10 text-red-400 hover:bg-red-500/20',
              'disabled:opacity-50 disabled:cursor-wait'
            )}
            title={`Unload ${model.id}`}
          >
            <PlugsIcon className="h-3.5 w-3.5" weight="fill" />
            Unload
          </button>
        ) : model.state !== 'starting' ? (
          <button
            onClick={() => onLoad(model.id)}
            disabled={isLoading || isTransitioning}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded text-xs cursor-pointer transition-colors',
              'bg-green-500/10 text-green-400 hover:bg-green-500/20',
              'disabled:opacity-50 disabled:cursor-wait'
            )}
            title={`Load ${model.id}`}
          >
            <PlugIcon className="h-3.5 w-3.5" weight="fill" />
            Load
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ── Panel ──────────────────────────────────────────────────────────────

export function LlamaModelsPanel() {
  const {
    models,
    connected,
    error,
    loadModel,
    unloadModel,
    unloadAll,
  } = useLlamaSwapStats();

  const [collapsed, setCollapsed] = useState(false);
  const [showUnlisted, setShowUnlisted] = useState(false);
  const [confirmUnloadAll, setConfirmUnloadAll] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleLoad = useCallback(
    async (id: string) => {
      setActionLoading(id);
      try {
        await loadModel(id);
      } finally {
        setActionLoading(null);
      }
    },
    [loadModel]
  );

  const handleUnload = useCallback(
    async (id: string) => {
      setActionLoading(id);
      try {
        await unloadModel(id);
      } finally {
        setActionLoading(null);
      }
    },
    [unloadModel]
  );

  const handleUnloadAll = useCallback(() => {
    if (!confirmUnloadAll) {
      setConfirmUnloadAll(true);
      setTimeout(() => setConfirmUnloadAll(false), 5000);
      return;
    }
    unloadAll().finally(() => setConfirmUnloadAll(false));
  }, [confirmUnloadAll, unloadAll]);

  const visibleModels = showUnlisted
    ? models
    : models.filter((m) => !m.unlisted);
  const sortedModels = [...visibleModels].sort((a, b) =>
    (a.name || a.id).localeCompare(b.name || b.id)
  );

  const readyCount = models.filter((m) => m.state === 'ready').length;
  const stoppedCount = models.filter((m) => m.state === 'stopped').length;

  return (
    <div className="border-t border-border">
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between px-4 py-2 border-b border-border/50 cursor-pointer hover:bg-secondary/30 transition-colors'
        )}
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          <ListIcon className="h-4 w-4 text-normal" weight="fill" />
          <span className="text-sm font-medium text-high">Model Swap</span>
          {/* Connection dot */}
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              connected ? 'bg-green-500' : 'bg-red-500'
            )}
            title={connected ? 'Connected to llama-swap' : 'Disconnected'}
          />
          {/* Counts */}
          <span className="text-xs text-low">
            {readyCount} ready · {stoppedCount} stopped · {models.length} total
          </span>
        </div>
        <span className="text-xs text-low">
          {collapsed ? <CaretRightIcon className="h-4 w-4" /> : <CaretDownIcon className="h-4 w-4" />}
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-1.5 text-xs text-red-400 bg-red-500/10 border-b border-border/50">
          {error}
        </div>
      )}

      {!collapsed && (
        <>
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-1.5 border-b border-border/50">
            <label className="flex items-center gap-2 text-xs text-normal cursor-pointer">
              <input
                type="checkbox"
                checked={showUnlisted}
                onChange={(e) => setShowUnlisted(e.target.checked)}
                className="accent-brand"
              />
              Show unlisted
            </label>
            <button
              onClick={handleUnloadAll}
              disabled={readyCount === 0}
              className={cn(
                'flex items-center gap-1 px-2 py-0.5 rounded text-xs cursor-pointer transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                confirmUnloadAll
                  ? 'bg-red-500/30 text-red-300'
                  : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
              )}
            >
              <CloudArrowUpIcon className="h-3.5 w-3.5" weight="fill" />
              {confirmUnloadAll ? 'Confirm (5s)...' : 'Unload All'}
            </button>
          </div>

          {/* Model List */}
          <div className="max-h-64 overflow-y-auto">
            {sortedModels.length === 0 ? (
              <div className="px-4 py-6 text-sm text-low text-center">
                {connected ? 'No models available' : 'Connecting to llama-swap...'}
              </div>
            ) : (
              sortedModels.map((model) => (
                <ModelRow
                  key={model.id}
                  model={model}
                  onLoad={handleLoad}
                  onUnload={handleUnload}
                  isLoading={actionLoading !== null}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default LlamaModelsPanel;
