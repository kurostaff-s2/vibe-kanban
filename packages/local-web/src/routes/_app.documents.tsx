import { createFileRoute } from '@tanstack/react-router';
import DocumentsPage from '@/pages/documents/DocumentsPage';

export const Route = createFileRoute('/_app/documents')({
  component: DocumentsPage,
});
