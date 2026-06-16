import { ArrowCounterClockwiseIcon } from '@phosphor-icons/react';
import { cn } from '@/shared/lib/utils';
import { useLlamaSwapStats } from '@/shared/hooks/council/useLlamaSwapStats';
import { LlamaModelsPanel } from './LlamaModelsPanel';
import { LlamaActivityStats } from './LlamaActivityStats';
import { LlamaPerformanceChart } from './LlamaPerformanceChart';

/**
 * Dedicated Model Swap page.
 *
 * Replaces the InfraDashboard-embedded llama-swap panels with a full-width
 * layout optimized for model management and monitoring.
 */
export function ModelSwapDashboard() {
  const { connected, error, refreshPerformance } = useLlamaSwapStats();

  return (
    <div className="h-screen flex flex-col bg-primary overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-secondary/50 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-high">Model Swap</span>
          <span
            className={cn(
              'flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium',
              connected
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
            )}
          >
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                connected ? 'bg-green-500' : 'bg-red-500 animate-pulse'
              )}
            />
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <button
          onClick={refreshPerformance}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-normal hover:text-high hover:bg-secondary/30 cursor-pointer transition-colors"
          title="Refresh performance data"
        >
          <ArrowCounterClockwiseIcon className="h-4 w-4" weight="fill" />
          Refresh
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-6 py-2 text-sm text-red-400 bg-red-500/10 border-b border-red-500/20 shrink-0">
          {error}
        </div>
      )}

      {/* Content — scrollable */}
      <div className="flex-1 overflow-y-auto">
        {/* Model list — sticky top */}
        <div className="border-b border-border sticky top-0 z-10 bg-primary">
          <LlamaModelsPanel />
        </div>

        {/* Stats & charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
          <div className="border-r border-border min-h-0">
            <LlamaActivityStats />
          </div>
          <div className="min-h-0">
            <LlamaPerformanceChart />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModelSwapDashboard;
