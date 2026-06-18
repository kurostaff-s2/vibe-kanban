import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import {
  ArrowLeftIcon,
  SpinnerIcon,
  TrashIcon,
  ClockIcon,
  CalendarIcon,
  LinkIcon,
  PencilIcon,
  CheckIcon,
  XIcon,
} from '@phosphor-icons/react';
import { cn } from '@/shared/lib/utils';
import {
  useCouncilWorkItem,
  useUpdateWorkItem,
  useDeleteWorkItem,
} from '@/shared/hooks/council';
import {
  DEFAULT_KANBAN_PHASES,
  resolvePhase,
  type WorkItemKind,
  type WorkItemPriority,
} from 'shared/council-types';

const KINDS: { value: WorkItemKind; label: string }[] = [
  { value: 'task', label: 'Task' },
  { value: 'pipeline', label: 'Pipeline' },
  { value: 'review', label: 'Review' },
  { value: 'delegation', label: 'Delegation' },
  { value: 'ad_hoc', label: 'Ad Hoc' },
];

const PRIORITIES: { value: WorkItemPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#EF4444',
  high: '#F97316',
  medium: '#EAB308',
  low: '#22C55E',
};

// Parse tags from JSON string
function parseTags(tagsStr: string): string[] {
  try {
    const parsed = JSON.parse(tagsStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Format relative time
function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// Inline editable field
function EditableField<T extends string>({
  value,
  options,
  colorMap,
  onSave,
}: {
  value: T | null;
  options: { value: T; label: string }[];
  colorMap?: Record<string, string>;
  onSave: (value: T) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState<T | null>(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const currentColor = colorMap?.[localValue ?? ''] ?? '';

  const handleSave = () => {
    if (localValue && localValue !== value) {
      onSave(localValue);
    }
    setEditing(false);
  };

  const handleCancel = () => {
    setLocalValue(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <select
          value={localValue ?? ''}
          onChange={(e) => setLocalValue(e.target.value as T)}
          className="px-2 py-0.5 rounded text-xs bg-secondary border border-border text-high focus:outline-none focus:ring-1 focus:ring-brand/50"
          autoFocus
        >
          <option value="">None</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          onClick={handleSave}
          className="p-0.5 rounded hover:bg-secondary-foreground/10 text-green-400"
          title="Save"
        >
          <CheckIcon className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleCancel}
          className="p-0.5 rounded hover:bg-secondary-foreground/10 text-low"
          title="Cancel"
        >
          <XIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium hover:opacity-80 transition-opacity',
        !localValue && 'text-low bg-secondary'
      )}
      style={
        localValue && currentColor
          ? {
                backgroundColor: currentColor + '20',
                color: currentColor,
              }
          : undefined
      }
      title="Click to edit"
    >
      {localValue ? options.find((o) => o.value === localValue)?.label ?? localValue : '—'}
      <PencilIcon className="h-3 w-3 opacity-50" />
    </button>
  );
}

// Editable text field (title/description)
function EditableTextField({
  value,
  placeholder,
  multiline,
  rows,
  onSave,
}: {
  value: string | null;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  onSave: (value: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value ?? '');

  useEffect(() => {
    setLocalValue(value ?? '');
  }, [value]);

  const handleSave = () => {
    onSave(localValue.trim() || null);
    setEditing(false);
  };

  const handleCancel = () => {
    setLocalValue(value ?? '');
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') handleCancel();
    if (e.key === 'Enter' && !multiline) handleSave();
  };

  if (editing) {
    return (
      <div className="flex flex-col gap-1.5">
        {multiline ? (
          <textarea
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={rows ?? 4}
            className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-high placeholder:text-low focus:outline-none focus:ring-2 focus:ring-brand/50 resize-none text-sm"
            autoFocus
          />
        ) : (
          <input
            type="text"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full px-3 py-1.5 rounded-md bg-secondary border border-border text-high placeholder:text-low focus:outline-none focus:ring-2 focus:ring-brand/50 text-sm"
            autoFocus
          />
        )}
        <div className="flex gap-1.5">
          <button
            onClick={handleSave}
            className="px-2 py-0.5 rounded text-xs bg-brand/10 text-brand hover:bg-brand/20 transition-colors"
          >
            Save
          </button>
          <button
            onClick={handleCancel}
            className="px-2 py-0.5 rounded text-xs bg-secondary text-low hover:text-normal transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  const displayValue = value || placeholder || '—';

  if (multiline) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="w-full text-left text-sm text-normal hover:text-high transition-colors py-1 px-2 rounded hover:bg-secondary/50 min-h-[2rem]"
        title="Click to edit"
      >
        {value ? (
          <div className="whitespace-pre-wrap break-words">{value}</div>
        ) : (
          <span className="text-low italic">{placeholder}</span>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="w-full text-left text-sm hover:underline transition-colors flex items-center gap-1.5 group"
      title="Click to edit"
    >
      <span className={cn(value ? 'text-high' : 'text-low italic')}>
        {displayValue}
      </span>
      <PencilIcon className="h-3 w-3 text-low opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </button>
  );
}

// Tag input/edit
function EditableTags({
  tagsStr,
  onSave,
}: {
  tagsStr: string;
  onSave: (tags: string[]) => void;
}) {
  const tags = useMemo(() => parseTags(tagsStr), [tagsStr]);
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onSave([...tags, trimmed]);
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
    if (e.key === 'Escape') {
      setEditing(false);
      setInputValue('');
    }
  };

  const handleRemove = (tag: string) => {
    onSave(tags.filter((t) => t !== tag));
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.length === 0 && !editing && (
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-low hover:text-normal transition-colors"
        >
          + Add tag
        </button>
      )}
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-secondary text-normal"
        >
          {tag}
          <button
            onClick={() => handleRemove(tag)}
            className="hover:text-red-400 transition-colors"
            title="Remove tag"
          >
            <XIcon className="h-3 w-3" />
          </button>
        </span>
      ))}
      {editing && (
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="tag name"
            className="px-2 py-0.5 rounded text-xs bg-secondary border border-border text-high placeholder:text-low focus:outline-none focus:ring-1 focus:ring-brand/50 w-24"
            autoFocus
          />
          <button
            onClick={handleAdd}
            className="text-xs text-brand hover:text-brand/80"
          >
            Add
          </button>
        </div>
      )}
      {tags.length > 0 && !editing && (
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-low hover:text-normal transition-colors"
        >
          +
        </button>
      )}
    </div>
  );
}

// Phase selector (maps to kanban columns)
function PhaseSelector({
  phase,
  onSave,
}: {
  phase: string | null;
  onSave: (phase: string) => void;
}) {
  const currentPhase = resolvePhase(phase);
  const [editing, setEditing] = useState(false);

  const handleSelect = (phaseId: string) => {
    onSave(phaseId);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {DEFAULT_KANBAN_PHASES.map((p) => (
          <button
            key={p.id}
            onClick={() => handleSelect(p.id)}
            className={cn(
              'px-2 py-1 rounded text-xs font-medium transition-colors border',
              p.id === currentPhase.id
                ? 'bg-brand/10 text-brand border-brand/30'
                : 'bg-secondary text-normal border-border hover:border-normal'
            )}
            style={{ borderColor: p.id === currentPhase.id ? p.color + '50' : undefined }}
          >
            {p.name}
          </button>
        ))}
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium hover:opacity-80 transition-opacity"
      style={{
        backgroundColor: currentPhase.color + '20',
        color: currentPhase.color,
      }}
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: currentPhase.color }} />
      {currentPhase.name}
      <PencilIcon className="h-3 w-3 opacity-50" />
    </button>
  );
}

// Confirm delete dialog (simple inline version)
function ConfirmDeleteModal({
  isOpen,
  onConfirm,
  onCancel,
  isPending,
}: {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-secondary border border-border rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
        <h3 className="text-lg font-semibold text-high mb-2">Delete Work Item</h3>
        <p className="text-sm text-normal mb-4">
          This will soft-delete the work item. It will no longer appear on the
          kanban board. This action cannot be easily undone.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="px-3 py-1.5 rounded-md text-sm text-normal hover:bg-secondary-foreground/10 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="px-3 py-1.5 rounded-md text-sm bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {isPending ? (
              <SpinnerIcon className="h-4 w-4 animate-spin" />
            ) : (
              <TrashIcon className="h-4 w-4" />
            )}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * WorkItemDetail — simple issue detail/edit view for the Council Core API.
 *
 * Matches the pattern of useCouncilWorkItems/useUpdateWorkItem hooks.
 * No auth, no orgs, no workspaces.
 */
export function WorkItemDetail() {
  const { projectId, issueId } = useParams({ strict: false }) as {
    projectId?: string;
    issueId?: string;
  };
  const navigate = useNavigate();

  const {
    data: item,
    isLoading,
    error: fetchError,
  } = useCouncilWorkItem(issueId);
  const updateWorkItem = useUpdateWorkItem();
  const deleteWorkItem = useDeleteWorkItem();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saveSuccessTimer, setSaveSuccessTimer] = useState(0);

  // Auto-reset save success indicator after 2s
  useEffect(() => {
    if (updateWorkItem.isSuccess && saveSuccessTimer === 0) {
      setSaveSuccessTimer(Date.now());
    }
  }, [updateWorkItem.isSuccess, saveSuccessTimer]);

  const showSaveSuccess =
    updateWorkItem.isSuccess &&
    Date.now() - saveSuccessTimer < 2000;

  // Navigate back to kanban board
  const handleBack = useCallback(() => {
    if (projectId) {
      void navigate({
        to: '/projects/$projectId',
        params: { projectId },
      });
    } else {
      void navigate({ to: '/' });
    }
  }, [navigate, projectId]);

  // Update a single field
  const handleFieldUpdate = useCallback(
    async (field: string, value: unknown) => {
      if (!issueId) return;
      try {
        await updateWorkItem.mutateAsync({
          id: issueId,
          updates: { [field]: value },
        });
      } catch (err) {
        console.error(`Failed to update ${field}:`, err);
      }
    },
    [issueId, updateWorkItem]
  );

  // Delete handler
  const handleDelete = useCallback(async () => {
    if (!issueId) return;
    try {
      await deleteWorkItem.mutateAsync(issueId);
      setShowDeleteConfirm(false);
      handleBack();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  }, [issueId, deleteWorkItem, handleBack]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <SpinnerIcon className="h-6 w-6 text-brand animate-spin" />
        <p className="text-sm text-low">Loading work item...</p>
      </div>
    );
  }

  // Error state
  if (fetchError || !item) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <p className="text-sm text-red-400">
          {fetchError?.message ?? 'Work item not found'}
        </p>
        <button
          onClick={handleBack}
          className="px-3 py-1.5 rounded-md text-sm bg-brand/10 text-brand hover:bg-brand/20 transition-colors"
        >
          Back to Board
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={handleBack}
            className="p-1.5 rounded-md hover:bg-secondary-foreground/10 text-normal hover:text-high transition-colors"
            title="Back to board"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-low font-mono">#{item.id.slice(0, 8)}</span>
            <h1 className="text-lg font-semibold text-high">Work Item</h1>
          </div>
        </div>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="p-1.5 rounded-md hover:bg-red-500/10 text-low hover:text-red-400 transition-colors"
          title="Delete"
        >
          <TrashIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-6 space-y-6">
          {/* Title */}
          <section>
            <EditableTextField
              value={item.title}
              placeholder="Untitled work item"
              onSave={(v) => handleFieldUpdate('title', v)}
            />
          </section>

          {/* Badges row */}
          <section className="flex items-center flex-wrap gap-2">
            <EditableField<WorkItemPriority>
              value={item.priority}
              options={PRIORITIES}
              colorMap={PRIORITY_COLORS}
              onSave={(v) => handleFieldUpdate('priority', v)}
            />
            <EditableField<WorkItemKind>
              value={item.kind}
              options={KINDS}
              onSave={(v) => handleFieldUpdate('kind', v)}
            />
            <PhaseSelector
              phase={item.phase}
              onSave={(v) => handleFieldUpdate('phase', v)}
            />

            {/* Status badge (read-only for now) */}
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs text-low bg-secondary">
              status: {item.status}
            </span>
          </section>

          {/* Description */}
          <section>
            <h3 className="text-xs font-medium text-low uppercase tracking-wider mb-2">
              Description
            </h3>
            <EditableTextField
              value={item.description}
              placeholder="Add a description..."
              multiline
              rows={6}
              onSave={(v) => handleFieldUpdate('description', v)}
            />
          </section>

          {/* Tags */}
          <section>
            <h3 className="text-xs font-medium text-low uppercase tracking-wider mb-2">
              Tags
            </h3>
            <EditableTags
              tagsStr={item.tags}
              onSave={(v) => handleFieldUpdate('tags', v)}
            />
          </section>

          {/* Metadata section */}
          {item.metadata && item.metadata !== '{}' && (
            <section>
              <h3 className="text-xs font-medium text-low uppercase tracking-wider mb-2">
                Metadata
              </h3>
              <pre className="text-xs text-low bg-secondary p-3 rounded-md overflow-x-auto">
                {typeof item.metadata === 'string'
                  ? item.metadata
                  : JSON.stringify(item.metadata, null, 2)}
              </pre>
            </section>
          )}

          {/* Timeline */}
          <section className="border-t border-border pt-4">
            <h3 className="text-xs font-medium text-low uppercase tracking-wider mb-3">
              Timeline
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-low">
                <ClockIcon className="h-4 w-4 shrink-0" />
                <span>
                  Created {formatRelativeTime(item.created_at)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-low">
                <CalendarIcon className="h-4 w-4 shrink-0" />
                <span>
                  Updated {formatRelativeTime(item.updated_at)}
                </span>
              </div>
              {item.due_at && (
                <div className="flex items-center gap-2 text-low">
                  <CalendarIcon className="h-4 w-4 shrink-0" />
                  <span>Due {new Date(item.due_at).toLocaleDateString()}</span>
                </div>
              )}
              {item.external_key && (
                <div className="flex items-center gap-2 text-low">
                  <LinkIcon className="h-4 w-4 shrink-0" />
                  <span className="font-mono">{item.external_key}</span>
                </div>
              )}
            </div>
          </section>

          {/* Revision info */}
          <section className="text-xs text-low">
            <span className="font-mono">revision: {item.revision}</span>
            {item.updated_by && (
              <span className="ml-3">by: {item.updated_by}</span>
            )}
            {item.updated_source && (
              <span className="ml-3">source: {item.updated_source}</span>
            )}
          </section>
        </div>
      </div>

      {/* Save indicator */}
      {updateWorkItem.isPending && (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 px-3 py-2 rounded-md bg-secondary border border-border text-sm text-normal shadow-lg">
          <SpinnerIcon className="h-4 w-4 animate-spin text-brand" />
          Saving...
        </div>
      )}
      {showSaveSuccess && (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 px-3 py-2 rounded-md bg-green-500/10 border border-green-500/20 text-sm text-green-400 shadow-lg">
          <CheckIcon className="h-4 w-4" />
          Saved
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmDeleteModal
        isOpen={showDeleteConfirm}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        isPending={deleteWorkItem.isPending}
      />
    </div>
  );
}
