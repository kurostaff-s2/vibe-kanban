import { useState, useCallback } from 'react';
import { create, useModal } from '@ebay/nice-modal-react';
import { useCreateWorkItem } from '@/shared/hooks/council';
import { PlusIcon, SpinnerIcon } from '@phosphor-icons/react';
import { defineModal } from '@/shared/lib/modals';
import type { WorkItemKind, WorkItemPriority } from 'shared/council-types';

interface CreateWorkItemProps {
  projectId: string;
  /** Pre-selected phase (column) for the item */
  initialPhase?: string;
}

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

const CreateWorkItemDialog = create(function CreateWorkItemDialog({
  projectId,
  initialPhase = 'backlog',
}: CreateWorkItemProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState<WorkItemKind>('task');
  const [priority, setPriority] = useState<WorkItemPriority>('medium');
  const [error, setError] = useState<string | null>(null);
  const createWorkItem = useCreateWorkItem();
  const modal = useModal();

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setError(null);
    try {
      await createWorkItem.mutateAsync({
        project_id: projectId,
        title: title.trim(),
        description: description.trim() || null,
        kind,
        priority,
        phase: initialPhase || null,
      });

      modal.remove();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create work item');
    }
  }, [title, description, kind, priority, projectId, initialPhase, createWorkItem, modal]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-high">New Work Item</h2>
        <p className="text-sm text-low mt-1">
          Create a new task, bug, or feature.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-normal mb-1">
          Title <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Fix login redirect"
          className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-high placeholder:text-low focus:outline-none focus:ring-2 focus:ring-brand/50"
          autoFocus
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-normal mb-1">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional details..."
          rows={3}
          className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-high placeholder:text-low focus:outline-none focus:ring-2 focus:ring-brand/50 resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-normal mb-1">Kind</label>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as WorkItemKind)}
            className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-high focus:outline-none focus:ring-2 focus:ring-brand/50"
          >
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-normal mb-1">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as WorkItemPriority)}
            className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-high focus:outline-none focus:ring-2 focus:ring-brand/50"
          >
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={() => modal.remove()}
          className="px-4 py-2 rounded-md text-sm text-normal hover:bg-secondary-foreground/10 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={createWorkItem.isPending || !title.trim()}
          className="px-4 py-2 rounded-md text-sm bg-brand text-white hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {createWorkItem.isPending ? (
            <>
              <SpinnerIcon className="h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <PlusIcon className="h-4 w-4" />
              Create
            </>
          )}
        </button>
      </div>
    </form>
  );
});

export const CreateWorkItemModal = defineModal<CreateWorkItemProps, void>(
  CreateWorkItemDialog
);

export default CreateWorkItemModal;
