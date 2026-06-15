import { useEffect, useState, useCallback } from 'react';
import { HardDriveIcon } from '@phosphor-icons/react';
import { makeCouncilRequest } from '@/shared/lib/councilApiTransport';

export interface SlotStatus {
  slot_dir: string;
  exists: boolean;
  current_alias?: string;
  tokens_in_context: number;
  slots?: Array<{
    alias: string;
    config_hash: string;
    file: string;
    size_mb: number;
    estimated_tokens: number;
    last_modified: number;
  }>;
}

export interface SlotIndicatorProps {
  /** Refresh interval in ms */
  refreshInterval?: number;
  /** Show detailed tooltip */
  detailed?: boolean;
}

function formatTokens(tokens: number): string {
  if (tokens === 0) return '0';
  if (tokens < 1000) return tokens.toString();
  if (tokens < 1_000_000) return `${(tokens / 1000).toFixed(1)}K`;
  return `${(tokens / 1_000_000).toFixed(1)}M`;
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export function SlotIndicator({
  refreshInterval = 10_000,
  detailed = false,
}: SlotIndicatorProps) {
  const [status, setStatus] = useState<SlotStatus | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await makeCouncilRequest('/v1/slots/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        setIsLoaded(true);
      }
    } catch {
      // Silent fail - slot dir may not exist
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchStatus, refreshInterval]);

  if (!isLoaded || !status) return null;

  const tokens = status.tokens_in_context || 0;
  const currentSlot = status.slots?.find((s) => s.alias === status.current_alias);
  const lastSave = currentSlot?.last_modified
    ? formatTimeAgo(currentSlot.last_modified * 1000)
    : 'never';

  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary border border-border cursor-default"
      title={
        detailed
          ? `Slot: ${status.current_alias}\nTokens: ${formatTokens(tokens)}\nLast save: ${lastSave}\nDir: ${status.slot_dir}`
          : `KV Cache: ${formatTokens(tokens)} tokens`
      }
    >
      <HardDriveIcon className="w-3.5 h-3.5 text-purple-400" />
      <span className="text-xs text-high font-mono">{formatTokens(tokens)}</span>
      <span className="text-[10px] text-low">tokens</span>
      {currentSlot && (
        <span className="text-[10px] text-low ml-1">{lastSave}</span>
      )}
    </div>
  );
}

export default SlotIndicator;
