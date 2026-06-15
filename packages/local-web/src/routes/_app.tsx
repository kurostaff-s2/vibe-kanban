import { type ReactNode, useMemo } from 'react';
import { createFileRoute, useParams, useNavigate, Outlet } from '@tanstack/react-router';
import { Provider as NiceModalProvider } from '@ebay/nice-modal-react';
import { cn } from '@/shared/lib/utils';
import { useCouncilProjects } from '@/shared/hooks/council';
import { PlusIcon, KanbanIcon, BrainIcon, ChatCircleIcon, FileTextIcon } from '@phosphor-icons/react';
import { CreateProjectModal } from '@/shared/dialogs/CreateProjectDialog';
import type { Project } from 'shared/council-types';

/**
 * Simplified app layout for Council Kanban.
 *
 * Replaces VK's complex layout (orgs, auth, hosts, workspaces) with:
 * - Left sidebar: project list
 * - Main area: outlet (kanban board)
 */

function CouncilAppLayout({ children }: { children: ReactNode }) {
  const { projectId } = useParams({ strict: false });
  const navigate = useNavigate();
  const { data: projects = [], isLoading } = useCouncilProjects();

  const sortedProjects = useMemo(
    () =>
      [...projects].sort(
        (a: Project, b: Project) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
    [projects]
  );

  const handleProjectClick = (id: string) => {
    void navigate({ to: '/projects/$projectId', params: { projectId: id } });
  };

  const handleMemoryClick = () => {
    void navigate({ to: '/memory' });
  };

  const handleChatClick = () => {
    void navigate({ to: '/chat' });
  };

  const handleDocumentsClick = () => {
    void navigate({ to: '/documents' });
  };

  const handleCreateProject = () => {
    void CreateProjectModal.show({});
  };

  return (
    <div className="grid grid-cols-[240px_1fr] h-screen bg-primary">
      {/* Left sidebar: project list */}
      <div className="bg-secondary border-r border-border flex flex-col h-full">
        {/* Header */}
        <div className="p-3 border-b border-border flex items-center gap-2">
          <KanbanIcon className="h-5 w-5 text-brand" weight="bold" />
          <span className="text-sm font-semibold text-high">Council</span>
        </div>

        {/* Navigation items */}
        <div className="p-2 space-y-0.5">
          <button
            onClick={handleChatClick}
            className={cn(
              'flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-left cursor-pointer',
              'transition-colors',
              'text-normal hover:bg-secondary-foreground/10'
            )}
          >
            <ChatCircleIcon className="h-4 w-4" weight="fill" />
            ARC Chat
          </button>
          <button
            onClick={handleDocumentsClick}
            className={cn(
              'flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-left cursor-pointer',
              'transition-colors',
              'text-normal hover:bg-secondary-foreground/10'
            )}
          >
            <FileTextIcon className="h-4 w-4" weight="fill" />
            Documents
          </button>
          <button
            onClick={handleMemoryClick}
            className={cn(
              'flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-left cursor-pointer',
              'transition-colors',
              'text-normal hover:bg-secondary-foreground/10'
            )}
          >
            <BrainIcon className="h-4 w-4" weight="fill" />
            Memory
          </button>
        </div>

        {/* Divider */}
        <div className="border-t border-border mx-2" />

        {/* Project list */}
        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="px-3 py-2 text-xs text-low">Loading...</div>
          ) : sortedProjects.length === 0 ? (
            <div className="px-3 py-4 text-xs text-low">No projects yet</div>
          ) : (
            sortedProjects.map((project) => (
              <button
                key={project.id}
                onClick={() => handleProjectClick(project.id)}
                className={cn(
                  'flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-left cursor-pointer',
                  'transition-colors mb-1',
                  project.id === projectId
                    ? 'bg-brand/10 text-high font-medium'
                    : 'text-normal hover:bg-secondary-foreground/10'
                )}
                title={project.description ?? project.name}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0 bg-brand"
                />
                <span className="truncate">{project.name}</span>
              </button>
            ))
          )}
        </div>

        {/* Create project button */}
        <div className="p-2 border-t border-border">
          <button
            onClick={handleCreateProject}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-low hover:text-normal hover:bg-secondary-foreground/10 cursor-pointer transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            New Project
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="relative min-h-0 overflow-hidden">
        <NiceModalProvider>{children}</NiceModalProvider>
      </div>
    </div>
  );
}

function AppLayoutRouteComponent() {
  return <CouncilAppLayout><Outlet /></CouncilAppLayout>;
}

export const Route = createFileRoute('/_app')({
  component: AppLayoutRouteComponent,
});
