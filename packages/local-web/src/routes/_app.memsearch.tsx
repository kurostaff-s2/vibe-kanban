import { createFileRoute } from '@tanstack/react-router';
import { MemsearchDashboard } from '@/pages/memsearch/MemsearchDashboard';

export const Route = createFileRoute('/_app/memsearch')({
  component: MemsearchDashboard,
});
