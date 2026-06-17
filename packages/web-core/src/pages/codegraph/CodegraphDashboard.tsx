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
} from '@phosphor-icons/react';
import { cn } from '@/shared/lib/utils';

// ── Types ───────────────────────────────────────────────────────────────

interface IndexStats {
  status: string;
  nodes?: number;
  edges?: number;
  files?: number;
  db_size_mb?: number;
  kinds?: Record<string, number>;
  languages?: Record<string, number>;
  top_files?: Array<{ path: string; nodes: number }>;
  last_updated?: string;
  error?: string;
}

interface ProjectEntry {
  path: string;
  exists: boolean;
  has_index: boolean;
  index_size_mb?: number | null;
  index_updated?: string | null;
  watched?: boolean;
  last_sync_status?: string;
  last_sync_ago?: string | null;
  last_error?: string | null;
}

interface WatcherStatus {
  active: boolean;
  service?: string;
  info?: Record<string, string>;
  error?: string;
}

interface CodegraphData {
  index: IndexStats;
  projects: ProjectEntry[];
  watcher: WatcherStatus;
  projects_error?: string;
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

// ── Index Overview ──────────────────────────────────────────────────────

function IndexOverview({ index }: { index: IndexStats }) {
  if (index.status === 'error') {
    return (
      <div className="flex items-center gap-2 text-red-400 text-sm">
        <WarningIcon className="h-4 w-4" weight="fill" />
        {index.error ?? 'Unknown error'}
      </div>
    );
  }

  const kindEntries = index.kinds
    ? Object.entries(index.kinds).slice(0, 6)
    : [];
  const langEntries = index.languages
    ? Object.entries(index.languages).slice(0, 6)
    : [];

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={<CodeIcon className="h-4 w-4" />}
          label="Files"
          value={index.files ?? 0}
          sub={`${index.db_size_mb ?? 0} MB`}
        />
        <StatCard
          icon={<DatabaseIcon className="h-4 w-4" />}
          label="Nodes"
          value={(index.nodes ?? 0).toLocaleString()}
        />
        <StatCard
          icon={<PlugsIcon className="h-4 w-4" />}
          label="Edges"
          value={(index.edges ?? 0).toLocaleString()}
        />
        <StatCard
          icon={<FileCodeIcon className="h-4 w-4" />}
          label="Last Updated"
          value="—"
          sub={index.last_updated
            ? new Date(index.last_updated).toLocaleString()
            : 'unknown'}
        />
      </div>

      {/* Kinds & Languages */}
      {(kindEntries.length > 0 || langEntries.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {kindEntries.length > 0 && (
            <div>
              <div className="text-xs text-low uppercase tracking-wider mb-2">
                Node Kinds
              </div>
              <div className="space-y-1">
                {kindEntries.map(([kind, count]) => (
                  <div
                    key={kind}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-normal">{kind}</span>
                    <span className="text-high font-mono">
                      {(count as number).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {langEntries.length > 0 && (
            <div>
              <div className="text-xs text-low uppercase tracking-wider mb-2">
                Languages
              </div>
              <div className="space-y-1">
                {langEntries.map(([lang, count]) => (
                  <div
                    key={lang}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-normal">{lang}</span>
                    <span className="text-high font-mono">
                      {(count as number).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Top Files */}
      {index.top_files && index.top_files.length > 0 && (
        <div>
          <div className="text-xs text-low uppercase tracking-wider mb-2">
            Top Files by Node Count
          </div>
          <div className="space-y-1">
            {index.top_files.map((f, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-sm px-2 py-1 rounded bg-secondary/20"
              >
                <span className="text-normal font-mono text-xs truncate flex-1">
                  {f.path}
                </span>
                <span className="text-high font-mono ml-2 shrink-0">
                  {f.nodes}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Project Row ─────────────────────────────────────────────────────────

function SyncBadge({ project }: { project: ProjectEntry }) {
  if (!project.watched) {
    return (
      <span className="flex items-center gap-1 text-xs text-yellow-400 shrink-0">
        <WarningIcon className="h-3 w-3" weight="fill" />
        not watched
      </span>
    );
  }

  if (project.last_sync_status === 'error') {
    return (
      <span className="flex items-center gap-1 text-xs text-red-400 shrink-0">
        <WarningIcon className="h-3 w-3" weight="fill" />
        {project.last_error ?? 'sync failed'}
      </span>
    );
  }

  if (project.last_sync_status === 'ok' || project.last_sync_status === 'pending') {
    return (
      <span className="flex items-center gap-1 text-xs text-green-400 shrink-0">
        <StatusDot status="ok" />
        {project.last_sync_ago ?? 'synced'}
      </span>
    );
  }

  return (
    <span className="text-xs text-low shrink-0">
      {project.last_sync_ago ?? 'unknown'}
    </span>
  );
}

function ProjectRow({ project }: { project: ProjectEntry }) {
  const displayName = project.path.split('/').pop() ?? project.path;

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-md text-sm',
        !project.exists && 'opacity-50'
      )}
    >
      {/* Status */}
      <FolderOpenIcon
        className={cn(
          'h-4 w-4 shrink-0',
          project.exists ? 'text-brand' : 'text-red-400'
        )}
        weight="fill"
      />

      {/* Name */}
      <span className="text-normal truncate flex-1" title={project.path}>
        {displayName}
      </span>

      {/* Index status */}
      <span className="flex items-center gap-1.5 shrink-0">
        <StatusDot status={project.has_index ? 'ok' : 'error'} />
        <span className="text-xs text-low">
          {project.has_index
            ? `${project.index_size_mb ?? 0} MB`
            : 'no index'}
        </span>
      </span>

      {/* Updated */}
      {project.index_updated && (
        <span className="text-xs text-low shrink-0">
          {new Date(project.index_updated).toLocaleDateString()}
        </span>
      )}

      {/* Auto-sync status */}
      <SyncBadge project={project} />

      {/* Warning */}
      {!project.exists && (
        <span className="flex items-center gap-1 text-xs text-yellow-400 shrink-0">
          <WarningIcon className="h-3.5 w-3.5" weight="fill" />
          missing
        </span>
      )}
    </div>
  );
}

// ── Watcher Status ──────────────────────────────────────────────────────

function WatcherPanel({ watcher }: { watcher: WatcherStatus }) {
  return (
    <div className="bg-secondary/30 rounded-lg p-4 border border-border/50">
      <div className="flex items-center gap-2 mb-3">
        <ListIcon className="h-4 w-4 text-normal" weight="fill" />
        <span className="text-sm font-medium text-high">Auto-Index Watcher</span>
        <StatusDot status={watcher.active ? 'ok' : 'error'} />
        <span className="text-xs text-low">
          {watcher.active ? 'Active' : 'Inactive'}
        </span>
      </div>

      {watcher.error && (
        <div className="text-xs text-red-400">{watcher.error}</div>
      )}

      {watcher.info && (
        <div className="space-y-1">
          {Object.entries(watcher.info)
            .filter(([k]) => k !== 'ExecStartStatus')
            .slice(0, 3)
            .map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-xs">
                <span className="text-low">{k}</span>
                <span className="text-normal font-mono truncate ml-2">
                  {v}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ── Main Dashboard ──────────────────────────────────────────────────────

export function CodegraphDashboard() {
  const [data, setData] = useState<CodegraphData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'projects'>('overview');

  const fetchStatus = useCallback(async () => {
    try {
      const resp = await fetch('/v1/codegraph/status');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json: CodegraphData = await resp.json();
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

  const projectStats = useMemo(() => {
    if (!data?.projects) return { total: 0, indexed: 0, missing: 0, watched: 0 };
    return {
      total: data.projects.length,
      indexed: data.projects.filter((p) => p.has_index).length,
      missing: data.projects.filter((p) => !p.exists).length,
      watched: data.projects.filter((p) => p.watched).length,
    };
  }, [data]);

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center h-full text-normal text-sm">
        Loading CodeGraph status...
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
    { key: 'overview' as const, label: 'Index', icon: <DatabaseIcon className="h-4 w-4" /> },
    { key: 'projects' as const, label: 'Projects', icon: <FolderOpenIcon className="h-4 w-4" /> },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h1 className="text-lg font-semibold text-high">
            CodeGraph Index
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-low">
              {data?.index.status === 'ok' ? (
                <span className="flex items-center gap-1.5">
                  <StatusDot status="ok" />
                  Index Healthy
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <StatusDot status="error" />
                  Index Error
                </span>
              )}
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
            {tab.key === 'projects' && (
              <span className="text-xs text-low ml-1">
                {projectStats.indexed}/{projectStats.total}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'overview' ? (
          <div className="space-y-6">
            <IndexOverview index={data?.index ?? { status: 'error' }} />
            <WatcherPanel watcher={data?.watcher ?? { active: false }} />
          </div>
        ) : (
          <div className="space-y-2">
            {/* Project stats summary */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="bg-secondary/30 rounded-lg p-3 border border-border/50 text-center">
                <div className="text-lg font-semibold text-high">{projectStats.total}</div>
                <div className="text-xs text-low">Configured</div>
              </div>
              <div className="bg-secondary/30 rounded-lg p-3 border border-border/50 text-center">
                <div className="text-lg font-semibold text-green-400">{projectStats.indexed}</div>
                <div className="text-xs text-low">Indexed</div>
              </div>
              <div className="bg-secondary/30 rounded-lg p-3 border border-border/50 text-center">
                <div className="text-lg font-semibold text-brand">{projectStats.watched}</div>
                <div className="text-xs text-low">Auto-Watched</div>
              </div>
              <div className="bg-secondary/30 rounded-lg p-3 border border-border/50 text-center">
                <div className="text-lg font-semibold text-yellow-400">{projectStats.missing}</div>
                <div className="text-xs text-low">Missing</div>
              </div>
            </div>

            {/* Project list */}
            {data?.projects_error && (
              <div className="flex items-center gap-2 text-yellow-400 text-sm mb-2">
                <WarningIcon className="h-4 w-4" weight="fill" />
                {data.projects_error}
              </div>
            )}

            {data?.projects.map((project) => (
              <ProjectRow key={project.path} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
