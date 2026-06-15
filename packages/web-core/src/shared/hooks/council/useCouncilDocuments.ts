import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { makeCouncilRequest } from '@/shared/lib/councilApiTransport';

export interface CouncilDocument {
  id: string;
  project_id: string;
  title: string;
  content: string;
  kind: 'note' | 'plan' | 'draft' | 'spec';
  tags: string[];
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  updated_by?: string;
  origin_source: string;
}

export interface CreateDocumentRequest {
  project_id?: string;
  title: string;
  content?: string;
  kind?: 'note' | 'plan' | 'draft' | 'spec';
  tags?: string[];
}

export interface UpdateDocumentRequest {
  title?: string;
  content?: string;
  kind?: 'note' | 'plan' | 'draft' | 'spec';
  tags?: string[];
}

const DOCUMENTS_KEY = ['council', 'documents'];

export function useCouncilDocuments(projectId?: string) {
  return useQuery<CouncilDocument[]>({
    queryKey: DOCUMENTS_KEY.concat(projectId ? [projectId] : []),
    queryFn: async () => {
      const url = projectId
        ? `/v1/documents?project_id=${projectId}`
        : '/v1/documents';
      const res = await makeCouncilRequest(url);
      if (!res.ok) throw new Error(`Failed to fetch documents: ${res.status}`);
      return res.json();
    },
    enabled: true,
  });
}

export function useCreateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateDocumentRequest) => {
      const res = await makeCouncilRequest('/v1/documents', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(`Failed to create document: ${res.status}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY });
    },
  });
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateDocumentRequest }) => {
      const res = await makeCouncilRequest(`/v1/documents/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error(`Failed to update document: ${res.status}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await makeCouncilRequest(`/v1/documents/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(`Failed to delete document: ${res.status}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY });
    },
  });
}
