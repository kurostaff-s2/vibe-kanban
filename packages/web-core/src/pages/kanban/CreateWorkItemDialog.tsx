import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@vibe/ui/components/Dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@vibe/ui/components/Select';
import { Button } from '@vibe/ui/components/Button';
import { Input } from '@vibe/ui/components/Input';
import { Label } from '@vibe/ui/components/Label';
import { Textarea } from '@vibe/ui/components/Textarea';
import { useCreateWorkItem } from '@/shared/hooks/council';
import { DEFAULT_KANBAN_PHASES, type WorkItemKind, type WorkItemPriority } from 'shared/council-types';

const KIND_OPTIONS: { value: WorkItemKind; label: string }[] = [
  { value: 'task', label: 'Task' },
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature' },
  { value: 'epic', label: 'Epic' },
];

const PRIORITY_OPTIONS: { value: WorkItemPriority; label: string }[] = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

interface CreateWorkItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  defaultPhase?: string;
}

export function CreateWorkItemDialog({ open, onOpenChange, projectId, defaultPhase }: CreateWorkItemDialogProps) {
  const createWorkItem = useCreateWorkItem();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState<WorkItemKind>('task');
  const [priority, setPriority] = useState<WorkItemPriority>('medium');
  const [phase, setPhase] = useState<string>(defaultPhase ?? 'todo');

  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      setTitle('');
      setDescription('');
      setKind('task');
      setPriority('medium');
      setPhase(defaultPhase ?? 'todo');
    }
    onOpenChange(isOpen);
  }, [onOpenChange, defaultPhase]);

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) return;

    await createWorkItem.mutateAsync({
      project_id: projectId,
      title: title.trim(),
      kind,
      description: description.trim() || null,
      priority,
      phase: phase || null,
    });

    // Reset form
    setTitle('');
    setDescription('');
    setKind('task');
    setPriority('medium');
    setPhase(defaultPhase ?? 'todo');
    onOpenChange(false);
  }, [title, description, kind, priority, phase, projectId, createWorkItem, onOpenChange, defaultPhase]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter') && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Work Item</DialogTitle>
          <DialogDescription>
            Add a new task, bug, or feature to the project.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4" onKeyDown={handleKeyDown}>
          {/* Title */}
          <div className="grid gap-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Add details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Kind, Priority, Phase row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-2">
              <Label>Kind</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as WorkItemKind)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KIND_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as WorkItemPriority)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Phase</Label>
              <Select value={phase} onValueChange={setPhase}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEFAULT_KANBAN_PHASES.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || createWorkItem.isPending}
          >
            {createWorkItem.isPending ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
