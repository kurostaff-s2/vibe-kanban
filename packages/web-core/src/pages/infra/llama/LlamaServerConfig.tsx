import { useEffect, useState, useCallback } from 'react';
import { GearIcon, ArrowCounterClockwiseIcon } from '@phosphor-icons/react';
import { cn } from '@/shared/lib/utils';
import { DEFAULT_LLAMA_SWAP_BASE } from '@/shared/types/llama-swap';

interface RunningModel {
  model: string;
  state: string;
  cmd: string;
  proxy: string;
  ttl: number;
  name: string;
  description: string;
}

interface ParsedArg {
  key: string;
  value: string | null;
  group: string;
}

const argGroups: Record<string, string> = {
  // Model & paths
  'm': 'Model',
  'alias': 'Model',
  'mmproj': 'Model',

  // Context & GPU
  'ctx-size': 'Context',
  'ngl': 'Context',
  'gpu': 'Context',
  'main-gpu': 'Context',
  'tensor-split': 'Context',

  // Speculative / MTP
  'spec-type': 'Speculative',
  'spec-draft-n-max': 'Speculative',
  'spec-draft-p-min': 'Speculative',
  'spec-draft-type-k': 'Speculative',
  'spec-draft-type-v': 'Speculative',

  // Performance
  'threads': 'Performance',
  'threads-batch': 'Performance',
  'batch': 'Performance',
  'ubatch': 'Performance',
  'flash-attn': 'Performance',
  'no-mmap': 'Performance',
  'mlock': 'Performance',
  'cache-ram': 'Performance',
  'cont-batching': 'Performance',
  'threads': 'Performance',

  // Sampling
  'temp': 'Sampling',
  'top-p': 'Sampling',
  'top-k': 'Sampling',
  'min-p': 'Sampling',
  'repeat-penalty': 'Sampling',
  'presence-penalty': 'Sampling',
  'max-predict': 'Sampling',

  // Quantization
  'ctk': 'Quantization',
  'ctv': 'Quantization',

  // Reasoning
  'reasoning': 'Reasoning',
  'reasoning-budget': 'Reasoning',
  'reasoning-format': 'Reasoning',

  // Server
  'host': 'Server',
  'port': 'Server',
  'jinja': 'Server',
  'chat-template-kwargs': 'Server',
};

function parseCmd(cmd: string): ParsedArg[] {
  if (!cmd) return [];
  const lines = cmd.split('\n').filter((l) => l.trim());
  const args: ParsedArg[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    // Match --key value or --key=value patterns
    const match = trimmed.match(/--([a-z0-9_-]+)\s*=\s*(.+)|--([a-z0-9_-]+)\s+(.+)/);
    if (match) {
      const key = match[1] || match[3];
      const value = (match[2] || match[4] || '').replace(/["']/g, '').trim();
      const group = argGroups[key] || 'Other';
      args.push({ key, value: value || null, group });
    }
  }
  return args;
}

function groupArgs(args: ParsedArg[]): Record<string, ParsedArg[]> {
  const groups: Record<string, ParsedArg[]> = {};
  for (const arg of args) {
    if (!groups[arg.group]) groups[arg.group] = [];
    groups[arg.group].push(arg);
  }
  return groups;
}

const groupOrder = [
  'Model', 'Context', 'Speculative', 'Performance',
  'Sampling', 'Quantization', 'Reasoning', 'Server', 'Other',
];

const groupColors: Record<string, string> = {
  Model: 'text-blue-400',
  Context: 'text-purple-400',
  Speculative: 'text-cyan-400',
  Performance: 'text-green-400',
  Sampling: 'text-yellow-400',
  Quantization: 'text-orange-400',
  Reasoning: 'text-pink-400',
  Server: 'text-gray-400',
  Other: 'text-gray-500',
};

export function LlamaServerConfig() {
  const [models, setModels] = useState<RunningModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      const resp = await fetch(`${DEFAULT_LLAMA_SWAP_BASE}/running`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const raw = await resp.json();
      // /running returns { running: RunningModel[] }
      const data: RunningModel[] = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.running)
        ? raw.running
        : [];
      if (data.length === 0 && !Array.isArray(raw) && !Array.isArray(raw?.running)) {
        setError('Unexpected response format from /running endpoint');
        return;
      }
      setModels(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch config');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return (
    <div className="p-4 space-y-6">
      {/* Refresh button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GearIcon className="h-4 w-4 text-normal" weight="fill" />
          <span className="text-sm font-medium text-high">Running Server Config</span>
        </div>
        <button
          onClick={fetchConfig}
          disabled={loading}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-normal hover:text-high hover:bg-secondary/30 cursor-pointer transition-colors disabled:opacity-50"
        >
          <ArrowCounterClockwiseIcon
            className={cn('h-3.5 w-3.5', loading && 'animate-spin')}
            weight="fill"
          />
          Refresh
        </button>
      </div>

      {loading && models.length === 0 ? (
        <div className="text-low text-center py-8">Loading...</div>
      ) : error && models.length === 0 ? (
        <div className="text-red-400 text-center py-8">{error}</div>
      ) : models.length === 0 ? (
        <div className="text-low text-center py-8">No models currently loaded</div>
      ) : (
        <div className="space-y-6">
          {models.map((m) => {
            const parsed = parseCmd(m.cmd);
            const grouped = groupArgs(parsed);
            const orderedGroups = groupOrder
              .filter((g) => grouped[g])
              .map((g) => ({ name: g, args: grouped[g] }));

            return (
              <div key={m.model} className="space-y-3">
                {/* Model header */}
                <div className="flex items-center gap-3 pb-2 border-b border-border/50">
                  <span className="text-sm font-semibold text-high">{m.name || m.model}</span>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-medium',
                      m.state === 'ready'
                        ? 'bg-green-500/20 text-green-400'
                        : m.state === 'loading'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-gray-500/20 text-gray-400'
                    )}
                  >
                    {m.state}
                  </span>
                  {m.ttl > 0 && (
                    <span className="text-[10px] text-low">TTL: {m.ttl}s</span>
                  )}
                </div>

                {m.description && (
                  <div className="text-xs text-low">{m.description}</div>
                )}

                {/* Config groups */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {orderedGroups.map((group) => (
                    <div key={group.name} className="bg-secondary/20 rounded-md p-3 space-y-1">
                      <div className={cn(
                        'text-[10px] font-semibold uppercase tracking-wider mb-2',
                        groupColors[group.name] || 'text-low'
                      )}>
                        {group.name}
                      </div>
                      {group.args.map((arg) => (
                        <div key={arg.key} className="flex items-start gap-2 text-[11px]">
                          <span className="text-low shrink-0 font-mono">{arg.key}</span>
                          <span className="text-normal font-mono">
                            {arg.value ?? '(flag)'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                {/* Raw cmd */}
                <details className="text-[10px]">
                  <summary className="text-low cursor-pointer hover:text-normal transition-colors">
                    Show raw command
                  </summary>
                  <pre className="mt-2 p-2 bg-black/30 rounded-md font-mono text-[10px] text-low whitespace-pre-wrap break-all">
                    {m.cmd}
                  </pre>
                </details>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default LlamaServerConfig;
