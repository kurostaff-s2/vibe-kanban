/**
 * llama-swap data types.
 *
 * Maps to llama-swap Go service REST API and SSE events.
 * Used by useLlamaSwapStats hook and all llama-swap frontend components.
 */

// ── Model State ────────────────────────────────────────────────────────

export type LlamaModelState =
  | 'ready'
  | 'starting'
  | 'stopping'
  | 'stopped'
  | 'shutdown'
  | 'error'
  | 'unknown';

export interface LlamaModel {
  id: string;
  state: LlamaModelState;
  name: string;
  description: string;
  unlisted: boolean;
  aliases?: string[];
  capabilities?: {
    vision?: boolean;
    audio_transcriptions?: boolean;
    image_generation?: boolean;
    reranker?: boolean;
  };
}

// ── Activity ───────────────────────────────────────────────────────────

export interface LlamaActivityEntry {
  id: number;
  timestamp: string;
  model: string;
  req_path: string;
  resp_status_code: number;
  tokens: {
    cache_tokens: number;
    input_tokens: number;
    output_tokens: number;
    prompt_per_second: number;
    tokens_per_second: number;
  };
  duration_ms: number;
}

// ── System Stats ───────────────────────────────────────────────────────

export interface LlamaSysStat {
  timestamp: string;
  cpu_pct: number[];
  cpu_pct_total: number;
  mem_used_gb: number;
  mem_total_gb: number;
  swap_used_gb: number;
  load_avg: number[];
  net_rx_bytes: number;
  net_tx_bytes: number;
}

export interface LlamaGpuStat {
  timestamp: string;
  id: number;
  name: string;
  gpu_util_pct: number;
  mem_util_pct: number;
  mem_used_mb: number;
  mem_total_mb: number;
  temp_c: number;
  power_draw_w: number;
}

// ── In-Flight Requests ────────────────────────────────────────────────

export interface LlamaInFlight {
  id: string;
  model: string;
  req_path: string;
  tokens_consumed: number;
  tokens_generated: number;
  started_at: string;
}

// ── Log Entries ────────────────────────────────────────────────────────

export interface LlamaLogEntry {
  type: 'proxy' | 'upstream';
  timestamp: string;
  message: string;
}

// ── Aggregated Stats ───────────────────────────────────────────────────

export interface LlamaSwapStats {
  models: LlamaModel[];
  loadingModels: string[];
  activityEntries: LlamaActivityEntry[];
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheTokens: number;
  inflightRequests: LlamaInFlight[];
  sysStats: LlamaSysStat[];
  gpuStats: LlamaGpuStat[];
  logs: LlamaLogEntry[];
  connected: boolean;
  error: string | null;
}

// ── Actions ────────────────────────────────────────────────────────────

export interface LlamaSwapActions {
  loadModel(modelId: string): Promise<void>;
  unloadModel(modelId: string): Promise<void>;
  unloadAll(): Promise<void>;
  refreshPerformance(): Promise<void>;
}

// ── SSE Event Types ────────────────────────────────────────────────────

export type SseEventType =
  | 'model_state'
  | 'activity'
  | 'sys_stats'
  | 'gpu_stats'
  | 'inflight'
  | 'log'
  | 'swap_event'
  | 'restart'
  | 'error';

export interface SseEvent {
  event: SseEventType;
  data: unknown;
  timestamp?: string;
}

export interface LlamaRestartData {
  timestamp: string;
  version: string;
  commit: string;
}

// ── State Color Mapping ────────────────────────────────────────────────

export const MODEL_STATE_COLORS: Record<LlamaModelState, string> = {
  ready: 'bg-green-500',
  starting: 'bg-yellow-500',
  stopping: 'bg-orange-500',
  stopped: 'bg-gray-500',
  shutdown: 'bg-red-500',
  error: 'bg-red-400',
  unknown: 'bg-gray-400',
};

export const MODEL_STATE_LABELS: Record<LlamaModelState, string> = {
  ready: 'Ready',
  starting: 'Starting',
  stopping: 'Stopping',
  stopped: 'Stopped',
  shutdown: 'Shutdown',
  error: 'Error',
  unknown: 'Unknown',
};

// ── Constants ──────────────────────────────────────────────────────────

/** Max entries kept in memory for activity/performance arrays */
export const MAX_STATS_ENTRIES = 200;

/** SSE reconnect backoff (ms): base, multiplier, max */
export const SSE_RECONNECT_BASE_MS = 1000;
export const SSE_RECONNECT_MULTIPLIER = 2;
export const SSE_RECONNECT_MAX_MS = 8000;

/** Default llama-swap base URL (proxied through Vite) */
export const DEFAULT_LLAMA_SWAP_BASE = '/llama';

/** Default llama-swap direct URL (bypass proxy) */
export const DEFAULT_LLAMA_SWAP_DIRECT = 'http://localhost:9292';
