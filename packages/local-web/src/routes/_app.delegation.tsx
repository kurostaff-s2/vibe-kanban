import { createFileRoute } from '@tanstack/react-router';
import { DelegationDashboard } from '@/pages/delegation';

export const Route = createFileRoute('/_app/delegation')({
  component: DelegationDashboard,
});
