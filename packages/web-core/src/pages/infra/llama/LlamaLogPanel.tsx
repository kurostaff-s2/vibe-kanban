import { useState, useEffect, useRef, useCallback } from 'react';
import { useLlamaSwapStats } from '@/shared/hooks/council/useLlamaSwapStats';
import { cn } from '@/shared/lib/utils';

export function LlamaLogPanel() {
  const { logs } = useLlamaSwapStats();
  const [sourceFilter, setSourceFilter] = useState<'all' | 'upstream' | 'proxy'>('upstream');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const autoScrollRef = useRef(autoScroll);
  autoScrollRef.current = autoScroll;

  const filteredLogs = sourceFilter === 'all'
    ? logs
    : logs.filter((l) => l.type === sourceFilter);

  // Stable scroll-to-bottom using requestAnimationFrame
  const scrollToEnd = useCallback(() => {
    if (scrollRef.current) {
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
    }
  }, []);

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    if (autoScrollRef.current && filteredLogs.length > 0) {
      scrollToEnd();
    }
  }, [filteredLogs.length, scrollToEnd]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(isAtBottom);
  }, []);

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
        tabIndex={0}
        className="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed bg-black/30 focus:outline-none focus:ring-1 focus:ring-brand/30 rounded-sm"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-low text-center py-4">No logs yet</div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.timestamp + log.message.slice(0, 8)}
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

      {/* Scroll-to-bottom button — appears when not at bottom */}
      {!autoScroll && (
        <div className="shrink-0 flex justify-end pr-3 pb-2">
          <button
            onClick={() => {
              setAutoScroll(true);
              scrollToEnd();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-secondary/80 text-normal hover:text-high hover:bg-secondary cursor-pointer transition-colors shadow-lg"
            title="Scroll to bottom"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
              <path fillRule="evenodd" d="M12 2.25a.75.75 0 0 1 .75.75v15.19l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.22 3.22V3a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" transform="rotate(180 12 12)"
              />
            </svg>
            Bottom
          </button>
        </div>
      )}
    </div>
  );
}

export default LlamaLogPanel;
