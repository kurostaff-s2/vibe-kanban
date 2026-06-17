import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ArrowClockwiseIcon,
  MagnifyingGlassIcon,
  FileTextIcon,
  ArrowRightIcon,
  UsersIcon,
  LinkIcon,
} from '@phosphor-icons/react';
import { cn } from '@/shared/lib/utils';

// ── Types ───────────────────────────────────────────────────────────────

interface DelegationRecord {
  id: number;
  run_id: string;
  chain_id: string;
  from_model: string | null;
  to_model: string;
  role: string;
  batch: number;
  retry: number;
  task_preview: string;
  response_length: number | null;
  md_file_path: string | null;
  source_id: string | null;
  trace_id: string | null;
  created_at: string;
}

interface DelegationListResponse {
  delegations: DelegationRecord[];
  total: number;
  page: number;
  per_page: number;
}

interface DelegationDetail {
  id: number;
  run_id: string;
  chain_id: string;
  from_model: string | null;
  to_model: string;
  role: string;
  batch: number;
  retry: number;
  task: string | null;
  response: string | null;
  response_length: number | null;
  md_file_path: string | null;
  source_id: string | null;
  trace_id: string | null;
  created_at: string;
}

// ── API Helpers ─────────────────────────────────────────────────────────

async function fetchDelegations(
  page: number,
  perPage: number,
  search?: string,
  fromModel?: string,
  toModel?: string,
  chainId?: string,
): Promise<DelegationListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });
  if (search) params.set('search', search);
  if (fromModel) params.set('from_model', fromModel);
  if (toModel) params.set('to_model', toModel);
  if (chainId) params.set('chain_id', chainId);

  const res = await fetch(`/v1/council/delegations?${params.toString()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

async function fetchDelegationRun(runId: string): Promise<DelegationDetail> {
  const res = await fetch(`/v1/council/delegations/run/${encodeURIComponent(runId)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

// ── Sub-components ──────────────────────────────────────────────────────

function ModelBadge({ model, label }: { model: string | null; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {label && <span className="text-[10px] text-low uppercase tracking-wider">{label}:</span>}
      <span className={cn(
        'inline-block px-2 py-0.5 rounded-md text-xs font-medium',
        model
          ? 'bg-brand/10 text-brand'
          : 'bg-muted/20 text-low italic',
      )}>
        {model || 'unknown'}
      </span>
    </span>
  );
}

function ChainBadge({ chainId }: { chainId: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono bg-secondary-foreground/10 text-normal">
      <LinkIcon className="h-3 w-3" weight="fill" />
      {chainId.slice(0, 12)}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    coder: 'bg-green-500/10 text-green-400',
    reviewer: 'bg-blue-500/10 text-blue-400',
    planner: 'bg-purple-500/10 text-purple-400',
  };
  return (
    <span className={cn(
      'inline-block px-2 py-0.5 rounded-md text-[10px] font-medium',
      colors[role.toLowerCase()] || 'bg-muted/20 text-low',
    )}>
      {role}
    </span>
  );
}

function Timestamp({ iso }: { iso: string }) {
  const relative = useMemo(() => {
    // Fix malformed ISO timestamps (missing seconds: 15:37.590Z → 15:37:00.590Z)
    const fixed = iso.replace(/T(\d{2}):(\d{2})\./, 'T$1:$2:00.');
    const date = new Date(fixed);
    if (isNaN(date.getTime())) return iso.slice(0, 16);
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }, [iso]);

  return (
    <span title={iso} className="text-xs text-low whitespace-nowrap">
      {relative}
    </span>
  );
}

// ── Detail Panel (slide-over) ───────────────────────────────────────────

function DetailPanel({ runId, onClose }: { runId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<DelegationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchDelegationRun(runId)
      .then((data) => { if (!cancelled) setDetail(data); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [runId]);

  const mdUrl = detail?.md_file_path
    ? `/v1/council/delegations/chain/${detail.chain_id}/raw`
    : null;

  return (
    <div className="fixed inset-0 z-[300] flex">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative ml-auto w-[min(640px,90vw)] h-full bg-primary border-l border-border shadow-2xl overflow-y-auto p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted/20 text-low hover:text-normal transition-colors"
        >
          <ArrowRightIcon className="h-5 w-5 rotate-180" weight="bold" />
        </button>

        {loading && <div className="text-sm text-low py-8">Loading...</div>}
        {error && <div className="text-sm text-red-400 py-8">{error}</div>}

        {detail && (
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h2 className="text-sm font-semibold text-high mb-2">Delegation Detail</h2>
              <div className="flex flex-wrap gap-2">
                <ChainBadge chainId={detail.chain_id} />
                <RoleBadge role={detail.role} />
                <span className="text-[10px] text-low font-mono">#{detail.batch}.{detail.retry}</span>
              </div>
            </div>

            {/* Models */}
            <div className="flex flex-wrap gap-4">
              <ModelBadge model={detail.from_model} label="From" />
              <ArrowRightIcon className="h-4 w-4 text-low shrink-0 mt-1.5" />
              <ModelBadge model={detail.to_model} label="To" />
            </div>

            {/* Provenance */}
            {(detail.source_id || detail.trace_id) && (
              <div className="flex flex-col gap-1.5 text-xs font-mono text-low break-all">
                {detail.source_id && (
                  <span>source_id: {detail.source_id}</span>
                )}
                {detail.trace_id && (
                  <span>trace_id: {detail.trace_id}</span>
                )}
              </div>
            )}

            {/* Timestamps */}
            <div className="text-xs text-low">
              Created: <Timestamp iso={detail.created_at} />
            </div>

            {/* Task */}
            {detail.task && (
              <div>
                <h3 className="text-xs font-semibold text-normal mb-1.5 uppercase tracking-wider">Task</h3>
                <pre className="text-xs text-normal bg-muted/10 p-3 rounded-lg whitespace-pre-wrap break-words max-h-[200px] overflow-y-auto">
                  {detail.task}
                </pre>
              </div>
            )}

            {/* Response */}
            {detail.response && (
              <div>
                <h3 className="text-xs font-semibold text-normal mb-1.5 uppercase tracking-wider">
                  Response ({detail.response_length?.toLocaleString() || 0} chars)
                </h3>
                <pre className="text-xs text-normal bg-muted/10 p-3 rounded-lg whitespace-pre-wrap break-words max-h-[300px] overflow-y-auto">
                  {detail.response.length > 2000
                    ? detail.response.slice(0, 2000) + '\n\n... (truncated, see full response below)'
                    : detail.response}
                </pre>
              </div>
            )}

            {/* Raw MD link */}
            {mdUrl && (
              <a
                href={mdUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-brand/10 text-brand hover:bg-brand/20 transition-colors"
              >
                <FileTextIcon className="h-3.5 w-3.5" weight="fill" />
                Open Raw MD File
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Dashboard ──────────────────────────────────────────────────────

export function DelegationDashboard() {
  const [data, setData] = useState<DelegationListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);
  const [search, setSearch] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterChain, setFilterChain] = useState('');
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchDelegations(
        page, perPage,
        debouncedSearch || undefined,
        filterFrom || undefined,
        filterTo || undefined,
        filterChain || undefined,
      );
      setData(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, debouncedSearch, filterFrom, filterTo, filterChain]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const totalPages = data ? Math.ceil(data.total / perPage) : 0;

  // Collect unique models for filter suggestions
  const uniqueFromModels = useMemo(() => {
    const set = new Set<string>();
    data?.delegations.forEach((d) => { if (d.from_model) set.add(d.from_model); });
    return [...set].sort();
  }, [data]);

  const uniqueToModels = useMemo(() => {
    const set = new Set<string>();
    data?.delegations.forEach((d) => { if (d.to_model) set.add(d.to_model); });
    return [...set].sort();
  }, [data]);

  return (
    <div className="flex flex-col h-full bg-primary">
      {/* Header */}
      <div className="shrink-0 border-b border-border p-4 bg-secondary">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5 text-brand" weight="fill" />
            <h1 className="text-sm font-semibold text-high">Delegation Runs</h1>
            {data && (
              <span className="text-xs text-low ml-1">
                ({data.total.toLocaleString()} total)
              </span>
            )}
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              loading ? 'animate-spin text-low' : 'text-low hover:text-normal hover:bg-muted/20',
            )}
            title="Refresh"
          >
            <ArrowClockwiseIcon className="h-4 w-4" weight="fill" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-low" weight="fill" />
            <input
              type="text"
              placeholder="Search task text..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-md text-xs bg-muted/10 border border-border text-normal placeholder:text-low focus:outline-none focus:border-brand/50"
            />
          </div>
          <select
            value={filterFrom}
            onChange={(e) => { setFilterFrom(e.target.value); setPage(1); }}
            className="px-2 py-1.5 rounded-md text-xs bg-muted/10 border border-border text-normal focus:outline-none focus:border-brand/50"
          >
            <option value="">From Model</option>
            {uniqueFromModels.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select
            value={filterTo}
            onChange={(e) => { setFilterTo(e.target.value); setPage(1); }}
            className="px-2 py-1.5 rounded-md text-xs bg-muted/10 border border-border text-normal focus:outline-none focus:border-brand/50"
          >
            <option value="">To Model</option>
            {uniqueToModels.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <input
            type="text"
            placeholder="Chain ID..."
            value={filterChain}
            onChange={(e) => { setFilterChain(e.target.value); setPage(1); }}
            className="w-[140px] px-2 py-1.5 rounded-md text-xs bg-muted/10 border border-border text-normal placeholder:text-low focus:outline-none focus:border-brand/50 font-mono"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="p-4 text-sm text-red-400">Error: {error}</div>
        )}

        {loading && !data && (
          <div className="p-8 text-sm text-low text-center">Loading delegations...</div>
        )}

        {!loading && data && data.delegations.length === 0 && (
          <div className="p-8 text-sm text-low text-center">No delegations found</div>
        )}

        {!loading && data && data.delegations.length > 0 && (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-secondary/95 backdrop-blur border-b border-border z-10">
              <tr>
                <th className="text-left px-4 py-2 text-[10px] font-semibold text-low uppercase tracking-wider">Chain</th>
                <th className="text-left px-4 py-2 text-[10px] font-semibold text-low uppercase tracking-wider">From</th>
                <th className="text-left px-4 py-2 text-[10px] font-semibold text-low uppercase tracking-wider">To</th>
                <th className="text-left px-4 py-2 text-[10px] font-semibold text-low uppercase tracking-wider">Role</th>
                <th className="text-left px-4 py-2 text-[10px] font-semibold text-low uppercase tracking-wider">Task</th>
                <th className="text-left px-4 py-2 text-[10px] font-semibold text-low uppercase tracking-wider">Size</th>
                <th className="text-left px-4 py-2 text-[10px] font-semibold text-low uppercase tracking-wider">When</th>
              </tr>
            </thead>
            <tbody>
              {data.delegations.map((d) => (
                <tr
                  key={d.run_id}
                  onClick={() => setSelectedRunId(d.run_id)}
                  className="border-b border-border/50 cursor-pointer hover:bg-muted/10 transition-colors"
                >
                  <td className="px-4 py-2">
                    <ChainBadge chainId={d.chain_id} />
                  </td>
                  <td className="px-4 py-2">
                    <ModelBadge model={d.from_model} label="" />
                  </td>
                  <td className="px-4 py-2">
                    <ModelBadge model={d.to_model} label="" />
                  </td>
                  <td className="px-4 py-2">
                    <RoleBadge role={d.role} />
                  </td>
                  <td className="px-4 py-2 max-w-[300px]">
                    <span className="text-normal truncate block" title={d.task_preview}>
                      {d.task_preview || <span className="text-low italic">no task</span>}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-low font-mono">
                    {d.response_length ? `${(d.response_length / 1024).toFixed(1)}KB` : '—'}
                  </td>
                  <td className="px-4 py-2">
                    <Timestamp iso={d.created_at} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {data && totalPages > 1 && (
        <div className="shrink-0 border-t border-border p-3 bg-secondary flex items-center justify-between">
          <span className="text-xs text-low">
            Page {data.page} of {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={data.page === 1}
              className="px-2 py-1 rounded-md text-xs bg-muted/10 text-normal disabled:opacity-30 hover:bg-muted/20 transition-colors"
            >
              ← Prev
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (data.page! <= 3) {
                pageNum = i + 1;
              } else if (data.page! >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = data.page! - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={cn(
                    'w-8 h-8 rounded-md text-xs font-medium transition-colors',
                    data.page === pageNum
                      ? 'bg-brand/20 text-brand'
                      : 'bg-muted/10 text-normal hover:bg-muted/20',
                  )}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={data.page === totalPages}
              className="px-2 py-1 rounded-md text-xs bg-muted/10 text-normal disabled:opacity-30 hover:bg-muted/20 transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Detail Panel */}
      {selectedRunId && (
        <DetailPanel
          runId={selectedRunId}
          onClose={() => setSelectedRunId(null)}
        />
      )}
    </div>
  );
}
