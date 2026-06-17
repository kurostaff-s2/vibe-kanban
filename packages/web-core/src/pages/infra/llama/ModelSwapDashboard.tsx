import { useState } from 'react';
import { ArrowCounterClockwiseIcon } from '@phosphor-icons/react';
import { cn } from '@/shared/lib/utils';
import { useLlamaSwapStats } from '@/shared/hooks/council/useLlamaSwapStats';
import { LlamaModelsPanel } from './LlamaModelsPanel';
import { LlamaActivityStats } from './LlamaActivityStats';
import { LlamaPerformanceChart } from './LlamaPerformanceChart';
import { LlamaLogPanel } from './LlamaLogPanel';
import { LlamaServerConfig } from './LlamaServerConfig';

type TabKey = 'stats' | 'performance' | 'config' | 'logs';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'stats', label: 'Activity Stats' },
  { key: 'performance', label: 'Performance' },
  { key: 'config', label: 'Server Config' },
  { key: 'logs', label: 'Logs' },
];

/**
 * Dedicated Model Swap page.
 *
 * Replaces the InfraDashboard-embedded llama-swap panels with a full-width
 * layout optimized for model management and monitoring.
 */
export function ModelSwapDashboard() {
  const stats = useLlamaSwapStats();
  const { connected, error, refreshPerformance } = stats;
  const [activeTab, setActiveTab] = useState<TabKey>('stats');

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
          <LlamaModelsPanel
            models={stats.models}
            connected={stats.connected}
            error={stats.error}
            onLoad={stats.loadModel}
            onUnload={stats.unloadModel}
            onUnloadAll={stats.unloadAll}
          />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border sticky top-0 z-10 bg-primary">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors border-b-2',
                activeTab === tab.key
                  ? 'border-brand text-high'
                  : 'border-transparent text-low hover:text-normal hover:bg-secondary/20'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className={cn(
          activeTab === 'logs' ? 'h-[calc(100vh-180px)]' : 'min-h-0'
        )}>
          {activeTab === 'stats' && <LlamaActivityStats />}
          {activeTab === 'performance' && <LlamaPerformanceChart />}
          {activeTab === 'config' && <LlamaServerConfig />}
          {activeTab === 'logs' && <LlamaLogPanel />}
        </div>
      </div>
    </div>
  );
}

export default ModelSwapDashboard;
