import { useState, useCallback, useMemo } from 'react';
import { useLocation } from '@tanstack/react-router';
import {
  useCouncilDocuments,
  useCreateDocument,
  useUpdateDocument,
  useDeleteDocument,
  type CouncilDocument,
} from '@/shared/hooks/council';
import { Button } from '@vibe/ui/components/Button';
import { Input } from '@vibe/ui/components/Input';
import { Textarea } from '@vibe/ui/components/Textarea';
import {
  PlusIcon,
  TrashIcon,
  NoteIcon,
  ListChecksIcon,
  PencilIcon,
  FileTextIcon,
  FloppyDiskIcon,
} from '@phosphor-icons/react';

const KIND_CONFIG: Record<string, { label: string; icon: typeof NoteIcon; color: string }> = {
  note: { label: 'Note', icon: NoteIcon, color: '#60A5FA' },
  plan: { label: 'Plan', icon: ListChecksIcon, color: '#F59E0B' },
  draft: { label: 'Draft', icon: PencilIcon, color: '#A78BFA' },
  spec: { label: 'Spec', icon: FileTextIcon, color: '#34D399' },
};

function DocumentsPage() {
  const location = useLocation();
  const projectIdMatch = location.pathname.match(/\/projects\/([^/]+)/);
  const projectId = projectIdMatch?.[1] ?? '';

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editKind, setEditKind] = useState<'note' | 'plan' | 'draft' | 'spec'>('note');
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newKind, setNewKind] = useState<'note' | 'plan' | 'draft' | 'spec'>('note');

  const { data: documents = [], isLoading } = useCouncilDocuments(projectId);
  const createDoc = useCreateDocument();
  const updateDoc = useUpdateDocument();
  const deleteDoc = useDeleteDocument();

  const selectedDoc = useMemo(
    () => documents.find((d) => d.id === selectedId) ?? null,
    [documents, selectedId]
  );

  const handleSelect = useCallback((doc: CouncilDocument) => {
    setSelectedId(doc.id);
    setIsEditing(false);
  }, []);

  const handleStartEdit = useCallback(() => {
    if (!selectedDoc) return;
    setEditTitle(selectedDoc.title);
    setEditContent(selectedDoc.content);
    setEditKind(selectedDoc.kind);
    setIsEditing(true);
  }, [selectedDoc]);

  const handleSave = useCallback(async () => {
    if (!selectedId || !editTitle.trim()) return;
    await updateDoc.mutateAsync({
      id: selectedId,
      updates: {
        title: editTitle.trim(),
        content: editContent,
        kind: editKind,
      },
    });
    setIsEditing(false);
  }, [selectedId, editTitle, editContent, editKind, updateDoc]);

  const handleCreate = useCallback(async () => {
    if (!newTitle.trim()) return;
    await createDoc.mutateAsync({
      project_id: projectId,
      title: newTitle.trim(),
      content: '',
      kind: newKind,
    });
    setNewTitle('');
    setShowCreate(false);
  }, [newTitle, newKind, projectId, createDoc]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this document?')) return;
    await deleteDoc.mutateAsync(id);
    if (selectedId === id) setSelectedId(null);
  }, [selectedId, deleteDoc]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <p className="text-low">Loading documents...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <h1 className="text-lg font-semibold text-high">Documents & Drafts</h1>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
          <PlusIcon className="h-4 w-4" />
          New Document
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="px-4 py-3 border-b border-border bg-secondary/50">
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Document title..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="flex-1"
              autoFocus
            />
            <select
              value={newKind}
              onChange={(e) => setNewKind(e.target.value as typeof newKind)}
              className="h-9 rounded border border-input bg-background px-2 text-sm"
            >
              {Object.entries(KIND_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
            <Button size="sm" onClick={handleCreate} disabled={!newTitle.trim() || createDoc.isPending}>
              {createDoc.isPending ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Document list */}
        <div className="w-72 border-r border-border overflow-y-auto">
          {documents.length === 0 ? (
            <div className="p-4 text-center text-low text-sm">
              No documents yet. Create one to get started.
            </div>
          ) : (
            documents.map((doc) => {
              const kindCfg = KIND_CONFIG[doc.kind] ?? KIND_CONFIG.note;
              const Icon = kindCfg.icon;
              const isSelected = doc.id === selectedId;
              return (
                <div
                  key={doc.id}
                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer border-b border-border/50 hover:bg-secondary/50 ${
                    isSelected ? 'bg-secondary' : ''
                  }`}
                  onClick={() => handleSelect(doc)}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" style={{ color: kindCfg.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-high truncate">{doc.title}</div>
                    <div className="text-xs text-low">
                      {kindCfg.label} · {new Date(doc.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    className="text-low hover:text-high p-1"
                    onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Document content */}
        <div className="flex-1 overflow-y-auto">
          {!selectedDoc ? (
            <div className="flex items-center justify-center h-full text-low">
              <div className="text-center">
                <FileTextIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Select a document to view</p>
              </div>
            </div>
          ) : isEditing ? (
            <div className="p-4 space-y-4">
              <div className="flex gap-2">
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="flex-1 text-lg font-semibold"
                  placeholder="Title..."
                />
                <select
                  value={editKind}
                  onChange={(e) => setEditKind(e.target.value as typeof editKind)}
                  className="h-9 rounded border border-input bg-background px-2 text-sm"
                >
                  {Object.entries(KIND_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.label}</option>
                  ))}
                </select>
              </div>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[400px] font-mono text-sm"
                placeholder="Write your document content here... (markdown supported)"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={updateDoc.isPending || !editTitle.trim()}>
                  <FloppyDiskIcon className="h-4 w-4" />
                  {updateDoc.isPending ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {(() => {
                      const kindCfg = KIND_CONFIG[selectedDoc.kind] ?? KIND_CONFIG.note;
                      const Icon = kindCfg.icon;
                      return <Icon className="h-5 w-5" style={{ color: kindCfg.color }} />;
                    })()}
                    <h2 className="text-xl font-semibold text-high">{selectedDoc.title}</h2>
                  </div>
                  <div className="text-xs text-low">
                    {KIND_CONFIG[selectedDoc.kind]?.label ?? selectedDoc.kind} ·
                    Updated {new Date(selectedDoc.updated_at).toLocaleString()}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleStartEdit}>
                  <PencilIcon className="h-4 w-4" />
                  Edit
                </Button>
              </div>
              <div className="prose prose-sm prose-invert max-w-none">
                {selectedDoc.content ? (
                  <pre className="whitespace-pre-wrap font-mono text-sm text-normal bg-secondary/30 p-4 rounded">
                    {selectedDoc.content}
                  </pre>
                ) : (
                  <div className="text-low italic">Empty document. Click Edit to add content.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DocumentsPage;
