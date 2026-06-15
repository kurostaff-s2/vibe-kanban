/**
 * Council Core API Types
 *
 * Matches the existing SQLite schema (council_core.db).
 * No new tables — adapts to what exists.
 */

// ── Projects ──

export type Project = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  external_key: string | null;
  revision: number;
  created_at: string;
  updated_at: string;
  updated_by: string;
  updated_source: string;
  origin_source: string;
  status: 'active' | 'archived';
  is_deleted: number;
};

// ── Work Items (kanban issues) ──

export type WorkItemKind = 'pipeline' | 'review' | 'delegation' | 'task' | 'ad_hoc';

export type WorkItemPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Work item as stored in council_core.work_items.
 *
 * Kanban mapping:
 * - `status` → 7-state lifecycle (column on kanban board)
 * - `phase` → pipeline stage (displayed as info, not used for columns)
 * - `priority` → card priority badge
 * - `kind` → card type label
 * - `tags` → JSON array of tag strings (stored as TEXT)
 * - `parent_id` → sub-issue relationship
 * - `metadata` → JSON extension data (stored as TEXT)
 */
export type WorkItemStatus = 'proposed' | 'open' | 'in_progress' | 'blocked' | 'done' | 'wont_do' | 'superseded';

export type WorkItem = {
  id: string;
  project_id: string;
  parent_id: string | null;
  kind: WorkItemKind;
  title: string;
  description: string | null;
  priority: WorkItemPriority | null;
  phase: string | null;
  assigned_to: string | null;
  due_at: string | null;
  tags: string; // JSON array as TEXT, e.g. '["tag1","tag2"]'
  metadata: string; // JSON object as TEXT, e.g. '{"key":"value"}'
  external_key: string | null;
  revision: number;
  created_at: string;
  updated_at: string;
  updated_by: string;
  updated_source: string;
  origin_source: string;
  status: WorkItemStatus;
  is_deleted: number;
};

// ── Workflow Runs ──

export type WorkflowRun = {
  id: string;
  work_item_id: string | null;
  project_id: string;
  run_state: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  current_phase: string | null;
  started_at: string | null;
  finished_at: string | null;
  attempt_count: number;
  summary: string | null;
  external_key: string | null;
  revision: number;
  created_at: string;
  updated_at: string;
  updated_by: string;
  updated_source: string;
  origin_source: string;
  status: 'active' | 'archived';
  is_deleted: number;
};

// ── Reviews ──

export type Review = {
  id: string;
  project_id: string;
  work_item_id: string | null;
  target_ref: string;
  reviewer: string;
  review_state: 'open' | 'in_progress' | 'passed' | 'failed' | 'partial' | 'dismissed';
  verdict: string | null;
  notes: string | null;
  external_key: string | null;
  revision: number;
  created_at: string;
  updated_at: string;
  updated_by: string;
  updated_source: string;
  origin_source: string;
  status: 'active' | 'archived';
  is_deleted: number;
};

// ── Review Findings ──

export type ReviewFinding = {
  id: string;
  review_id: string;
  finding_state: 'open' | 'accepted' | 'waived' | 'fixed' | 'duplicate';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  summary: string;
  recommended_fix: string | null;
  evidence: string | null;
  owner_note: string | null;
  external_key: string | null;
  revision: number;
  created_at: string;
  updated_at: string;
  updated_by: string;
  updated_source: string;
  origin_source: string;
  status: 'active' | 'archived';
  is_deleted: number;
};

// ── Knowledge Cards ──

export type KnowledgeCard = {
  id: string;
  topic: string;
  title: string;
  body: string;
  tags: string; // JSON array as TEXT
  confidence: number | null;
  source_run_id: string | null;
  metadata: string; // JSON as TEXT
  external_key: string | null;
  revision: number;
  created_at: string;
  updated_at: string;
  updated_by: string;
  updated_source: string;
  origin_source: string;
  status: 'active' | 'archived';
  is_deleted: number;
};

// ── Memory Rollups ──

/**
 * Memory rollup as stored in memory_rollups.
 * Time-windowed consolidation of session activity.
 * Read-only display — no writes from frontend.
 */
export type MemoryRollup = {
  id: string;
  tier: 'daily' | 'short' | 'weekly' | 'bimonthly' | 'manual';
  window_start: string;
  window_end: string;
  summary_text: string;
  decisions: string; // JSON array as TEXT, e.g. '[{"what":"..."}]'
  work_completed: string; // JSON array as TEXT
  open_items: string; // JSON array as TEXT
  carried_forward: string; // JSON object as TEXT
  deviations: string; // JSON array as TEXT
  key_files: string; // JSON array as TEXT
  key_functions: string; // JSON array as TEXT
  trace_id: string | null;
  source_file: string | null;
  vector_text: string;
  is_indexed: number;
  index_failures: number;
  parse_status: string;
  status: string;
  created_at: string;
  updated_at: string;
  source_id: string | null;
  source_rollup_ids: string | null;
};

/**
 * Parse a JSON field from a rollup (stored as TEXT).
 * Returns the parsed value or a safe default.
 */
export function parseRollupJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

// ── Legacy (deprecated) ──

/** @deprecated Use MemoryRollup instead. MemoryEntry mapped to a non-existent table. */
export type MemoryEntry = {
  id: string;
  entry_type: 'raw' | 'summary' | 'diary' | 'incident' | 'decision';
  tier: 'daily' | 'short' | 'weekly' | 'bimonthly' | 'manual';
  title: string;
  body: string;
  sections: string; // JSON as TEXT
  source_run_id: string | null;
  expires_at: string | null;
  external_key: string | null;
  revision: number;
  created_at: string;
  updated_at: string;
  updated_by: string;
  updated_source: string;
  origin_source: string;
  status: 'active' | 'archived';
  is_deleted: number;
};

// ── Kanban Phase Definitions ──

/**
 * Default kanban phases mapped to your workflow.
 * These are the "columns" on the kanban board.
 */
export type KanbanPhase = {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  isDone: boolean;
};

export const DEFAULT_KANBAN_PHASES: KanbanPhase[] = [
  { id: 'backlog', name: 'Backlog', color: '#6B7280', sortOrder: 1, isDone: false },
  { id: 'todo', name: 'To Do', color: '#3B82F6', sortOrder: 2, isDone: false },
  { id: 'in-progress', name: 'In Progress', color: '#F59E0B', sortOrder: 3, isDone: false },
  { id: 'in-review', name: 'In Review', color: '#8B5CF6', sortOrder: 4, isDone: false },
  { id: 'done', name: 'Done', color: '#10B981', sortOrder: 5, isDone: true },
  { id: 'failed', name: 'Failed', color: '#EF4444', sortOrder: 6, isDone: false },
];

/**
 * Map a work item's `phase` (free text) to a kanban phase.
 * Handles common variations and defaults to 'backlog'.
 */
export function resolvePhase(phase: string | null): KanbanPhase {
  if (!phase) return DEFAULT_KANBAN_PHASES[0]; // backlog

  const lower = phase.toLowerCase().trim();

  // Direct matches
  const exact = DEFAULT_KANBAN_PHASES.find(
    (p) => p.id === lower || p.name.toLowerCase() === lower
  );
  if (exact) return exact;

  // Partial matches
  if (lower.includes('backlog') || lower.includes('scout') || lower.includes('plan'))
    return DEFAULT_KANBAN_PHASES[0];
  if (lower.includes('todo') || lower.includes('to-do') || lower.includes('proposed'))
    return DEFAULT_KANBAN_PHASES[1];
  if (lower.includes('progress') || lower.includes('build') || lower.includes('implement'))
    return DEFAULT_KANBAN_PHASES[2];
  if (lower.includes('review') || lower.includes('validate') || lower.includes('cohesive'))
    return DEFAULT_KANBAN_PHASES[3];
  if (lower.includes('done') || lower.includes('complete') || lower.includes('index'))
    return DEFAULT_KANBAN_PHASES[4];
  if (lower.includes('fail') || lower.includes('error'))
    return DEFAULT_KANBAN_PHASES[5];

  return DEFAULT_KANBAN_PHASES[0]; // default to backlog
}

// ── API Response Types ──

export type ApiResponse<T> = T; // Your API returns raw data, no wrapper

export type CreateWorkItemRequest = {
  project_id: string;
  title: string;
  kind?: WorkItemKind;
  description?: string | null;
  priority?: WorkItemPriority | null;
  phase?: string | null;
  parent_id?: string | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
};

export type UpdateWorkItemRequest = {
  patch: {
    title?: string;
    description?: string | null;
    priority?: WorkItemPriority | null;
    phase?: string | null;
    kind?: WorkItemKind;
    parent_id?: string | null;
    tags?: string[];
    metadata?: Record<string, unknown>;
  };
  expected_revision?: number; // optional for frontend convenience
};
