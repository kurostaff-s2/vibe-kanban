import { createFileRoute } from '@tanstack/react-router';
import { WorkItemDetail } from '@/pages/kanban/WorkItemDetail';
import { projectSearchValidator } from '@vibe/web-core/project-search';

export const Route = createFileRoute(
  '/_app/projects/$projectId_/issues/$issueId'
)({
  validateSearch: projectSearchValidator,
  component: WorkItemDetail,
});
