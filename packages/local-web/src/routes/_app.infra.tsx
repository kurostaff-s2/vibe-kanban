import { createFileRoute } from '@tanstack/react-router';
import { InfraDashboard } from '@/pages/infra/InfraDashboard';

export const Route = createFileRoute('/_app/infra')({
  component: InfraDashboard,
});
