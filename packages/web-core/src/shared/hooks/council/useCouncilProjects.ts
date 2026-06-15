import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { makeCouncilRequest } from '@/shared/lib/councilApiTransport';
import type { Project } from 'shared/council-types';

const PROJECTS_KEY = ['council', 'projects'];

/**
 * Generate a URL-friendly slug from a project name.
 * e.g. "My Project!" -> "my-project"
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);
}

/**
 * Fetch all projects from the Council API.
 */
export function useCouncilProjects() {
  return useQuery<Project[]>({
    queryKey: PROJECTS_KEY,
    queryFn: async () => {
      const res = await makeCouncilRequest('/v1/projects');
      if (!res.ok) throw new Error(`Failed to fetch projects: ${res.status}`);
      const data = await res.json();
      return (Array.isArray(data) ? data : []).filter(
        (p: Project) => p.status === 'active' && !p.is_deleted
      );
    },
    refetchInterval: 5000,
    staleTime: 2000,
  });
}

/**
 * Create a new project.
 */
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { name: string; description?: string }) => {
      const res = await makeCouncilRequest('/v1/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: input.name,
          slug: generateSlug(input.name),
          description: input.description || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to create project: ${res.status}`);
      }
      return res.json() as Promise<Project>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_KEY });
    },
  });
}
