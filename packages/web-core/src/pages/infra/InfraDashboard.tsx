import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowClockwiseIcon,
  ListIcon,
  WarningIcon,
  XIcon,
  PowerIcon,
} from '@phosphor-icons/react';
import { cn } from '@/shared/lib/utils';
import {
  useInfraStatus,
  type InfraService,
  SERVICE_LABELS,
} from '@/shared/hooks/council/useInfraStatus';
import {
  useServiceRestart,
  RESTARTABLE_SERVICES,
} from '@/shared/hooks/council/useServiceRestart';

// ── Status Dot ─────────────────────────────────────────────────────────

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

// ── Overall Badge ──────────────────────────────────────────────────────

function OverallBadge({ overall }: { overall: string }) {
  const config =
    overall === 'ok'
      ? { bg: 'bg-green-500/10', text: 'text-green-400', label: 'All Systems Operational' }
      : overall === 'degraded'
        ? { bg: 'bg-yellow-500/10', text: 'text-yellow-400', label: 'Degraded' }
        : { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Critical Failure' };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium',
        config.bg,
        config.text
      )}
    >
      <StatusDot status={overall} />
      {config.label}
    </span>
  );
}

// ── Service Row ────────────────────────────────────────────────────────

function ServiceRow({
  name,
  info,
  isCritical,
}: {
  name: string;
  info: InfraService;
  isCritical: boolean;
}) {
  const label = SERVICE_LABELS[name] ?? name;
  const [expanded, setExpanded] = useState(false);

  // Build detail string
  const details: string[] = [];

  if (info.port) details.push(`:${info.port}`);
  if (info.pid) details.push(`PID ${info.pid}`);
  if (info.latency_ms !== undefined && info.latency_ms !== null)
    details.push(`${info.latency_ms}ms`);
  if (info.model) details.push(info.model);
  if (info.cpu_percent !== null && info.cpu_percent !== undefined) {
    const cores = info.cpu_cores_hint ?? 1;
    const pctPerCore = (info.cpu_percent / cores).toFixed(0);
    details.push(`${info.cpu_percent}% CPU (${pctPerCore}%/core)`);
  }
  if (info.outbox_pending != null)
    details.push(`${info.outbox_pending} pending`);
  if (info.chunk_count != null)
    details.push(`${info.chunk_count} chunks`);
  if (info.collection_count != null)
    details.push(`${info.collection_count} coll`);
  if (info.container_name) details.push(info.container_name);
  if (info.uptime_seconds != null)
    details.push(`${Math.round(info.uptime_seconds / 60)}m up`);
  if (info.last_consolidation_age_min != null) {
    details.push(
      `consolidation ${info.last_consolidation_age_min}m ago`
    );
  }
  if (info.nodes != null) details.push(`${info.nodes} nodes`);
  if (info.edges != null) details.push(`${info.edges} edges`);
  if (info.db_size_mb != null) details.push(`${info.db_size_mb}MB`);

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-2.5 border-b border-border/50',
        isCritical ? 'bg-secondary/50' : ''
      )}
    >
      {/* Status */}
      <StatusDot status={info.status} />

      {/* Name */}
      <span
        className={cn(
          'text-sm min-w-[140px]',
          isCritical ? 'font-medium text-high' : 'text-normal'
        )}
      >
        {label}
        {isCritical && (
          <span className="ml-1.5 text-[10px] text-low uppercase tracking-wider">
            critical
          </span>
        )}
      </span>

      {/* Details */}
      <span className="text-xs text-normal flex-1 truncate">
        {details.join(' · ')}
      </span>

      {/* Warning */}
      {info.warning && (
        <span className="flex items-center gap-1 text-xs text-yellow-400 shrink-0">
          <WarningIcon className="h-3.5 w-3.5" weight="fill" />
          {info.warning}
        </span>
      )}

      {/* Error */}
      {info.error && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-red-400 hover:text-red-300 shrink-0 cursor-pointer"
        >
          {info.error}
        </button>
      )}
    </div>
  );
}

// ── Log Panel (inline) ────────────────────────────────────────────────

function LogPanel() {
  const [logs, setLogs] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (closed) return;
    const es = new EventSource('/v1/logs/stream');
    setConnected(true);

    es.onmessage = (e) => {
      setLogs((prev) => {
        const next = [...prev, e.data];
        return next.slice(-200); // Keep last 200 lines
      });
    };

    es.onerror = () => {
      setConnected(false);
    };

    return () => {
      es.close();
    };
  }, [closed]);

  if (closed) return null;

  return (
    <div className="border-t border-border bg-secondary/50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <ListIcon className="h-4 w-4 text-normal" weight="fill" />
          <span className="text-sm font-medium text-high">Live Logs</span>
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              connected ? 'bg-green-500' : 'bg-red-500'
            )}
          />
          <span className="text-xs text-low">
            {logs.length} lines
          </span>
        </div>
        <button
          onClick={() => setClosed(true)}
          className="text-low hover:text-normal cursor-pointer"
        >
          <XIcon className="h-4 w-4" weight="fill" />
        </button>
      </div>

      {/* Logs */}
      <div className="h-48 overflow-y-auto font-mono text-[11px] text-normal p-2 space-y-0.5">
        {logs.length === 0 ? (
          <span className="text-low">Waiting for logs...</span>
        ) : (
          logs.map((line, i) => (
            <div key={i} className="whitespace-pre-wrap break-all">
              {line}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Service Restart Panel ──────────────────────────────────────────────

function ServiceRestartPanel() {
  const { states, results, supervisorRestarting, restartService, restartAll, restartSupervisor } =
    useServiceRestart();
  const [collapsed, setCollapsed] = useState(false);
  const [confirmSupervisor, setConfirmSupervisor] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSupervisorRestart = useCallback(() => {
    if (!confirmSupervisor) {
      setConfirmSupervisor(true);
      timerRef.current = setTimeout(() => setConfirmSupervisor(false), 5000);
      return;
    }
    restartSupervisor();
  }, [confirmSupervisor, restartSupervisor]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const getStatusIcon = (serviceId: string) => {
    const state = states[serviceId];
    if (state === 'restarting') {
      return (
        <span className="animate-spin text-brand">
          <ArrowClockwiseIcon className="h-4 w-4" weight="fill" />
        </span>
      );
    }
    if (state === 'success') {
      return <span className="text-green-400">✓</span>;
    }
    if (state === 'error') {
      return <span className="text-red-400">✗</span>;
    }
    return <span className="text-low">○</span>;
  };

  return (
    <div className="border-t border-border">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b border-border/50 cursor-pointer hover:bg-secondary/30 transition-colors"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          <PowerIcon className="h-4 w-4 text-normal" weight="fill" />
          <span className="text-sm font-medium text-high">Service Restart</span>
        </div>
        <span className="text-xs text-low">{collapsed ? '▼' : '▲'}</span>
      </div>

      {!collapsed && (
        <div className="p-4 space-y-4">
          {/* Service list */}
          <div className="space-y-2">
            <div className="text-[10px] font-semibold text-low uppercase tracking-wider">
              Individual Services
            </div>
            <div className="space-y-1">
              {RESTARTABLE_SERVICES.map((svc) => {
                const result = results[svc.id];
                return (
                  <div
                    key={svc.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-md bg-secondary/30 border border-border/50"
                  >
                    {/* Status icon */}
                    <div className="shrink-0 w-6 flex justify-center">
                      {getStatusIcon(svc.id)}
                    </div>

                    {/* Service info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-high">{svc.label}</div>
                      <div className="text-xs text-low truncate">{svc.description}</div>
                    </div>

                    {/* Result/error */}
                    {result && !result.ok && result.error && (
                      <span className="text-xs text-red-400 truncate max-w-[200px]">
                        {result.error}
                      </span>
                    )}
                    {result?.new_pid && (
                      <span className="text-xs text-green-400 shrink-0">
                        PID {result.new_pid}
                      </span>
                    )}

                    {/* Restart button */}
                    <button
                      onClick={() => restartService(svc.id)}
                      disabled={states[svc.id] === 'restarting'}
                      className={cn(
                        'px-2.5 py-1 rounded-md text-xs cursor-pointer transition-colors shrink-0',
                        states[svc.id] === 'restarting'
                          ? 'bg-brand/20 text-brand opacity-50 cursor-wait'
                          : 'bg-brand/10 text-brand hover:bg-brand/20'
                      )}
                    >
                      {states[svc.id] === 'restarting' ? 'Restarting...' : 'Restart'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-2 border-t border-border/50">
            <button
              onClick={restartAll}
              disabled={Object.values(states).some((s) => s === 'restarting')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm bg-brand/10 text-brand hover:bg-brand/20 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-wait"
            >
              <ArrowClockwiseIcon className="h-4 w-4" weight="fill" />
              Restart All Services
            </button>

            <button
              onClick={handleSupervisorRestart}
              disabled={supervisorRestarting || Object.values(states).some((s) => s === 'restarting')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors',
                supervisorRestarting
                  ? 'bg-red-500/20 text-red-400 cursor-wait'
                  : confirmSupervisor
                    ? 'bg-red-500/30 text-red-300 hover:bg-red-500/40'
                    : 'bg-red-500/10 text-red-400 hover:bg-red-500/20',
                'disabled:opacity-50 disabled:cursor-wait'
              )}
            >
              <PowerIcon className="h-4 w-4" weight="fill" />
              {supervisorRestarting
                ? 'Restarting...'
                : confirmSupervisor
                  ? 'Confirm (5s)...'
                  : 'Restart Supervisor'}
            </button>
          </div>

          {/* Warning */}
          <div className="text-[10px] text-low">
            Supervisor restart replaces the entire process (os.execv). All systemd services
            are restarted automatically. Connection will drop briefly.
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────

export function InfraDashboard() {
  const { data, isLoading, error, lastUpdated, refresh } = useInfraStatus();
  const [showLogs, setShowLogs] = useState(false);

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center h-full text-normal text-sm">
        Loading infra status...
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-sm">
        <span className="text-red-400">Failed to load: {error}</span>
        <button
          onClick={refresh}
          className="flex items-center gap-2 px-3 py-1.5 bg-brand/10 text-brand rounded-md cursor-pointer hover:bg-brand/20 transition-colors"
        >
          <ArrowClockwiseIcon className="h-4 w-4" weight="fill" />
          Retry
        </button>
      </div>
    );
  }

  const services = data?.services ?? {};
  const tiers = data?.tiers ?? { critical: [], supporting: [] };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h1 className="text-lg font-semibold text-high">
            Infrastructure Dashboard
          </h1>
          <div className="flex items-center gap-3 mt-1">
            {data && <OverallBadge overall={data.overall} />}
            {lastUpdated && (
              <span className="text-xs text-low">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLogs(!showLogs)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors',
              showLogs
                ? 'bg-brand/10 text-brand'
                : 'text-normal hover:bg-secondary-foreground/10'
            )}
          >
            <ListIcon className="h-4 w-4" weight="fill" />
            Logs
          </button>
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-normal hover:bg-secondary-foreground/10 cursor-pointer transition-colors"
          >
            <ArrowClockwiseIcon className="h-4 w-4" weight="fill" />
            Refresh
          </button>
        </div>
      </div>

      {/* Service Table */}
      <div className="flex-1 overflow-y-auto">
        {/* Critical tier */}
        {tiers.critical.length > 0 && (
          <div>
            <div className="px-4 py-1.5 text-[10px] font-semibold text-low uppercase tracking-wider border-b border-border/50">
              Critical Services
            </div>
            {tiers.critical.map((name) => (
              <ServiceRow
                key={name}
                name={name}
                info={services[name] ?? { status: 'error', error: 'no data' }}
                isCritical
              />
            ))}
          </div>
        )}

        {/* Supporting tier */}
        {tiers.supporting.length > 0 && (
          <div>
            <div className="px-4 py-1.5 text-[10px] font-semibold text-low uppercase tracking-wider border-b border-border/50">
              Supporting Services
            </div>
            {tiers.supporting.map((name) => (
              <ServiceRow
                key={name}
                name={name}
                info={services[name] ?? { status: 'error', error: 'no data' }}
                isCritical={false}
              />
            ))}
          </div>
        )}
      </div>

      {/* Data Summary */}
      {(() => {
        const pgInfo = services['postgresql'];
        const counts = pgInfo?.table_counts;
        if (!counts) return null;

        const display = [
          { key: 'projects', label: 'Projects' },
          { key: 'work_items', label: 'Work Items' },
          { key: 'workflow_runs', label: 'Workflow Runs' },
          { key: 'reviews', label: 'Reviews' },
          { key: 'review_findings', label: 'Findings' },
          { key: 'memory_rollups', label: 'Memory Rollups' },
          { key: 'memory_entries', label: 'Memory Entries' },
          { key: 'knowledge_cards', label: 'Knowledge Cards' },
          { key: 'system_events', label: 'System Events' },
          { key: 'audit_events', label: 'Audit Events' },
          { key: 'job_queue', label: 'Job Queue' },
          { key: 'outbox_total', label: 'Outbox Total' },
          { key: 'outbox_pending', label: 'Outbox Pending', value: pgInfo.outbox_pending },
        ];

        return (
          <div className="border-t border-border">
            <div className="px-4 py-1.5 text-[10px] font-semibold text-low uppercase tracking-wider border-b border-border/50">
              Database Summary
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-px bg-border/30">
              {display.map(({ key, label, value }) => {
                const count = value ?? counts[key] ?? 0;
                return (
                  <div
                    key={key}
                    className="bg-secondary/30 px-3 py-2 text-center"
                  >
                    <div className="text-xs text-high font-medium">
                      {count}
                    </div>
                    <div className="text-[10px] text-low truncate">
                      {label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Service Restart Panel */}
      <ServiceRestartPanel />

      {/* Log Panel */}
      {showLogs && <LogPanel />}
    </div>
  );
}
