import { useState } from 'react';
import {
  CaretDownIcon,
  CaretRightIcon,
  ChartBarIcon,
} from '@phosphor-icons/react';
import { cn } from '@/shared/lib/utils';
import { useLlamaSwapStats } from '@/shared/hooks/council/useLlamaSwapStats';

// ── Sparkline (CSS-based) ──────────────────────────────────────────────

function Sparkline({
  data,
  color,
  height = 40,
  label,
  unit,
}: {
  data: number[];
  color: string;
  height?: number;
  label: string;
  unit?: string;
}) {
  if (data.length < 2) {
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-low">{label}</span>
          <span className="text-[10px] text-low">
            {data.length > 0 ? `${data[data.length - 1]?.toFixed(1) ?? 0}${unit ?? ''}` : '—'}
          </span>
        </div>
        <div
          className="bg-secondary/50 rounded-sm"
          style={{ height }}
        />
      </div>
    );
  }

  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - ((v - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  const current = data[data.length - 1];

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-low">{label}</span>
        <span className={cn('text-xs font-medium', color)}>
          {current?.toFixed(1) ?? 0}
          {unit ?? ''}
        </span>
      </div>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="w-full rounded-sm"
        style={{ height }}
      >
        {/* Background gradient */}
        <defs>
          <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <polygon
          points={`0,100 ${points} 100,100`}
          fill={`url(#grad-${label})`}
        />
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

// ── Time Window Selector ───────────────────────────────────────────────

type TimeWindow = '5m' | '15m' | '1hr';

function TimeWindowSelector({
  value,
  onChange,
}: {
  value: TimeWindow;
  onChange: (w: TimeWindow) => void;
}) {
  const windows: TimeWindow[] = ['5m', '15m', '1hr'];

  return (
    <div className="flex gap-1">
      {windows.map((w) => (
        <button
          key={w}
          onClick={() => onChange(w)}
          className={cn(
            'px-2 py-0.5 rounded text-[10px] cursor-pointer transition-colors',
            value === w
              ? 'bg-brand/20 text-brand'
              : 'text-low hover:text-normal hover:bg-secondary/30'
          )}
        >
          {w}
        </button>
      ))}
    </div>
  );
}

// ── Windowing Helper ───────────────────────────────────────────────────

function getWindowedData(
  timestamps: string[],
  values: number[],
  window: TimeWindow
): number[] {
  if (timestamps.length === 0) return values;

  const now = Date.now();
  const windowMs =
    window === '5m'
      ? 5 * 60 * 1000
      : window === '15m'
        ? 15 * 60 * 1000
        : 60 * 60 * 1000;

  const cutoff = now - windowMs;
  let startIdx = 0;
  for (let i = 0; i < timestamps.length; i++) {
    if (new Date(timestamps[i]).getTime() >= cutoff) {
      startIdx = i;
      break;
    }
  }
  return values.slice(startIdx);
}

// ── Panel ──────────────────────────────────────────────────────────────

export function LlamaPerformanceChart() {
  const { sysStats, gpuStats, connected, refreshPerformance } =
    useLlamaSwapStats();
  const [collapsed, setCollapsed] = useState(false);
  const [window, setWindow] = useState<TimeWindow>('15m');

  // Extract time series from sysStats
  const cpuData = getWindowedData(
    sysStats.map((s) => s.timestamp),
    sysStats.map((s) => s.cpu_pct_total),
    window
  );
  const memUsedData = getWindowedData(
    sysStats.map((s) => s.timestamp),
    sysStats.map((s) => s.mem_used_gb),
    window
  );
  const loadData = getWindowedData(
    sysStats.map((s) => s.timestamp),
    sysStats.map((s) => s.load_avg[0] ?? 0),
    window
  );

  // GPU data (use first GPU)
  const primaryGpu = gpuStats[gpuStats.length - 1];
  const gpuUtilData = getWindowedData(
    gpuStats.map((g) => g.timestamp),
    gpuStats.map((g) => g.gpu_util_pct),
    window
  );
  const gpuMemData = getWindowedData(
    gpuStats.map((g) => g.timestamp),
    gpuStats.map((g) => g.mem_util_pct),
    window
  );
  const gpuTempData = getWindowedData(
    gpuStats.map((g) => g.timestamp),
    gpuStats.map((g) => g.temp_c),
    window
  );

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
          <ChartBarIcon className="h-4 w-4 text-normal" weight="fill" />
          <span className="text-sm font-medium text-high">Performance</span>
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              connected ? 'bg-green-500' : 'bg-red-500'
            )}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-low">
            {collapsed ? <CaretRightIcon className="h-4 w-4" /> : <CaretDownIcon className="h-4 w-4" />}
          </span>
        </div>
      </div>

      {!collapsed && (
        <div className="p-4 space-y-4">
          {/* Time Window */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-low uppercase tracking-wider">
              Time Window
            </span>
            <TimeWindowSelector value={window} onChange={setWindow} />
          </div>

          {/* CPU & Memory */}
          <div className="grid grid-cols-3 gap-4">
            <Sparkline
              data={cpuData}
              color="#60a5fa" // blue-400
              label="CPU Total"
              unit="%"
            />
            <Sparkline
              data={memUsedData}
              color="#a78bfa" // purple-400
              label="Memory Used"
              unit="GB"
            />
            <Sparkline
              data={loadData}
              color="#f59e0b" // amber-500
              label="Load Avg"
            />
          </div>

          {/* GPU */}
          {primaryGpu && (
            <>
              <div className="text-[10px] font-semibold text-low uppercase tracking-wider">
                GPU: {primaryGpu.name || `#${primaryGpu.id}`}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Sparkline
                  data={gpuUtilData}
                  color="#34d399" // green-400
                  label="GPU Util"
                  unit="%"
                />
                <Sparkline
                  data={gpuMemData}
                  color="#f472b6" // pink-400
                  label="VRAM Util"
                  unit="%"
                />
                <Sparkline
                  data={gpuTempData}
                  color="#fb923c" // orange-400
                  label="Temperature"
                  unit="°C"
                />
              </div>

              {/* Current GPU snapshot */}
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div className="bg-secondary/30 rounded px-2 py-1 text-center">
                  <div className="text-high font-medium">
                    {primaryGpu.gpu_util_pct.toFixed(0)}%
                  </div>
                  <div className="text-[10px] text-low">GPU</div>
                </div>
                <div className="bg-secondary/30 rounded px-2 py-1 text-center">
                  <div className="text-high font-medium">
                    {(primaryGpu.mem_used_mb / 1024).toFixed(1)}GB
                  </div>
                  <div className="text-[10px] text-low">VRAM</div>
                </div>
                <div className="bg-secondary/30 rounded px-2 py-1 text-center">
                  <div className="text-high font-medium">
                    {primaryGpu.temp_c.toFixed(0)}°C
                  </div>
                  <div className="text-[10px] text-low">Temp</div>
                </div>
                <div className="bg-secondary/30 rounded px-2 py-1 text-center">
                  <div className="text-high font-medium">
                    {primaryGpu.power_draw_w.toFixed(0)}W
                  </div>
                  <div className="text-[10px] text-low">Power</div>
                </div>
              </div>
            </>
          )}

          {/* Refresh button */}
          <div className="flex justify-end">
            <button
              onClick={refreshPerformance}
              className="text-xs text-low hover:text-normal cursor-pointer transition-colors"
            >
              Refresh now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LlamaPerformanceChart;
