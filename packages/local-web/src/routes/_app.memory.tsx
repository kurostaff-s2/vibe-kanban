import { createFileRoute } from '@tanstack/react-router';
import { MemoryRollupsPage } from '@/pages/memory/MemoryRollupsPage';

export const Route = createFileRoute('/_app/memory')({
  component: MemoryRollupsPage,
});
