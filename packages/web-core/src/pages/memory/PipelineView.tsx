import { useState, useMemo } from 'react';
import {
  ClockIcon,
  CpuIcon,
  CheckCircleIcon,
  FilesIcon,
  FunnelIcon,
  ListBulletsIcon,
  MagnifyingGlassIcon,
  ArrowClockwiseIcon,
  WarningIcon,
  XCircleIcon,
  PipeIcon,
} from '@phosphor-icons/react';
import { cn } from '@/shared/lib/utils';
import { usePipelineDetails, SessionLifecycleEntry, UnconsolidatedSession } from '@/shared/hooks/council/usePipelineDetails';

// ── Helpers ──

function formatTimeAgo(iso: string | null): string {
  if (!iso) return 'unknown';
  try {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${diffDay}d ago`;
  } catch {
    return iso.slice(0, 16);
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// Determine lifecycle state from entry fields
function getLifecycleState(entry: SessionLifecycleEntry): 'consolidated' | 'awaiting' | 'pending_md' | 'error' {
  if (entry.error) return 'error';
  if (entry.rollup_id) return 'consolidated';
  if (entry.md_written) return 'awaiting';
  return 'pending_md';
}

function getLifecycleColor(state: string): string {
  switch (state) {
    case 'consolidated': return '#22C55E'; // green
    case 'awaiting': return '#EAB308'; // yellow
    case 'pending_md': return '#6B7280'; // gray
    case 'error': return '#EF4444'; // red
    default: return '#6B7280';
  }
}

function getLifecycleLabel(state: string): string {
  switch (state) {
    case 'consolidated': return 'Consolidated';
    case 'awaiting': return 'Awaiting Rollup';
    case 'pending_md': return 'Awaiting MD';
    case 'error': return 'Error';
    default: return state;
  }
}

// Check if session has been awaiting > 24 hours
function isStaleAwaiting(entry: SessionLifecycleEntry): boolean {
  if (!entry.md_written || entry.rollup_id) return false;
  const ingested = new Date(entry.ingested_at).getTime();
  return (Date.now() - ingested) > 24 * 60 * 60 * 1000;
}

// ── Stats Card ──

function StatsCard({
  label,
  value,
  icon,
  color,
  sublabel,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  sublabel?: string;
}) {
  return (
    <div className="bg-secondary border border-border rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        <span style={{ color }}>{icon}</span>
        <span className="text-xs text-low">{label}</span>
      </div>
      <div className="text-xl font-bold text-high">{value}</div>
      {sublabel && <div className="text-xs text-low mt-0.5">{sublabel}</div>}
    </div>
  );
}

// ── File Row ──

function FileRow({
  file,
  status,
}: {
  file: { filename: string; size: number; modified_at: string; trace_id: string; source_date?: string };
  status: 'pending' | 'processed' | 'consolidated';
}) {
  let displayDate = file.source_date
    ? file.source_date.replace('T', ' ').split('+')[0]
    : formatTimeAgo(file.modified_at);

  return (
    <div className="flex items-center justify-between text-xs py-1.5 px-2 rounded hover:bg-secondary/50 transition-colors">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={cn(
            'h-2 w-2 rounded-full shrink-0',
            status === 'pending' ? 'bg-yellow-500' : status === 'consolidated' ? 'bg-green-500' : 'bg-blue-500'
          )}
        />
        <span className="font-mono text-normal truncate" title={file.filename}>
          {file.filename}
        </span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {file.source_date && (
          <span className="text-low" title={file.source_date}>
            {displayDate}
          </span>
        )}
        <span className="text-low">{formatBytes(file.size)}</span>
        <span className="text-low">{formatTimeAgo(file.modified_at)}</span>
      </div>
    </div>
  );
}

// ── Lifecycle Row ──

function LifecycleRow({ entry }: { entry: SessionLifecycleEntry }) {
  const state = getLifecycleState(entry);
  const color = getLifecycleColor(state);
  const stale = isStaleAwaiting(entry);

  return (
    <div className="flex items-center justify-between text-xs py-2 px-2 rounded hover:bg-secondary/50 transition-colors border-b border-border/20 last:border-0">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="h-2.5 w-2.5 rounded-full shrink-0"
          style={{ backgroundColor: color }}
          title={getLifecycleLabel(state)}
        />
        <span className="font-mono text-normal truncate" title={`trace-${entry.trace_id}`}>
          trace-{entry.trace_id}
        </span>
        <span className="text-low shrink-0 hidden sm:inline">
          {entry.md_part_count > 1 ? `${entry.md_part_count} parts` : ''}
        </span>
        {entry.error && (
          <span className="text-red-400 truncate max-w-[200px]" title={entry.error}>
            {entry.error}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {/* Pipeline stage indicators */}
        <div className="flex items-center gap-1 hidden md:flex">
          <span className={cn('text-xs', 'text-green-500')}>JSONL</span>
          <span className="text-low">→</span>
          <span className={cn('text-xs', entry.md_written ? 'text-green-500' : 'text-low')}>MD</span>
          <span className="text-low">→</span>
          <span className={cn('text-xs', entry.rollup_id ? 'text-green-500' : 'text-low')}>Rollup</span>
        </div>
        {/* Timestamps */}
        <span className="text-low hidden lg:inline" title={entry.ingested_at}>
          in: {formatTimeAgo(entry.ingested_at)}
        </span>
        {entry.consolidated_at && (
          <span className="text-low hidden lg:inline" title={entry.consolidated_at}>
            done: {formatTimeAgo(entry.consolidated_at)}
          </span>
        )}
        {/* Status badge */}
        <span
          className="text-xs px-1.5 py-0.5 rounded-full shrink-0"
          style={{
            backgroundColor: `${color}20`,
            color,
          }}
        >
          {getLifecycleLabel(state)}
        </span>
        {stale && (
          <span className="text-xs text-orange-400 flex items-center gap-0.5 shrink-0">
            <WarningIcon className="h-3 w-3" weight="fill" />
            stale
          </span>
        )}
      </div>
    </div>
  );
}

// ── Awaiting Row ──

function AwaitingRow({ session }: { session: UnconsolidatedSession }) {
  const stale = isStaleAwaiting({
    source_file: session.source_file,
    source_uuid: null,
    trace_id: session.trace_id || '',
    md_written: 1,
    md_part_count: 1,
    rollup_id: null,
    rollup_tier: null,
    ingested_at: session.ingested_at,
    consolidated_at: null,
  } as any);

  return (
    <div className="flex items-start justify-between text-xs py-2 px-2 rounded hover:bg-secondary/50 transition-colors border-b border-border/20 last:border-0">
      <div className="min-w-0 space-y-0.5">
        <div className="flex items-center gap-2">
          <ClockIcon className="h-3.5 w-3.5 text-yellow-500 shrink-0" weight="fill" />
          <span className="font-mono text-normal truncate">{session.trace_id || 'unknown'}</span>
        </div>
        <div className="text-low truncate" title={session.source_file}>
          {session.source_file}
        </div>
        <div className="text-yellow-400/80" title={session.reason}>
          {session.reason}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-3">
        <span className="text-low">{formatTimeAgo(session.ingested_at)}</span>
        {stale && (
          <span className="text-xs text-orange-400 flex items-center gap-0.5">
            <WarningIcon className="h-3 w-3" weight="fill" />
            stale
          </span>
        )}
      </div>
    </div>
  );
}

// ── LLM Processing Panel ──

function LlmProcessingPanel({
  llm,
}: {
  llm: {
    total_slots: number;
    processing: number;
    idle: number;
    active_tasks: any[];
    error?: string;
  };
}) {
  const isBusy = llm.processing > 0;

  return (
    <div className="bg-secondary border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CpuIcon className="h-5 w-5 text-brand" weight="bold" />
          <span className="font-semibold text-sm text-high">LLM Processing</span>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium',
            isBusy ? 'bg-yellow-500/10 text-yellow-400' : 'bg-green-500/10 text-green-400'
          )}
        >
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              isBusy ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'
            )}
          />
          {isBusy ? 'Processing' : 'Idle'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-background/50 rounded-md p-2 text-center">
          <div className="text-lg font-bold text-normal">{llm.total_slots || '-'}</div>
          <div className="text-xs text-low">slots</div>
        </div>
        <div className="bg-background/50 rounded-md p-2 text-center">
          <div className="text-lg font-bold text-yellow-500">{llm.processing}</div>
          <div className="text-xs text-low">busy</div>
        </div>
        <div className="bg-background/50 rounded-md p-2 text-center">
          <div className="text-lg font-bold text-green-500">{llm.idle}</div>
          <div className="text-xs text-low">idle</div>
        </div>
      </div>

      {llm.active_tasks.length > 0 && (
        <div className="space-y-2">
          {llm.active_tasks.map((task: any) => (
            <div key={task.slot_id} className="bg-background/50 rounded-md p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-normal">
                  Slot {task.slot_id} · Task #{task.task_id}
                </span>
                <span className="text-xs text-low">
                  {task.decoded}/{task.max_tokens} tokens
                </span>
              </div>
              <div className="w-full bg-background rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-brand rounded-full transition-all duration-1000"
                  style={{
                    width: task.max_tokens
                      ? `${Math.min(100, (task.decoded / task.max_tokens) * 100)}%`
                      : '0%',
                  }}
                />
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-low">prompt: {task.prompt_tokens}t</span>
                <span className="text-xs text-low">remaining: {task.remaining}t</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {llm.error && (
        <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
          <WarningIcon className="h-3 w-3" />
          {llm.error}
        </div>
      )}
    </div>
  );
}

// ── Section ──

function Section({
  title,
  count,
  children,
  icon,
  color,
  maxDisplay = 50,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
  icon: React.ReactNode;
  color: string;
  maxDisplay?: number;
}) {
  return (
    <div className="bg-secondary border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <span style={{ color }}>{icon}</span>
          <span className="text-sm font-semibold text-high">{title}</span>
          <span className="text-xs text-low">({count})</span>
        </div>
      </div>
      <div className="max-h-[400px] overflow-y-auto p-1">
        {children}
        {count > maxDisplay && (
          <div className="text-xs text-low text-center py-2">
            +{count - maxDisplay} more (use filter to see all)
          </div>
        )}
      </div>
    </div>
  );
}

// ── Pipeline Progress Bar ──

function PipelineProgressBar({ data }: { data: ReturnType<typeof usePipelineDetails>['data'] }) {
  if (!data) return null;
  const total = data.session_lifecycle.total || 1;
  const consolidated = data.session_lifecycle.entries.filter(e => e.rollup_id).length;
  const awaiting = data.unconsolidated_sessions?.count || 0;
  const pct = Math.round((consolidated / total) * 100);

  return (
    <div className="bg-secondary border border-border rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-high">Pipeline Progress</span>
        <span className="text-xs text-low">{consolidated}/{total} consolidated ({pct}%)</span>
      </div>
      <div className="w-full bg-background rounded-full h-2 overflow-hidden flex">
        <div
          className="h-full bg-green-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
          title={`${consolidated} consolidated`}
        />
        <div
          className="h-full bg-yellow-500 transition-all duration-500"
          style={{ width: `${Math.round((awaiting / total) * 100)}%` }}
          title={`${awaiting} awaiting`}
        />
      </div>
      <div className="flex items-center gap-4 mt-2 text-xs text-low">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-green-500" /> Consolidated
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-yellow-500" /> Awaiting
        </span>
      </div>
    </div>
  );
}

// ── Pipeline View ──

type ViewTab = 'pending' | 'skipped' | 'lifecycle' | 'processed' | 'awaiting';

export function PipelineView() {
  const [days, setDays] = useState(15);
  const [activeTab, setActiveTab] = useState<ViewTab>('lifecycle');
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, refetch } = usePipelineDetails(days);

  // Filter lifecycle entries
  const filteredLifecycle = useMemo(() => {
    if (!data?.session_lifecycle?.entries) return [];
    if (!search) return data.session_lifecycle.entries;
    const q = search.toLowerCase();
    return data.session_lifecycle.entries.filter(
      (s) =>
        s.trace_id.toLowerCase().includes(q) ||
        s.source_file.toLowerCase().includes(q) ||
        (s.rollup_id?.toLowerCase().includes(q))
    );
  }, [data, search]);

  // Filter awaiting sessions
  const filteredAwaiting = useMemo(() => {
    if (!data?.unconsolidated_sessions?.entries) return [];
    if (!search) return data.unconsolidated_sessions.entries;
    const q = search.toLowerCase();
    return data.unconsolidated_sessions.entries.filter(
      (o) =>
        (o.trace_id?.toLowerCase().includes(q)) ||
        o.source_file.toLowerCase().includes(q) ||
        o.reason.toLowerCase().includes(q)
    );
  }, [data, search]);

  // Filter files by search (filesystem views)
  const filteredPending = useMemo(() => {
    if (!data?.pending_raw_mds?.truly_pending_files) return [];
    if (!search) return data.pending_raw_mds.truly_pending_files;
    const q = search.toLowerCase();
    return data.pending_raw_mds.truly_pending_files.filter(
      (f) => f.filename.toLowerCase().includes(q) || f.trace_id.toLowerCase().includes(q)
    );
  }, [data, search]);

  const filteredAlreadyConsolidated = useMemo(() => {
    if (!data?.pending_raw_mds?.already_consolidated_files) return [];
    if (!search) return data.pending_raw_mds.already_consolidated_files;
    const q = search.toLowerCase();
    return data.pending_raw_mds.already_consolidated_files.filter(
      (f) => f.filename.toLowerCase().includes(q) || f.trace_id.toLowerCase().includes(q)
    );
  }, [data, search]);

  const filteredProcessed = useMemo(() => {
    if (!data?.processed_raw_mds?.files) return [];
    if (!search) return data.processed_raw_mds.files;
    const q = search.toLowerCase();
    return data.processed_raw_mds.files.filter(
      (f) => f.filename.toLowerCase().includes(q) || f.trace_id.toLowerCase().includes(q)
    );
  }, [data, search]);

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-2">
          <ArrowClockwiseIcon className="h-6 w-6 text-brand animate-spin" weight="bold" />
          <span className="text-sm text-low">Loading pipeline details...</span>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-2">
          <XCircleIcon className="h-6 w-6 text-red-500" weight="fill" />
          <span className="text-sm text-low">Failed to load pipeline details</span>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm bg-brand/10 text-brand hover:bg-brand/20 cursor-pointer"
          >
            <ArrowClockwiseIcon className="h-4 w-4" weight="fill" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const rollups = data.rollups_last_period;

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatsCard
          label="Sessions Ingested"
          value={data.session_lifecycle.total}
          icon={<FilesIcon className="h-4 w-4" />}
          color="#8B5CF6"
          sublabel={`Last ${days} days`}
        />
        <StatsCard
          label="Awaiting Consolidation"
          value={data.unconsolidated_sessions?.count ?? 0}
          icon={<ClockIcon className="h-4 w-4" />}
          color="#EAB308"
          sublabel={`MD written, no rollup`}
        />
        <StatsCard
          label="Processed MDs"
          value={data.processed_raw_mds.count}
          icon={<CheckCircleIcon className="h-4 w-4" />}
          color="#22C55E"
          sublabel={`Last ${days} days`}
        />
        <StatsCard
          label="Rollups Created"
          value={rollups.ok}
          icon={<ListBulletsIcon className="h-4 w-4" />}
          color="#3B82F6"
          sublabel={`${rollups.indexed} indexed`}
        />
      </div>

      {/* Pipeline Progress */}
      <PipelineProgressBar data={data} />

      {/* LLM Processing */}
      <LlmProcessingPanel llm={data.llm} />

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Day filter */}
        <div className="flex items-center gap-2">
          <ClockIcon className="h-4 w-4 text-low" weight="fill" />
          <span className="text-xs text-low">Days:</span>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="bg-secondary border border-border rounded-md px-2 py-1 text-xs text-normal cursor-pointer"
          >
            <option value={1}>1 day</option>
            <option value={3}>3 days</option>
            <option value={7}>7 days</option>
            <option value={15}>15 days</option>
            <option value={30}>30 days</option>
          </select>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <MagnifyingGlassIcon className="h-4 w-4 text-low shrink-0" weight="fill" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by trace ID, filename, or rollup..."
            className="flex-1 bg-secondary border border-border rounded-md px-2 py-1 text-xs text-normal placeholder:text-low focus:outline-none focus:border-brand/50"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-low hover:text-normal cursor-pointer"
            >
              <XCircleIcon className="h-4 w-4" weight="fill" />
            </button>
          )}
        </div>

        {/* Refresh */}
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-normal hover:bg-secondary border border-border cursor-pointer transition-colors"
        >
          <ArrowClockwiseIcon className="h-3.5 w-3.5" weight="fill" />
          Refresh
        </button>
      </div>

      {/* View Tabs */}
      <div className="flex items-center gap-0 border-b border-border">
        {(
          [
            { key: 'lifecycle', label: 'Lifecycle', count: data.session_lifecycle.total, color: '#8B5CF6' },
            { key: 'awaiting', label: 'Awaiting', count: data.unconsolidated_sessions?.count ?? 0, color: '#EAB308' },
            { key: 'pending', label: 'Pending', count: data.pending_raw_mds.truly_pending, color: '#EAB308' },
            { key: 'skipped', label: 'Skipped (dedup)', count: data.pending_raw_mds.already_consolidated, color: '#22C55E' },
            { key: 'processed', label: 'Processed', count: data.processed_raw_mds.count, color: '#3B82F6' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-b-2',
              activeTab === tab.key
                ? 'text-normal border-b-2 border-brand bg-brand/5'
                : 'text-low hover:text-normal hover:bg-secondary border-b-2 border-transparent'
            )}
          >
            {tab.label}
            <span
              className="text-xs px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: `${tab.color}20`,
                color: tab.color,
              }}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab Content */}

      {/* Lifecycle Tab */}
      {activeTab === 'lifecycle' && (
        <Section
          title="Session Lifecycle — Unified Tracking"
          count={filteredLifecycle.length}
          icon={<PipeIcon className="h-5 w-5" />}
          color="#8B5CF6"
        >
          {filteredLifecycle.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-low">
              <PipeIcon className="h-8 w-8 mb-2" weight="fill" />
              <p className="text-sm">No sessions in selected period</p>
            </div>
          ) : (
            filteredLifecycle.map((entry, i) => (
              <LifecycleRow key={entry.trace_id + i} entry={entry} />
            ))
          )}
        </Section>
      )}

      {/* Awaiting Tab */}
      {activeTab === 'awaiting' && (
        <Section
          title="Awaiting Consolidation — MD written, no rollup"
          count={filteredAwaiting.length}
          icon={<ClockIcon className="h-5 w-5" />}
          color="#EAB308"
        >
          {filteredAwaiting.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-low">
              <CheckCircleIcon className="h-8 w-8 text-green-500 mb-2" weight="fill" />
              <p className="text-sm">All caught up!</p>
              <p className="text-xs">No sessions awaiting consolidation</p>
            </div>
          ) : (
            filteredAwaiting.map((session, i) => (
              <AwaitingRow key={(session.trace_id || 'unknown') + i} session={session} />
            ))
          )}
        </Section>
      )}

      {/* Pending Tab */}
      {activeTab === 'pending' && (
        <Section
          title="Pending — Needs Consolidation"
          count={filteredPending.length}
          icon={<FunnelIcon className="h-5 w-5" />}
          color="#EAB308"
        >
          {filteredPending.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-low">
              <CheckCircleIcon className="h-8 w-8 text-green-500 mb-2" weight="fill" />
              <p className="text-sm">All caught up!</p>
              <p className="text-xs">No pending raw MD files</p>
            </div>
          ) : (
            filteredPending.map((file) => (
              <FileRow key={file.filename} file={file} status="pending" />
            ))
          )}
        </Section>
      )}

      {/* Skipped Tab */}
      {activeTab === 'skipped' && (
        <Section
          title="Skipped — Already Consolidated"
          count={filteredAlreadyConsolidated.length}
          icon={<CheckCircleIcon className="h-5 w-5" />}
          color="#22C55E"
        >
          {filteredAlreadyConsolidated.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-low">
              <CheckCircleIcon className="h-8 w-8 text-green-500 mb-2" weight="fill" />
              <p className="text-sm">Nothing to skip</p>
              <p className="text-xs">All files are either pending or processed</p>
            </div>
          ) : (
            filteredAlreadyConsolidated.map((file) => (
              <FileRow key={file.filename} file={file} status="consolidated" />
            ))
          )}
        </Section>
      )}

      {/* Processed Tab */}
      {activeTab === 'processed' && (
        <Section
          title="Processed Raw MD Files"
          count={filteredProcessed.length}
          icon={<CheckCircleIcon className="h-5 w-5" />}
          color="#3B82F6"
        >
          {filteredProcessed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-low">
              <FilesIcon className="h-8 w-8 mb-2" weight="fill" />
              <p className="text-sm">No processed files in selected period</p>
            </div>
          ) : (
            filteredProcessed.map((file) => (
              <FileRow key={file.filename} file={file} status="processed" />
            ))
          )}
        </Section>
      )}
    </div>
  );
}
