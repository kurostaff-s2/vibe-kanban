import { useState, useMemo, useCallback } from 'react';
import {
  CaretDownIcon,
  CaretRightIcon,
  BrainIcon,
  ClockIcon,
  ListBulletsIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  XIcon,
  ArrowDownIcon,
  ArrowUpIcon,
} from '@phosphor-icons/react';
import { useCouncilMemoryRollups } from '@/shared/hooks/council';
import { parseRollupJson, type MemoryRollup } from 'shared/council-types';
import { ConsolidationMonitor } from './ConsolidationMonitor';
import { PipelineView } from './PipelineView';

// ── Tier configuration ──

const TIER_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  daily: { label: 'Daily', color: '#3B82F6', bg: '#3B82F620', icon: '📘' },
  short: { label: 'Short', color: '#8B5CF6', bg: '#8B5CF620', icon: '📗' },
  weekly: { label: 'Weekly', color: '#10B981', bg: '#10B98120', icon: '📙' },
  bimonthly: { label: 'Bi-monthly', color: '#F59E0B', bg: '#F59E0B20', icon: '📕' },
  manual: { label: 'Manual', color: '#6B7280', bg: '#6B728020', icon: '📄' },
};

const TIER_ORDER: string[] = ['daily', 'short', 'weekly', 'bimonthly', 'manual'];

// ── Helpers ──

function extractItemText(item: unknown): string {
  if (typeof item === 'string') return item;
  if (typeof item === 'number' || typeof item === 'boolean') return String(item);
  if (typeof item === 'object' && item !== null) {
    // Prefer known fields
    if ('what' in item) return String(item.what);
    if ('title' in item) return String(item.title);
    if ('action' in item && 'target_id' in item) {
      return `${item.action}: ${item.target_id}`;
    }
    // Fallback: join first 2 values
    const vals = Object.values(item).filter(v => v != null && typeof v === 'string');
    return vals.slice(0, 2).join(' — ') || JSON.stringify(item);
  }
  return String(item);
}

function ensureArray<T>(val: T | T[] | string): T[] {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') return [val] as unknown as T[];
  return [val];
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatTimeAgo(iso: string): string {
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
    return iso;
  }
}

function truncate(text: string, max: number = 300): string {
  if (!text) return '';
  return text.length > max ? text.slice(0, max) + '…' : text;
}

// Simple keyword search across rollup content
function matchesSearch(rollup: MemoryRollup, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const searchFields = [
    rollup.summary_text,
    rollup.decisions,
    rollup.work_completed,
    rollup.open_items,
    rollup.id,
    rollup.tier,
  ].filter(Boolean).map(String).join(' ').toLowerCase();
  return searchFields.includes(q);
}

// ── Rollup Card ──

function RollupCard({ rollup }: { rollup: MemoryRollup }) {
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const tier = TIER_CONFIG[rollup.tier] ?? TIER_CONFIG.manual;

  const decisions = ensureArray(parseRollupJson<unknown>(rollup.decisions, []));
  const workCompleted = ensureArray(parseRollupJson<unknown>(rollup.work_completed, []));
  const openItems = ensureArray(parseRollupJson<unknown>(rollup.open_items, []));
  const carriedForward = ensureArray(parseRollupJson<unknown>(rollup.carried_forward, []));
  const keyFiles = ensureArray(parseRollupJson<unknown>(rollup.key_files, []));
  const keyFunctions = ensureArray(parseRollupJson<unknown>(rollup.key_functions, []));

  const hasSections = decisions.length > 0 || workCompleted.length > 0 ||
    openItems.length > 0 || carriedForward.length > 0 ||
    keyFiles.length > 0 || keyFunctions.length > 0;

  const summaryTruncated = rollup.summary_text && rollup.summary_text.length > 300;

  // Quick toggle all sections
  const toggleAll = useCallback(() => {
    setExpandedSection(prev => prev === 'all' ? null : 'all');
  }, []);

  const Section = ({ key, items, label }: { key: string; items: unknown[]; label: string }) => {
    if (items.length === 0) return null;
    const isOpen = expandedSection === 'all' || expandedSection === key;
    return (
      <div className="border border-border/50 rounded-md overflow-hidden">
        <button
          onClick={() => setExpandedSection(isOpen ? null : key)}
          className="w-full flex items-center gap-1.5 px-3 py-1.5 bg-background/30 hover:bg-background/50 transition-colors text-xs font-medium text-low"
        >
          {isOpen ? <CaretDownIcon className="h-3 w-3" /> : <CaretRightIcon className="h-3 w-3" />}
          {label} ({items.length})
        </button>
        {isOpen && (
          <div className="p-2 space-y-1 text-xs text-low">
            <ul className="list-disc list-inside space-y-0.5">
              {items.map((item, i) => (
                <li key={i} className="leading-relaxed">{extractItemText(item)}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-secondary border border-border rounded-lg p-4 hover:border-border/80 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
            style={{ backgroundColor: tier.bg, color: tier.color }}
          >
            <span>{tier.icon}</span>
            {tier.label}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-low">
            <ClockIcon className="h-3 w-3" />
            {formatTimeAgo(rollup.created_at)}
          </span>
        </div>
        {hasSections && (
          <button
            onClick={toggleAll}
            className="text-xs text-brand hover:underline flex items-center gap-1"
          >
            {expandedSection === 'all' ? 'Collapse all' : 'Expand all'}
          </button>
        )}
      </div>

      {/* Summary */}
      {rollup.summary_text && (
        <div className="mb-3">
          <p className="text-sm text-normal leading-relaxed whitespace-pre-wrap">
            {summaryExpanded ? rollup.summary_text : truncate(rollup.summary_text)}
          </p>
          {summaryTruncated && (
            <button
              onClick={() => setSummaryExpanded(!summaryExpanded)}
              className="text-xs text-brand hover:underline mt-1"
            >
              {summaryExpanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      )}

      {/* Collapsible sections */}
      {hasSections && (
        <div className="space-y-2">
          <Section key="decisions" items={decisions} label="Decisions" />
          <Section key="work_completed" items={workCompleted} label="Work Completed" />
          <Section key="open_items" items={openItems} label="Open Items" />
          <Section key="carried_forward" items={carriedForward} label="Carried Forward" />
          <Section key="key_files" items={keyFiles} label="Key Files" />
          <Section key="key_functions" items={keyFunctions} label="Key Functions" />
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
        <span className="text-xs text-low">
          {formatDate(rollup.created_at)}
        </span>
        <span className="text-xs text-low font-mono truncate max-w-[180px]" title={rollup.id}>
          {rollup.id}
        </span>
      </div>
    </div>
  );
}

// ── Filter Bar ──

function FilterBar({
  searchQuery,
  setSearchQuery,
  selectedTiers,
  toggleTier,
  resultCount,
  totalCount,
}: {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedTiers: string[];
  toggleTier: (tier: string) => void;
  resultCount: number;
  totalCount: number;
}) {
  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-low" />
        <input
          type="text"
          placeholder="Search rollups by keyword..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-8 py-2 bg-background border border-border rounded-md text-sm text-normal placeholder:text-low focus:outline-none focus:ring-1 focus:ring-brand"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-low hover:text-normal"
          >
            <XIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Tier filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-low">Tiers:</span>
        {TIER_ORDER.map((tier) => {
          const config = TIER_CONFIG[tier];
          const isSelected = selectedTiers.includes(tier);
          return (
            <button
              key={tier}
              onClick={() => toggleTier(tier)}
              className={`
                inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors
                ${isSelected
                  ? 'ring-1 ring-brand/50'
                  : 'opacity-60 hover:opacity-100'
                }
              `}
              style={{
                backgroundColor: isSelected ? config.bg : 'transparent',
                color: config.color,
              }}
            >
              <span>{config.icon}</span>
              {config.label}
            </button>
          );
        })}
        {resultCount < totalCount && (
          <span className="text-xs text-low ml-auto">
            {resultCount} of {totalCount}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Rollups List ──

function RollupsList() {
  const { data: rollups = [], isLoading } = useCouncilMemoryRollups();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTiers, setSelectedTiers] = useState<string[]>(TIER_ORDER);
  const [sortAsc, setSortAsc] = useState(false);

  const toggleTier = useCallback((tier: string) => {
    setSelectedTiers(prev =>
      prev.includes(tier)
        ? prev.filter(t => t !== tier)
        : [...prev, tier]
    );
  }, []);

  const filtered = useMemo(() => {
    let result = rollups;

    // Filter by tiers
    if (selectedTiers.length < TIER_ORDER.length) {
      result = result.filter(r => selectedTiers.includes(r.tier ?? 'manual'));
    }

    // Filter by search
    if (searchQuery) {
      result = result.filter(r => matchesSearch(r, searchQuery));
    }

    // Sort
    result = [...result].sort((a, b) => {
      const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return sortAsc ? -diff : diff;
    });

    return result;
  }, [rollups, selectedTiers, searchQuery, sortAsc]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-low">Loading memory rollups...</p>
      </div>
    );
  }

  if (rollups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2">
        <BrainIcon className="h-8 w-8 text-low" weight="fill" />
        <p className="text-sm text-low">No memory rollups yet</p>
        <p className="text-xs text-low">Rollups are generated by the consolidation pipeline</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Filters */}
      <FilterBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedTiers={selectedTiers}
        toggleTier={toggleTier}
        resultCount={filtered.length}
        totalCount={rollups.length}
      />

      {/* Sort toggle */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-low">
          {filtered.length} rollup{filtered.length !== 1 ? 's' : ''}
        </span>
        <button
          onClick={() => setSortAsc(!sortAsc)}
          className="flex items-center gap-1 text-xs text-low hover:text-normal transition-colors"
        >
          {sortAsc ? <ArrowUpIcon className="h-3 w-3" /> : <ArrowDownIcon className="h-3 w-3" />}
          {sortAsc ? 'Oldest first' : 'Newest first'}
        </button>
      </div>

      {/* Rollup cards */}
      <div className="space-y-3">
        {filtered.map((rollup) => (
          <RollupCard key={rollup.id} rollup={rollup} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <MagnifyingGlassIcon className="h-8 w-8 text-low" weight="fill" />
          <p className="text-sm text-low">No rollups match your filters</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedTiers(TIER_ORDER);
            }}
            className="text-xs text-brand hover:underline mt-1"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}

// ── Page with tabs ──

type TabKey = 'monitor' | 'pipeline' | 'rollups';

export function MemoryRollupsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('monitor');

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    {
      key: 'monitor',
      label: 'Monitoring',
      icon: <BrainIcon className="h-4 w-4" weight="bold" />,
    },
    {
      key: 'pipeline',
      label: 'Pipeline',
      icon: <FunnelIcon className="h-4 w-4" weight="bold" />,
    },
    {
      key: 'rollups',
      label: 'Rollups',
      icon: <ListBulletsIcon className="h-4 w-4" weight="bold" />,
    },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header with tabs */}
      <div className="flex items-center gap-0 border-b border-border shrink-0">
        <div className="flex items-center gap-2 px-4 py-2 text-low border-r border-border">
          <BrainIcon className="h-5 w-5 text-brand" weight="bold" />
          <span className="text-sm font-semibold text-high">Memory</span>
        </div>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`
              flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors
              ${activeTab === tab.key
                ? 'text-normal border-b-2 border-brand bg-brand/5'
                : 'text-low hover:text-normal hover:bg-secondary'
              }
            `}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'monitor' ? <ConsolidationMonitor /> : activeTab === 'pipeline' ? <PipelineView /> : <RollupsList />}
      </div>
    </div>
  );
}
