import { useEffect } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useCouncilProjects } from '@/shared/hooks/council';

function RootRedirectRouteComponent() {
  const navigate = useNavigate();
  const { data: projects } = useCouncilProjects();

  useEffect(() => {
    if (projects && projects.length > 0) {
      // Redirect to first project
      void navigate({
        to: '/projects/$projectId',
        params: { projectId: projects[0].id },
        replace: true,
      });
    } else if (projects && projects.length === 0) {
      // No projects — stay on empty state
    }
  }, [projects, navigate]);

  return (
    <div className="h-screen bg-primary flex items-center justify-center">
      <div className="text-center">
        <p className="text-low text-sm">Loading...</p>
      </div>
    </div>
  );
}

export const Route = createFileRoute('/')({
  component: RootRedirectRouteComponent,
});
