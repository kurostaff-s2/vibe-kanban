import { useState, useCallback } from 'react';
import { create, useModal } from '@ebay/nice-modal-react';
import { useCreateProject } from '@/shared/hooks/council';
import { useNavigate } from '@tanstack/react-router';
import { PlusIcon, SpinnerIcon } from '@phosphor-icons/react';
import { defineModal } from '@/shared/lib/modals';

interface CreateProjectProps {
  /** Callback after successful creation (optional, dialog auto-navigates) */
  onSuccess?: (projectId: string) => void;
}

const CreateProjectDialog = create(function CreateProjectDialog() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const createProject = useCreateProject();
  const navigate = useNavigate();
  const modal = useModal();

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }

    setError(null);
    try {
      const project = await createProject.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
      });

      // Navigate to the new project
      void navigate({
        to: '/projects/$projectId',
        params: { projectId: project.id },
        replace: true,
      });

      // Close the dialog
      modal.remove();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    }
  }, [name, description, createProject, navigate, modal]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-high">Create Project</h2>
        <p className="text-sm text-low mt-1">
          Add a new project to track work items.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-normal mb-1">
          Project Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. My Project"
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
          placeholder="Optional description..."
          rows={3}
          className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-high placeholder:text-low focus:outline-none focus:ring-2 focus:ring-brand/50 resize-none"
        />
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
          disabled={createProject.isPending || !name.trim()}
          className="px-4 py-2 rounded-md text-sm bg-brand text-white hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {createProject.isPending ? (
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

export const CreateProjectModal = defineModal<CreateProjectProps, void>(CreateProjectDialog);

export default CreateProjectModal;
