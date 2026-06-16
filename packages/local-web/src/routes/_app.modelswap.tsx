import { createFileRoute } from '@tanstack/react-router';
import { ModelSwapDashboard } from '@/pages/infra/llama/ModelSwapDashboard';

export const Route = createFileRoute('/_app/modelswap')({
  component: ModelSwapDashboard,
});
