import { useMemo } from 'react';
import { useCouncilMemoryRollups } from '@/shared/hooks/council';
import { parseRollupJson, type MemoryRollup } from 'shared/council-types';
import { BrainIcon, ClockIcon, ListBulletsIcon } from '@phosphor-icons/react';

// ── Tier configuration ──

const TIER_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  daily: { label: 'Daily', color: '#3B82F6', bg: '#3B82F620' },
  short: { label: 'Short', color: '#8B5CF6', bg: '#8B5CF620' },
  weekly: { label: 'Weekly', color: '#10B981', bg: '#10B98120' },
  bimonthly: { label: 'Bi-monthly', color: '#F59E0B', bg: '#F59E0B20' },
  manual: { label: 'Manual', color: '#6B7280', bg: '#6B728020' },
};

const TIER_ORDER: string[] = ['daily', 'short', 'weekly', 'bimonthly', 'manual'];

// ── Helpers ──

/** Extract a display string from a rollup list item (string or object with `what`). */
function extractItemText(item: unknown): string {
  if (typeof item === 'string') return item;
  if (typeof item === 'object' && item !== null && 'what' in item) {
    return String(item.what);
  }
  return String(item);
}

/** Ensure the parsed value is always an array. Handles JSON-encoded strings that parse to a single string. */
function ensureArray<T>(val: T | T[] | string): T[] {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') return [val] as unknown as T[];
  return [val];
}

function formatTimeWindow(start: string, end: string): string {
  const fmt = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };
  return `${fmt(start)} → ${fmt(end)}`;
}

function truncate(text: string, max: number = 280): string {
  if (!text) return '';
  return text.length > max ? text.slice(0, max) + '…' : text;
}

// ── Rollup Card ──

function RollupCard({ rollup }: { rollup: MemoryRollup }) {
  const tier = TIER_CONFIG[rollup.tier] ?? TIER_CONFIG.manual;
  const decisions = ensureArray(parseRollupJson<unknown>(rollup.decisions, []));
  const workCompleted = ensureArray(parseRollupJson<unknown>(rollup.work_completed, []));
  const openItems = ensureArray(parseRollupJson<unknown>(rollup.open_items, []));

  const hasContent = decisions.length > 0 || workCompleted.length > 0 || openItems.length > 0;

  return (
    <div className="bg-secondary border border-border rounded-lg p-4 hover:border-border/80 transition-colors">
      {/* Header row */}
      <div className="flex items-center gap-2 mb-2">
        <span
          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
          style={{ backgroundColor: tier.bg, color: tier.color }}
        >
          {tier.label}
        </span>
        <span className="inline-flex items-center gap-1 text-xs text-low">
          <ClockIcon className="h-3 w-3" />
          {formatTimeWindow(rollup.window_start, rollup.window_end)}
        </span>
      </div>

      {/* Summary text */}
      {rollup.summary_text && (
        <p className="text-sm text-normal mb-3 leading-relaxed whitespace-pre-wrap">
          {truncate(rollup.summary_text)}
        </p>
      )}

      {/* Content sections */}
      {hasContent && (
        <div className="space-y-2">
          {decisions.length > 0 && (
            <div className="text-xs">
              <div className="font-medium text-low mb-1 flex items-center gap-1">
                <ListBulletsIcon className="h-3 w-3" />
                Decisions ({decisions.length})
              </div>
              <ul className="list-disc list-inside text-low space-y-0.5">
                {decisions.slice(0, 3).map((d, i) => (
                  <li key={i} className="line-clamp-2">{extractItemText(d)}</li>
                ))}
                {decisions.length > 3 && (
                  <li className="text-low italic">+{decisions.length - 3} more</li>
                )}
              </ul>
            </div>
          )}

          {workCompleted.length > 0 && (
            <div className="text-xs">
              <div className="font-medium text-low mb-1">Work Completed ({workCompleted.length})</div>
              <ul className="list-disc list-inside text-low space-y-0.5">
                {workCompleted.slice(0, 3).map((w, i) => (
                  <li key={i} className="line-clamp-2">{extractItemText(w)}</li>
                ))}
                {workCompleted.length > 3 && (
                  <li className="text-low italic">+{workCompleted.length - 3} more</li>
                )}
              </ul>
            </div>
          )}

          {openItems.length > 0 && (
            <div className="text-xs">
              <div className="font-medium text-low mb-1">Open Items ({openItems.length})</div>
              <ul className="list-disc list-inside text-low space-y-0.5">
                {openItems.slice(0, 3).map((o, i) => (
                  <li key={i} className="line-clamp-2">{extractItemText(o)}</li>
                ))}
                {openItems.length > 3 && (
                  <li className="text-low italic">+{openItems.length - 3} more</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
        <span className="text-xs text-low">
          {new Date(rollup.created_at).toLocaleDateString()}
        </span>
        <span className="text-xs text-low truncate max-w-[200px]" title={rollup.id}>
          {rollup.id}
        </span>
      </div>
    </div>
  );
}

// ── Page ──

export function MemoryRollupsPage() {
  const { data: rollups = [], isLoading } = useCouncilMemoryRollups();

  // Group by tier, maintain tier order
  const grouped = useMemo(() => {
    const map = new Map<string, MemoryRollup[]>();
    TIER_ORDER.forEach((t) => map.set(t, []));

    rollups.forEach((r) => {
      const tier = r.tier ?? 'manual';
      const existing = map.get(tier) ?? [];
      existing.push(r);
      map.set(tier, existing);
    });

    return map;
  }, [rollups]);

  const totalCount = rollups.length;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <BrainIcon className="h-5 w-5 text-brand" weight="bold" />
          <h1 className="text-lg font-semibold text-high">Memory Rollups</h1>
          <span className="text-xs text-low bg-secondary px-2 py-0.5 rounded-full">
            {totalCount}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-low">Loading memory rollups...</p>
          </div>
        ) : totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <BrainIcon className="h-8 w-8 text-low" weight="fill" />
            <p className="text-sm text-low">No memory rollups yet</p>
            <p className="text-xs text-low">
              Rollups are generated by the consolidation pipeline
            </p>
          </div>
        ) : (
          <div className="space-y-6 max-w-4xl mx-auto">
            {TIER_ORDER.map((tier) => {
              const items = grouped.get(tier) ?? [];
              if (items.length === 0) return null;
              const config = TIER_CONFIG[tier] ?? TIER_CONFIG.manual;

              return (
                <section key={tier}>
                  <h2
                    className="text-sm font-semibold mb-3 flex items-center gap-2"
                    style={{ color: config.color }}
                  >
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ backgroundColor: config.color }}
                    />
                    {config.label}
                    <span className="text-xs font-normal text-low">
                      ({items.length})
                    </span>
                  </h2>
                  <div className="grid gap-3">
                    {items.map((rollup) => (
                      <RollupCard key={rollup.id} rollup={rollup} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
