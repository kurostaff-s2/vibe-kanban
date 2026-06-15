import { useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { useCouncilWorkItems, useUpdateWorkItem } from '@/shared/hooks/council';
import { DEFAULT_KANBAN_PHASES, resolvePhase, type WorkItem } from 'shared/council-types';
import {
  KanbanProvider,
  KanbanBoard,
  KanbanCard,
  KanbanCards,
  KanbanHeader,
  type DropResult,
} from '@vibe/ui/components/KanbanBoard';
import { PlusIcon } from '@phosphor-icons/react';
import { Button } from '@vibe/ui/components/Button';
import { CreateWorkItemModal } from '@/shared/dialogs/CreateWorkItemDialog';

/**
 * Council Kanban Container
 *
 * Simplified kanban board that works with the Council Core API.
 * - Uses `phase` field as kanban column (no separate status table)
 * - Uses `tags` field for tag display (no separate tag table)
 * - Drag-drop updates `phase` via PATCH
 * - No auth, no orgs, no workspaces
 */

// Parse tags from JSON string
function parseTags(tagsStr: string): string[] {
  try {
    const parsed = JSON.parse(tagsStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Priority color mapping
const PRIORITY_COLORS: Record<string, string> = {
  critical: '#EF4444',
  high: '#F97316',
  medium: '#EAB308',
  low: '#22C55E',
};

function CouncilKanbanContainer() {
  // Extract projectId from URL path (works on both project and issue detail routes)
  const location = useLocation();
  const projectIdMatch = location.pathname.match(/\/projects\/([^/]+)/);
  const projectId = projectIdMatch?.[1] ?? '';
  const navigate = useNavigate();
  const { data: workItems = [], isLoading } = useCouncilWorkItems(projectId);
  const updateWorkItem = useUpdateWorkItem();

  // Group work items by phase
  const itemsByPhase = useMemo(() => {
    const map = new Map<string, WorkItem[]>();
    DEFAULT_KANBAN_PHASES.forEach((phase) => map.set(phase.id, []));

    workItems.forEach((item) => {
      const phase = resolvePhase(item.phase);
      const existing = map.get(phase.id) || [];
      existing.push(item);
      map.set(phase.id, existing);
    });

    return map;
  }, [workItems]);

  // Handle drag end
  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      const { destination, source, draggableId } = result;

      if (!destination) return;
      if (
        destination.droppableId === source.droppableId &&
        destination.index === source.index
      ) {
        return;
      }

      const sourcePhase = source.droppableId;
      const destPhase = destination.droppableId;

      // Find the item
      const item = workItems.find((i) => i.id === draggableId);
      if (!item) return;

      // Update phase if changed
      const destPhaseDef = DEFAULT_KANBAN_PHASES.find((p) => p.id === destPhase);
      if (destPhaseDef && destPhase !== sourcePhase) {
        try {
          await updateWorkItem.mutateAsync({
            id: item.id,
            updates: { phase: destPhaseDef.id },
          });
        } catch (err) {
          console.error('Failed to update work item phase:', err);
        }
      }
    },
    [workItems, updateWorkItem]
  );

  // Navigate to issue detail
  const handleCardClick = (itemId: string) => {
    void navigate({
      to: '/projects/$projectId/issues/$issueId',
      params: { projectId, issueId: itemId },
    });
  };

  // Create new work item
  const handleCreateItem = useCallback(
    (phase?: string) => {
      void CreateWorkItemModal.show({
        projectId,
        initialPhase: phase ?? 'backlog',
      });
    },
    [projectId]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <p className="text-low">Loading...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <h1 className="text-lg font-semibold text-high">Kanban Board</h1>
        <Button size="sm" onClick={() => handleCreateItem()}>
          <PlusIcon className="h-4 w-4" />
          New Item
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        <KanbanProvider onDragEnd={handleDragEnd}>
          {DEFAULT_KANBAN_PHASES.map((phase) => {
            const items = itemsByPhase.get(phase.id) || [];
            return (
              <KanbanBoard key={phase.id}>
                {/* Column header */}
                <KanbanHeader
                  name={phase.name}
                  color={phase.color}
                  onAddTask={() => {
                    handleCreateItem(phase.id);
                  }}
                />

                {/* Cards container */}
                <KanbanCards id={phase.id}>
                  {items.map((item, index) => {
                    const tags = parseTags(item.tags);
                    return (
                      <KanbanCard
                        key={item.id}
                        id={item.id}
                        name={item.title}
                        index={index}
                        onClick={() => handleCardClick(item.id)}
                      >
                        <div className="flex flex-col gap-2">
                          {/* Priority + Kind badges */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {item.priority && (
                              <span
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
                                style={{
                                  backgroundColor:
                                    PRIORITY_COLORS[item.priority] + '20',
                                  color: PRIORITY_COLORS[item.priority],
                                }}
                              >
                                {item.priority}
                              </span>
                            )}
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs text-low bg-secondary">
                              {item.kind}
                            </span>
                          </div>

                          {/* Title */}
                          <p className="text-sm text-normal line-clamp-3 m-0">
                            {item.title}
                          </p>

                          {/* Tags */}
                          {tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-xs text-low bg-secondary"
                                >
                                  {tag}
                                </span>
                              ))}
                              {tags.length > 3 && (
                                <span className="text-xs text-low">
                                  +{tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </KanbanCard>
                    );
                  })}
                </KanbanCards>
              </KanbanBoard>
            );
          })}
        </KanbanProvider>
      </div>
    </div>
  );
}

export default CouncilKanbanContainer;
