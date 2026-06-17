import { createFileRoute } from '@tanstack/react-router';
import { CodegraphDashboard } from '@/pages/codegraph/CodegraphDashboard';

export const Route = createFileRoute('/_app/codegraph')({
  component: CodegraphDashboard,
});
