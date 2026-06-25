import {
  BrainIcon,
  ClockIcon,
  ListChecksIcon,
  CpuIcon,
  CheckCircleIcon,
  WarningIcon,
  XCircleIcon,
  ArrowClockwiseIcon,
} from '@phosphor-icons/react';
import { useConsolidationStatus, type ConsolidationTier, type LlmState } from '@/shared/hooks/council';
import { cn } from '@/shared/lib/utils';

// ── Tier config ──

const TIER_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  daily: { label: '24-Hour Diary', color: '#3B82F6', bg: '#3B82F620', icon: '📘' },
  short: { label: '3-Day Digest', color: '#8B5CF6', bg: '#8B5CF620', icon: '📗' },
  weekly: { label: 'Weekly Review', color: '#10B981', bg: '#10B98120', icon: '📙' },
  bimonthly: { label: 'Bi-Weekly Overview', color: '#F59E0B', bg: '#F59E0B20', icon: '📕' },
};

// ── Helpers ──

function formatTimeAgo(iso: string | null): string {
  if (!iso) return 'never';
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

function formatProgress(decoded: number, max: number): string {
  if (!max) return `${decoded}`;
  const pct = Math.round((decoded / max) * 100);
  return `${decoded}/${max} (${pct}%)`;
}

// ── Tier Card ──

function TierCard({ tier }: { tier: ConsolidationTier }) {
  const config = TIER_CONFIG[tier.id] ?? { label: tier.id, color: '#6B7280', bg: '#6B728020', icon: '📄' };
  const lastRunAgo = formatTimeAgo(tier.last_run_at);
  const hasRaw = (tier.rollups?.raw ?? 0) > 0;

  return (
    <div className="bg-secondary border border-border rounded-lg p-4 hover:border-border/80 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{config.icon}</span>
          <div>
            <div className="font-semibold text-sm text-high">{config.label}</div>
            <div className="text-xs text-low">window: {tier.window_days}d · ttl: {tier.ttl_days}d</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {tier.is_active ? (
            <CheckCircleIcon className="h-4 w-4 text-green-500" weight="fill" />
          ) : (
            <XCircleIcon className="h-4 w-4 text-red-500" weight="fill" />
          )}
          <span className="text-xs text-low">{lastRunAgo}</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-background/50 rounded-md p-2 text-center">
          <div className="text-lg font-bold text-normal">{tier.rollups?.total ?? 0}</div>
          <div className="text-xs text-low">rollups</div>
        </div>
        <div className="bg-background/50 rounded-md p-2 text-center">
          <div className={cn(
            'text-lg font-bold',
            hasRaw ? 'text-yellow-500' : 'text-green-500'
          )}>
            {tier.rollups?.raw ?? 0}
          </div>
          <div className="text-xs text-low">raw</div>
        </div>
        <div className="bg-background/50 rounded-md p-2 text-center">
          <div className="text-lg font-bold text-normal">{tier.md_file_count}</div>
          <div className="text-xs text-low">MD files</div>
        </div>
      </div>

      {/* Latest rollup */}
      {tier.rollups?.latest && (
        <div className="mt-2 text-xs text-low flex items-center gap-1">
          <ClockIcon className="h-3 w-3" />
          Latest: {formatTimeAgo(tier.rollups.latest)}
        </div>
      )}
    </div>
  );
}

// ── LLM Status Panel ──

function LlmStatusPanel({ llm, model }: { llm: LlmState; model?: string }) {
  const isBusy = llm.processing > 0;
  const modelName = model ?? 'Arc LLM';

  return (
    <div className="bg-secondary border border-border rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CpuIcon className="h-5 w-5 text-brand" weight="bold" />
          <span className="font-semibold text-sm text-high">{modelName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium',
            isBusy
              ? 'bg-yellow-500/10 text-yellow-400'
              : 'bg-green-500/10 text-green-400'
          )}>
            <span className={cn(
              'h-2 w-2 rounded-full',
              isBusy ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'
            )} />
            {isBusy ? 'Processing' : 'Idle'}
          </span>
        </div>
      </div>

      {/* Slot overview */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-background/50 rounded-md p-2 text-center">
          <div className="text-lg font-bold text-normal">{llm.total_slots}</div>
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

      {/* Active tasks */}
      {llm.active_tasks.length > 0 && (
        <div className="space-y-2">
          {llm.active_tasks.map((task) => (
            <div key={task.slot_id} className="bg-background/50 rounded-md p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-normal">Slot {task.slot_id} · Task #{task.task_id}</span>
                <span className="text-xs text-low">
                  {formatProgress(task.decoded, task.max_tokens)}
                </span>
              </div>
              {/* Progress bar */}
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

// ── Recent Activity ──

function formatSourceLabel(source_id: string | null): string {
  if (!source_id) return '—';
  // Extract date from UUID-like source_id (first 12 chars encode time)
  // Format: 019ed776-acb1-77a7-a8ab-0237933c0263
  // Show short hash for readability
  return source_id.slice(0, 8);
}

function RecentActivity({ rollups }: { rollups: { id: string | null; tier: string; source_id: string | null; parse_status: string; is_indexed: boolean; summary_preview: string; created_at: string }[] }) {
  if (!rollups.length) return null;

  return (
    <div className="bg-secondary border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <ListChecksIcon className="h-5 w-5 text-brand" weight="bold" />
        <span className="font-semibold text-sm text-high">Recent Activity</span>
      </div>
      <div className="space-y-2">
        {rollups.slice(0, 8).map((r, i) => (
          <div key={i} className="border border-border/50 rounded-md p-2.5 hover:border-border/80 transition-colors">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-xs" style={{ color: TIER_CONFIG[r.tier]?.color ?? '#6B7280' }}>
                  {TIER_CONFIG[r.tier]?.label ?? r.tier}
                </span>
                <span className="text-xs text-low font-mono">{formatSourceLabel(r.source_id)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  'px-1.5 py-0.5 rounded text-xs',
                  r.parse_status === 'ok' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
                )}>
                  {r.parse_status}
                </span>
                {r.is_indexed && (
                  <CheckCircleIcon className="h-3 w-3 text-green-500" weight="fill" />
                )}
                <span className="text-xs text-low">{formatTimeAgo(r.created_at)}</span>
              </div>
            </div>
            {r.summary_preview && (
              <p className="text-xs text-low line-clamp-2 leading-relaxed">{r.summary_preview}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Monitor ──

export function ConsolidationMonitor() {
  const { data, isLoading, isError } = useConsolidationStatus();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-2">
          <ArrowClockwiseIcon className="h-6 w-6 text-brand animate-spin" weight="bold" />
          <span className="text-sm text-low">Loading consolidation status...</span>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-2">
          <XCircleIcon className="h-6 w-6 text-red-500" weight="fill" />
          <span className="text-sm text-low">Failed to load consolidation status</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-4 bg-secondary border border-border rounded-lg p-3">
        <div className="flex items-center gap-2">
          <BrainIcon className="h-5 w-5 text-brand" weight="bold" />
          <span className="font-semibold text-sm">Consolidation Pipeline</span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-4 text-xs">
          <span className="text-low">
            Total rollups: <span className="font-bold text-normal">{data.total_rollups}</span>
          </span>
          <span className="text-low">
            Indexed: <span className="font-bold text-green-500">{data.total_ok}</span>
          </span>
          <span className="text-low">
            Raw: <span className={cn(
              'font-bold',
              data.total_raw > 0 ? 'text-yellow-500' : 'text-green-500'
            )}>{data.total_raw}</span>
          </span>
        </div>
      </div>

      {/* LLM Status */}
      <LlmStatusPanel llm={data.llm} model={data.model} />

      {/* Tier cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {data.tiers.map((tier) => (
          <TierCard key={tier.id} tier={tier} />
        ))}
      </div>

      {/* Recent activity */}
      <RecentActivity rollups={data.recent_rollups} />
    </div>
  );
}
