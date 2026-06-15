import { useEffect, useRef, useState, useCallback } from 'react';
import { MagnifyingGlassIcon, TextAaIcon, TextIndentIcon, TextOutdentIcon } from '@phosphor-icons/react';

export interface LogLine {
  source: 'proxy' | 'upstream';
  data: string;
  timestamp: number;
}

export interface LogPanelProps {
  /** If provided, auto-connects to SSE stream */
  streamUrl?: string;
  /** Pre-loaded log lines */
  initialLogs?: LogLine[];
  /** Panel height */
  height?: string;
  /** Show filter input */
  showFilter?: boolean;
}

const FONT_SIZES = ['text-[0.6rem]', 'text-[0.7rem]', 'text-xs', 'text-sm'];
const FONT_SIZE_LABELS = ['xxs', 'xs', 'sm', 'normal'];

export function LogPanel({
  streamUrl = '/v1/logs/stream',
  initialLogs = [],
  height = 'h-48',
  showFilter = true,
}: LogPanelProps) {
  const [logs, setLogs] = useState<LogLine[]>(initialLogs);
  const [filter, setFilter] = useState('');
  const [showFilterInput, setShowFilterInput] = useState(false);
  const [fontSizeIdx, setFontSizeIdx] = useState(2); // default: text-xs
  const [wrapText, setWrapText] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [proxyCount, setProxyCount] = useState(0);
  const [upstreamCount, setUpstreamCount] = useState(0);

  const preRef = useRef<HTMLPreElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const userScrolledUp = useRef(false);

  // SSE connection
  useEffect(() => {
    if (!streamUrl) return;

    // In dev, Vite proxies /v1 to backend; in prod, backend is same origin.
    // Use relative URL so it goes through the proxy automatically.
    const es = new EventSource(streamUrl);
    eventSourceRef.current = es;

    es.onopen = () => {
      console.log('[LogPanel] SSE connected to', streamUrl);
      setIsConnected(true);
    };
    es.onerror = (e) => {
      console.error('[LogPanel] SSE error:', e, 'url:', streamUrl);
      setIsConnected(false);
    };

    es.addEventListener('log', (event) => {
      try {
        const parsed = JSON.parse(event.data) as { source: string; data: string };
        const line: LogLine = {
          source: parsed.source as 'proxy' | 'upstream',
          data: parsed.data,
          timestamp: Date.now(),
        };

        setLogs((prev) => {
          const updated = [...prev, line];
          // Keep last 2000 lines (~100KB)
          return updated.length > 2000 ? updated.slice(-2000) : updated;
        });

        if (parsed.source === 'proxy') setProxyCount((c) => c + 1);
        else setUpstreamCount((c) => c + 1);
      } catch {
        // Skip malformed events
      }
    });

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [streamUrl]);

  // Fetch buffered logs on mount (fallback if SSE fails)
  useEffect(() => {
    if (initialLogs.length > 0) return; // Already have logs

    const fetchBuffered = async () => {
      try {
        const bufferedUrl = streamUrl.replace('/stream', '/buffered');
        const res = await fetch(bufferedUrl);
        if (res.ok) {
          const data = await res.json();
          if (data.lines && data.lines.length > 0) {
            setLogs((prev) => {
              const buffered = data.lines.map((line: { source: string; data: string }) => ({
                source: line.source as 'proxy' | 'upstream',
                data: line.data,
                timestamp: Date.now(),
              }));
              return prev.length > 0 ? prev : buffered.slice(-500);
            });
          }
        }
      } catch {
        // Silent fail
      }
    };

    fetchBuffered();
  }, [streamUrl, initialLogs]);

  // Auto-scroll
  useEffect(() => {
    if (preRef.current && !userScrolledUp.current) {
      preRef.current.scrollTop = preRef.current.scrollHeight;
    }
  }, [logs]);

  const handleScroll = useCallback(() => {
    if (!preRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = preRef.current;
    userScrolledUp.current = scrollHeight - scrollTop - clientHeight > 40;
  }, []);

  const scrollToBottom = useCallback(() => {
    if (preRef.current) {
      preRef.current.scrollTop = preRef.current.scrollHeight;
      userScrolledUp.current = false;
    }
  }, []);

  // Filter logs
  const filteredLogs = filter
    ? logs.filter((line) => line.data.toLowerCase().includes(filter.toLowerCase()))
    : logs;

  const fontSizeClass = FONT_SIZES[fontSizeIdx];
  const wrapClass = wrapText ? 'whitespace-pre-wrap break-all' : 'whitespace-pre';

  return (
    <div className={`flex flex-col bg-gray-950/80 rounded-lg border border-border ${height}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-high">Council Logs</span>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-[10px] text-low">
              {isConnected ? 'live' : 'disconnected'}
            </span>
          </div>
          <span className="text-[10px] text-low">
            {proxyCount}p / {upstreamCount}u
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Font size */}
          <button
            onClick={() => setFontSizeIdx((i) => (i + 1) % FONT_SIZES.length)}
            className="p-1 rounded hover:bg-white/10 text-low hover:text-high transition-colors"
            title={`Font size: ${FONT_SIZE_LABELS[fontSizeIdx]}`}
          >
            <TextAaIcon className="w-3.5 h-3.5" />
          </button>

          {/* Wrap toggle */}
          <button
            onClick={() => setWrapText(!wrapText)}
            className={`p-1 rounded hover:bg-white/10 transition-colors ${
              wrapText ? 'text-blue-400' : 'text-low hover:text-high'
            }`}
            title="Toggle text wrap"
          >
            {wrapText ? (
              <TextIndentIcon className="w-3.5 h-3.5" />
            ) : (
              <TextOutdentIcon className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilterInput(!showFilterInput)}
            className={`p-1 rounded hover:bg-white/10 transition-colors ${
              showFilterInput ? 'text-blue-400' : 'text-low hover:text-high'
            }`}
            title="Filter logs"
          >
            <MagnifyingGlassIcon className="w-3.5 h-3.5" />
          </button>

          {/* Scroll to bottom */}
          <button
            onClick={scrollToBottom}
            className="p-1 rounded hover:bg-white/10 text-low hover:text-high transition-colors"
            title="Scroll to bottom"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21l-1.09-1.09L8.53 17.36 10.67 15.22 12 16.59l1.33-1.37 2.15 2.14L13.1 20.91 12 21zm0-7.72L4 6.59V11h2V8.41l8 7.9 8-7.9V11h2V6.59L12 13.28z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Filter input */}
      {showFilter && showFilterInput && (
        <div className="px-3 py-1.5 border-b border-border">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter logs (regex supported)..."
            className="w-full bg-transparent text-xs text-high placeholder:text-low border border-border rounded px-2 py-1 focus:outline-none focus:border-blue-500"
          />
        </div>
      )}

      {/* Log content */}
      <div className="flex-1 overflow-hidden">
        <pre
          ref={preRef}
          onScroll={handleScroll}
          className={`font-mono ${fontSizeClass} ${wrapClass} h-full overflow-auto p-2 text-green-400/90`}
        >
          {filteredLogs.map((line, i) => (
            <div key={i} className="leading-tight">
              <span className={line.source === 'proxy' ? 'text-purple-400' : 'text-blue-400'}>
                [{line.source}]
              </span>
              {' '}{line.data}
            </div>
          ))}
          {filteredLogs.length === 0 && (
            <div className="text-low text-xs italic">No logs yet...</div>
          )}
        </pre>
      </div>
    </div>
  );
}

export default LogPanel;
