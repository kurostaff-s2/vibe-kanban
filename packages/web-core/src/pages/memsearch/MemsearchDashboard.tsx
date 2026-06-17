import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ArrowClockwiseIcon,
  DatabaseIcon,
  FolderOpenIcon,
  ListIcon,
  WarningIcon,
  CodeIcon,
  PlugsIcon,
  FileCodeIcon,
  MagnifyingGlassIcon,
  GearIcon,
} from '@phosphor-icons/react';
import { cn } from '@/shared/lib/utils';

// ── Types ───────────────────────────────────────────────────────────────

interface MilvusCollection {
  name: string;
  entities?: number;
  schema_fields?: string[];
  indexes?: Array<{ name: string; index_type?: string; metric_type?: string | null }>;
  error?: string;
}

interface MilvusStatus {
  status: string;
  connected?: boolean;
  exists?: boolean;
  directory?: string;
  size_mb?: number;
  collection_count?: number;
  total_entities?: number;
  collections?: MilvusCollection[];
  error?: string;
}

interface EmbeddingStatus {
  status: string;
  url?: string;
  model?: string;
  reachable?: boolean;
  status_code?: number;
  latency_ms?: number;
  container?: string;
  error?: string;
}

interface ConsolidationTier {
  directory?: string;
  exists?: boolean;
  file_count?: number;
  size_mb?: number;
  md_count?: number;
  json_count?: number;
  latest?: {
    name: string;
    size_kb: number;
    modified: string;
    age_minutes: number;
  };
}

interface MemoryServiceStatus {
  status: string;
  pid?: number;
  core_db?: {
    path: string;
    size_mb: number;
    modified: string;
  };
  error?: string;
}

interface WatcherStatus {
  active?: boolean;
  service?: string;
  pid?: number;
  error?: string;
}

interface ConfigStatus {
  enabled?: boolean;
  milvus_uri?: string;
  collection?: string;
  embedding_url?: string;
  embedding_model?: string;
  recall_threshold?: number;
  error?: string;
}

interface MemsearchData {
  milvus: MilvusStatus;
  embedding: EmbeddingStatus;
  consolidation: {
    daily?: ConsolidationTier;
    weekly?: ConsolidationTier;
    bimonthly?: ConsolidationTier;
    short?: ConsolidationTier;
  };
  memory_service: MemoryServiceStatus;
  watcher: WatcherStatus;
  config: ConfigStatus;
}

// ── Status Dot ──────────────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  const color =
    status === 'ok'
      ? 'bg-green-500'
      : status === 'degraded'
        ? 'bg-yellow-500'
        : 'bg-red-500';

  return (
    <span
      className={cn('h-2.5 w-2.5 rounded-full shrink-0 inline-block', color)}
    />
  );
}

// ── Stat Card ───────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="bg-secondary/30 rounded-lg p-4 border border-border/50">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-brand">{icon}</span>
        <span className="text-xs text-low uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-semibold text-high">{value}</div>
      {sub && <div className="text-xs text-normal mt-1">{sub}</div>}
    </div>
  );
}

// ── Milvus Overview ─────────────────────────────────────────────────────

function MilvusOverview({ milvus }: { milvus: MilvusStatus }) {
  return (
    <div className="space-y-4">
      {/* Status header */}
      <div className="flex items-center gap-3">
        <StatusDot status={milvus.status} />
        <span className="text-sm text-high">
          {milvus.status === 'ok'
            ? 'Connected'
            : milvus.status === 'missing'
              ? 'Directory missing'
              : milvus.status === 'pymilvus_not_installed'
                ? 'pymilvus not installed'
                : 'Error'}
        </span>
        {milvus.error && (
          <span className="text-xs text-red-400">{milvus.error}</span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={<DatabaseIcon className="h-4 w-4" />}
          label="Collections"
          value={milvus.collection_count ?? 0}
        />
        <StatCard
          icon={<CodeIcon className="h-4 w-4" />}
          label="Entities"
          value={(milvus.total_entities ?? 0).toLocaleString()}
        />
        <StatCard
          icon={<PlugsIcon className="h-4 w-4" />}
          label="Disk Size"
          value={`${milvus.size_mb ?? 0} MB`}
          sub={milvus.directory ? 'milvus.db' : undefined}
        />
        <StatCard
          icon={<FileCodeIcon className="h-4 w-4" />}
          label="Connected"
          value={milvus.connected ? 'Yes' : 'No'}
        />
      </div>

      {/* Collections */}
      {milvus.collections && milvus.collections.length > 0 && (
        <div>
          <div className="text-xs text-low uppercase tracking-wider mb-2">
            Collections
          </div>
          <div className="space-y-2">
            {milvus.collections.map((coll) => (
              <div
                key={coll.name}
                className="bg-secondary/30 rounded-lg p-3 border border-border/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-high font-medium">{coll.name}</span>
                  {coll.entities !== undefined && (
                    <span className="text-xs text-normal font-mono">
                      {coll.entities.toLocaleString()} entities
                    </span>
                  )}
                  {coll.error && (
                    <span className="text-xs text-red-400">{coll.error}</span>
                  )}
                </div>

                {coll.schema_fields && coll.schema_fields.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {coll.schema_fields.map((field) => (
                      <span
                        key={field}
                        className="text-[10px] text-low bg-secondary/50 px-1.5 py-0.5 rounded"
                      >
                        {field}
                      </span>
                    ))}
                  </div>
                )}

                {coll.indexes && coll.indexes.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {coll.indexes.map((idx, i) => (
                      <span
                        key={i}
                        className="text-[10px] text-brand bg-brand/5 px-1.5 py-0.5 rounded"
                      >
                        {idx.index_type ?? idx.name}
                        {idx.metric_type ? ` (${idx.metric_type})` : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Embedding Status ────────────────────────────────────────────────────

function EmbeddingPanel({ embedding }: { embedding: EmbeddingStatus }) {
  return (
    <div className="bg-secondary/30 rounded-lg p-4 border border-border/50">
      <div className="flex items-center gap-2 mb-3">
        <MagnifyingGlassIcon className="h-4 w-4 text-normal" weight="fill" />
        <span className="text-sm font-medium text-high">Embedding Service</span>
        <StatusDot status={embedding.status} />
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-low text-xs">URL</span>
          <div className="text-normal font-mono text-xs truncate">{embedding.url}</div>
        </div>
        <div>
          <span className="text-low text-xs">Model</span>
          <div className="text-normal">{embedding.model ?? 'unknown'}</div>
        </div>
        <div>
          <span className="text-low text-xs">Status</span>
          <div className={cn(
            'text-sm',
            embedding.reachable ? 'text-green-400' : 'text-red-400'
          )}>
            {embedding.reachable ? 'Reachable' : 'Unreachable'}
          </div>
        </div>
        <div>
          <span className="text-low text-xs">Latency</span>
          <div className="text-normal">
            {embedding.latency_ms ? `${embedding.latency_ms}ms` : '—'}
          </div>
        </div>
      </div>

      {embedding.container && (
        <div className="mt-2 text-xs text-low">
          Container: <span className="text-normal">{embedding.container}</span>
        </div>
      )}

      {embedding.error && (
        <div className="mt-2 text-xs text-red-400">{embedding.error}</div>
      )}
    </div>
  );
}

// ── Consolidation Tier Panel ────────────────────────────────────────────

function TierPanel({ name, tier }: { name: string; tier?: ConsolidationTier }) {
  if (!tier) return null;

  const tierLabel = name.charAt(0).toUpperCase() + name.slice(1);

  return (
    <div className="bg-secondary/30 rounded-lg p-3 border border-border/50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-high font-medium">{tierLabel}</span>
        <span className="text-xs text-low">
          {tier.file_count ?? 0} files · {tier.size_mb ?? 0} MB
        </span>
      </div>

      {tier.latest && (
        <div className="text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-low">Latest</span>
            <span className="text-normal font-mono truncate ml-2">
              {tier.latest.name}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-low">Size</span>
            <span className="text-normal">{tier.latest.size_kb} KB</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-low">Age</span>
            <span className="text-normal">{tier.latest.age_minutes}m ago</span>
          </div>
        </div>
      )}

      {(!tier.exists) && (
        <div className="text-xs text-yellow-400 flex items-center gap-1">
          <WarningIcon className="h-3 w-3" weight="fill" />
          Directory not found
        </div>
      )}
    </div>
  );
}

// ── Consolidation Overview ──────────────────────────────────────────────

function ConsolidationOverview({ consolidation }: { consolidation: MemsearchData['consolidation'] }) {
  const tiers = [
    { key: 'daily', label: 'Daily' },
    { key: 'weekly', label: 'Weekly' },
    { key: 'bimonthly', label: 'Bi-Monthly' },
    { key: 'short', label: 'Short' },
  ] as const;

  const totalFiles = Object.values(consolidation).reduce(
    (sum, t) => sum + (t?.file_count ?? 0), 0
  );
  const totalSize = Object.values(consolidation).reduce(
    (sum, t) => sum + (t?.size_mb ?? 0), 0
  );

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<ListIcon className="h-4 w-4" />}
          label="Total Files"
          value={totalFiles}
        />
        <StatCard
          icon={<DatabaseIcon className="h-4 w-4" />}
          label="Total Size"
          value={`${totalSize.toFixed(1)} MB`}
        />
      </div>

      {/* Tiers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {tiers.map(({ key, label }) => (
          <TierPanel key={key} name={label} tier={consolidation[key]} />
        ))}
      </div>
    </div>
  );
}

// ── Services Panel ──────────────────────────────────────────────────────

function ServicesPanel({
  memory_service,
  watcher,
  config,
}: {
  memory_service: MemoryServiceStatus;
  watcher: WatcherStatus;
  config: ConfigStatus;
}) {
  return (
    <div className="space-y-4">
      {/* Memory Service */}
      <div className="bg-secondary/30 rounded-lg p-4 border border-border/50">
        <div className="flex items-center gap-2 mb-3">
          <GearIcon className="h-4 w-4 text-normal" weight="fill" />
          <span className="text-sm font-medium text-high">Memory Service</span>
          <StatusDot status={memory_service.status} />
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-low text-xs">Status</span>
            <div className={cn(
              'text-sm',
              memory_service.status === 'ok' ? 'text-green-400' : 'text-red-400'
            )}>
              {memory_service.status === 'ok' ? 'Running' : 'Not Running'}
            </div>
          </div>
          <div>
            <span className="text-low text-xs">PID</span>
            <div className="text-normal">{memory_service.pid ?? '—'}</div>
          </div>
        </div>

        {memory_service.core_db && (
          <div className="mt-2 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-low">Core DB</span>
              <span className="text-normal">{memory_service.core_db.size_mb} MB</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-low">Modified</span>
              <span className="text-normal">
                {new Date(memory_service.core_db.modified).toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {memory_service.error && (
          <div className="mt-2 text-xs text-red-400">{memory_service.error}</div>
        )}
      </div>

      {/* Watcher */}
      <div className="bg-secondary/30 rounded-lg p-4 border border-border/50">
        <div className="flex items-center gap-2 mb-3">
          <ListIcon className="h-4 w-4 text-normal" weight="fill" />
          <span className="text-sm font-medium text-high">MemSearch Watcher</span>
          <StatusDot status={watcher.active ? 'ok' : 'error'} />
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-low text-xs">Service</span>
            <div className="text-normal font-mono text-xs">{watcher.service ?? '—'}</div>
          </div>
          <div>
            <span className="text-low text-xs">PID</span>
            <div className="text-normal">{watcher.pid ?? '—'}</div>
          </div>
        </div>

        {watcher.error && (
          <div className="mt-2 text-xs text-red-400">{watcher.error}</div>
        )}
      </div>

      {/* Configuration */}
      <div className="bg-secondary/30 rounded-lg p-4 border border-border/50">
        <div className="flex items-center gap-2 mb-3">
          <GearIcon className="h-4 w-4 text-normal" weight="fill" />
          <span className="text-sm font-medium text-high">Configuration</span>
        </div>

        <div className="space-y-1 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-low">Enabled</span>
            <span className={cn(
              config.enabled ? 'text-green-400' : 'text-red-400'
            )}>
              {config.enabled ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-low">Recall Threshold</span>
            <span className="text-normal font-mono">{config.recall_threshold ?? 0.60}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-low">Collection</span>
            <span className="text-normal font-mono text-xs truncate max-w-[200px]">
              {config.collection ?? 'memsearch_chunks'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-low">Embedding Model</span>
            <span className="text-normal font-mono text-xs truncate max-w-[200px]">
              {config.embedding_model ?? 'pplx-embed-v1-0.6b'}
            </span>
          </div>
        </div>

        {config.error && (
          <div className="mt-2 text-xs text-red-400">{config.error}</div>
        )}
      </div>
    </div>
  );
}

// ── Main Dashboard ──────────────────────────────────────────────────────

export function MemsearchDashboard() {
  const [data, setData] = useState<MemsearchData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'consolidation' | 'services'>('overview');

  const fetchStatus = useCallback(async () => {
    try {
      const resp = await fetch('/v1/memsearch/status');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json: MemsearchData = await resp.json();
      setData(json);
      setLastUpdated(new Date());
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Compute overall health
  const health = useMemo(() => {
    if (!data) return 'unknown';
    const milvusOk = data.milvus.status === 'ok';
    const embedOk = data.embedding.status === 'ok';
    const memOk = data.memory_service.status === 'ok';
    if (milvusOk && embedOk && memOk) return 'ok';
    if (milvusOk || embedOk || memOk) return 'degraded';
    return 'error';
  }, [data]);

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center h-full text-normal text-sm">
        Loading MemSearch status...
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-sm">
        <span className="text-red-400">Failed to load: {error}</span>
        <button
          onClick={fetchStatus}
          className="flex items-center gap-2 px-3 py-1.5 bg-brand/10 text-brand rounded-md cursor-pointer hover:bg-brand/20 transition-colors"
        >
          <ArrowClockwiseIcon className="h-4 w-4" weight="fill" />
          Retry
        </button>
      </div>
    );
  }

  const tabs = [
    { key: 'overview' as const, label: 'Vector Index', icon: <DatabaseIcon className="h-4 w-4" /> },
    { key: 'consolidation' as const, label: 'Consolidation', icon: <ListIcon className="h-4 w-4" /> },
    { key: 'services' as const, label: 'Services', icon: <GearIcon className="h-4 w-4" /> },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h1 className="text-lg font-semibold text-high">
            MemSearch Pipeline
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-low">
              <span className="flex items-center gap-1.5">
                <StatusDot status={health} />
                {health === 'ok' ? 'All Systems Operational'
                  : health === 'degraded' ? 'Degraded'
                    : 'Error'}
              </span>
            </span>
            {lastUpdated && (
              <span className="text-xs text-low">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={fetchStatus}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-normal hover:bg-secondary-foreground/10 cursor-pointer transition-colors"
        >
          <ArrowClockwiseIcon className="h-4 w-4" weight="fill" />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-6 py-2 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors',
              activeTab === tab.key
                ? 'bg-brand/10 text-brand'
                : 'text-normal hover:bg-secondary-foreground/10'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'overview' ? (
          <div className="space-y-6">
            <MilvusOverview milvus={data?.milvus ?? { status: 'error' }} />
            <EmbeddingPanel embedding={data?.embedding ?? { status: 'error' }} />
          </div>
        ) : activeTab === 'consolidation' ? (
          <ConsolidationOverview consolidation={data?.consolidation ?? {}} />
        ) : (
          <ServicesPanel
            memory_service={data?.memory_service ?? { status: 'error' }}
            watcher={data?.watcher ?? {}}
            config={data?.config ?? {}}
          />
        )}
      </div>
    </div>
  );
}
