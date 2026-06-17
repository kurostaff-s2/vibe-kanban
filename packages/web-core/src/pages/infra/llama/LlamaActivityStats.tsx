import { useState } from 'react';
import {
  CaretDownIcon,
  CaretRightIcon,
  ListIcon,
} from '@phosphor-icons/react';
import { cn } from '@/shared/lib/utils';
import { useLlamaSwapStats } from '@/shared/hooks/council/useLlamaSwapStats';

// ── Helpers ────────────────────────────────────────────────────────────

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatDuration(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

// ── Summary Card ──────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="bg-secondary/30 rounded-md px-3 py-2 text-center">
      <div className={cn('text-sm font-medium', color ?? 'text-high')}>
        {value}
      </div>
      <div className="text-[10px] text-low">{label}</div>
    </div>
  );
}

// ── Duration Histogram (CSS bars) ──────────────────────────────────────

function DurationHistogram({ durations }: { durations: number[] }) {
  if (durations.length === 0) return null;

  const buckets = [
    { label: '<100ms', max: 100 },
    { label: '100-500ms', max: 500 },
    { label: '500ms-1s', max: 1000 },
    { label: '1-5s', max: 5000 },
    { label: '>5s', max: Infinity },
  ];

  const counts = buckets.map((b) => {
    if (b.label === '>5s') return durations.filter((d) => d > 5000).length;
    const prev = buckets[buckets.indexOf(b) - 1]?.max ?? 0;
    return durations.filter((d) => d >= prev && d < b.max).length;
  });

  const maxCount = Math.max(...counts, 1);

  return (
    <div className="space-y-1">
      {buckets.map((b, i) => (
        <div key={b.label} className="flex items-center gap-2">
          <span className="text-[10px] text-low w-14 shrink-0 text-right">
            {b.label}
          </span>
          <div className="flex-1 h-4 bg-secondary/50 rounded-sm overflow-hidden">
            <div
              className={cn(
                'h-full rounded-sm transition-all',
                counts[i] > 0
                  ? counts[i] / maxCount > 0.7
                    ? 'bg-yellow-500/60'
                    : 'bg-green-500/60'
                  : 'bg-transparent'
              )}
              style={{ width: `${(counts[i] / maxCount) * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-low w-8 shrink-0">
            {counts[i]}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Per-Model Breakdown ────────────────────────────────────────────────

function PerModelBreakdown({ entries }: { entries: any[] }) {
  const byModel = new Map<string, { count: number; totalMs: number; tokens: number }>();

  for (const e of entries) {
    const existing = byModel.get(e.model) ?? {
      count: 0,
      totalMs: 0,
      tokens: 0,
    };
    existing.count++;
    existing.totalMs += e.duration_ms ?? 0;
    existing.tokens += e.tokens?.output_tokens ?? 0;
    byModel.set(e.model, existing);
  }

  const rows = Array.from(byModel.entries())
    .map(([model, data]) => ({
      model,
      ...data,
      avgMs: data.count > 0 ? data.totalMs / data.count : 0,
    }))
    .sort((a, b) => b.count - a.count);

  if (rows.length === 0) return null;

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-12 gap-1 text-[10px] font-semibold text-low uppercase tracking-wider px-2">
        <div className="col-span-4">Model</div>
        <div className="col-span-2 text-right">Requests</div>
        <div className="col-span-3 text-right">Avg Duration</div>
        <div className="col-span-3 text-right">Output Tokens</div>
      </div>
      {rows.slice(0, 10).map((row) => (
        <div
          key={row.model}
          className="grid grid-cols-12 gap-1 text-xs text-normal px-2 py-0.5"
        >
          <div className="col-span-4 truncate text-high">{row.model}</div>
          <div className="col-span-2 text-right">{row.count}</div>
          <div className="col-span-3 text-right">{formatDuration(row.avgMs)}</div>
          <div className="col-span-3 text-right">{formatNumber(row.tokens)}</div>
        </div>
      ))}
    </div>
  );
}

// ── In-Flight Requests ─────────────────────────────────────────────────

function InFlightList({ requests }: { requests: any[] }) {
  if (requests.length === 0) return null;

  return (
    <div className="space-y-1">
      <div className="text-[10px] font-semibold text-low uppercase tracking-wider">
        In-Flight ({requests.length})
      </div>
      {requests.slice(0, 5).map((r) => (
        <div
          key={r.id}
          className="flex items-center gap-2 text-xs text-normal px-2 py-0.5"
        >
          <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse shrink-0" />
          <span className="text-high truncate flex-1">{r.model}</span>
          <span className="text-low shrink-0">
            {r.tokens_generated ?? 0} tokens
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Panel ──────────────────────────────────────────────────────────────

export function LlamaActivityStats() {
  const {
    activityEntries,
    totalRequests,
    totalInputTokens,
    totalOutputTokens,
    totalCacheTokens,
    inflightRequests,
    connected,
  } = useLlamaSwapStats();

  const [collapsed, setCollapsed] = useState(false);

  const durations = activityEntries
    .map((e) => e.duration_ms)
    .filter((d): d is number => d != null);

  const cacheHitRate =
    totalRequests > 0
      ? ((totalCacheTokens / Math.max(totalInputTokens, 1)) * 100).toFixed(1)
      : '0.0';

  // Latest per-request speed metrics
  const latestEntry = activityEntries[0] ?? null;
  const latestPP = latestEntry?.tokens?.prompt_per_second ?? 0;
  const latestTG = latestEntry?.tokens?.tokens_per_second ?? 0;

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
          <span className="text-sm font-medium text-high">Activity Stats</span>
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              connected ? 'bg-green-500' : 'bg-red-500'
            )}
          />
        </div>
        <span className="text-xs text-low">
          {collapsed ? <CaretRightIcon className="h-4 w-4" /> : <CaretDownIcon className="h-4 w-4" />}
        </span>
      </div>

      {!collapsed && (
        <div className="p-4 space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-5 gap-2">
            <SummaryCard label="Requests" value={formatNumber(totalRequests)} />
            <SummaryCard
              label="Input Tokens"
              value={formatNumber(totalInputTokens)}
              color="text-blue-400"
            />
            <SummaryCard
              label="Output Tokens"
              value={formatNumber(totalOutputTokens)}
              color="text-green-400"
            />
            <SummaryCard
              label="Cache Tokens"
              value={formatNumber(totalCacheTokens)}
              color="text-purple-400"
            />
            <SummaryCard
              label="Cache Hit"
              value={`${cacheHitRate}%`}
              color={parseFloat(cacheHitRate) > 50 ? 'text-green-400' : 'text-yellow-400'}
            />
          </div>

          {/* Latest Speed Metrics */}
          {latestEntry && (
            <div>
              <div className="text-[10px] font-semibold text-low uppercase tracking-wider mb-2">
                Latest Request ({latestEntry.model})
              </div>
              <div className="grid grid-cols-2 gap-2">
                <SummaryCard
                  label="PP (prompt/s)"
                  value={latestPP.toFixed(0)}
                  color="text-cyan-400"
                />
                <SummaryCard
                  label="TG/s (tokens/s)"
                  value={latestTG.toFixed(0)}
                  color="text-orange-400"
                />
              </div>
            </div>
          )}

          {/* Duration Histogram */}
          {durations.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-low uppercase tracking-wider mb-2">
                Response Duration Distribution
              </div>
              <DurationHistogram durations={durations} />
            </div>
          )}

          {/* Per-Model Breakdown */}
          {activityEntries.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-low uppercase tracking-wider mb-2">
                Per-Model Breakdown
              </div>
              <PerModelBreakdown entries={activityEntries} />
            </div>
          )}

          {/* In-Flight */}
          <InFlightList requests={inflightRequests} />
        </div>
      )}
    </div>
  );
}

export default LlamaActivityStats;
