import { useState, useEffect, useRef } from 'react';
import { useLlamaSwapStats } from '@/shared/hooks/council/useLlamaSwapStats';
import { cn } from '@/shared/lib/utils';

export function LlamaLogPanel() {
  const { logs } = useLlamaSwapStats();
  const [sourceFilter, setSourceFilter] = useState<'all' | 'upstream' | 'proxy'>('upstream');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const filteredLogs = sourceFilter === 'all'
    ? logs
    : logs.filter((l) => l.type === sourceFilter);

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredLogs.length, autoScroll]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 30;
    setAutoScroll(isAtBottom);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filter toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50 shrink-0">
        {(['upstream', 'proxy', 'all'] as const).map((src) => (
          <button
            key={src}
            onClick={() => setSourceFilter(src)}
            className={cn(
              'px-2 py-0.5 rounded text-xs cursor-pointer transition-colors',
              sourceFilter === src
                ? 'bg-primary text-high'
                : 'text-low hover:text-normal hover:bg-secondary/30'
            )}
          >
            {src === 'all' ? 'All' : src === 'upstream' ? 'Upstream (llama-server)' : 'Proxy (llama-swap)'}
          </button>
        ))}
        <span className="text-xs text-low ml-auto">
          {filteredLogs.length} entries
          {autoScroll ? ' · auto-scroll on' : ' · auto-scroll off'}
        </span>
      </div>

      {/* Log output */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed bg-black/30"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-low text-center py-4">No logs yet</div>
        ) : (
          filteredLogs.map((log, i) => (
            <div
              key={i}
              className={cn(
                'whitespace-pre-wrap break-all',
                log.type === 'upstream' ? 'text-green-300/80' : 'text-blue-300/80'
              )}
            >
              {log.message}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default LlamaLogPanel;
