import { router } from '@web/app/router';
import type { FileRouteTypes } from '@web/routeTree.gen';
import type {
  AppDestination,
  AppNavigation,
} from '@/shared/lib/routes/appNavigation';

type LocalRouteId = FileRouteTypes['id'];

function getPathParam(
  routeParams: Record<string, string>,
  key: string
): string | null {
  const value = routeParams[key];
  return value ? value : null;
}

function resolveLocalDestinationFromPath(path: string): AppDestination | null {
  const { pathname } = new URL(path, 'http://localhost');
  const { foundRoute, routeParams } = router.getMatchedRoutes(pathname);

  if (!foundRoute) {
    return null;
  }

  switch (foundRoute.id as LocalRouteId) {
    case '/':
      return { kind: 'root' };
    case '/_app/projects/$projectId': {
      const projectId = getPathParam(routeParams, 'projectId');
      return projectId ? { kind: 'project', projectId } : null;
    }
    case '/_app/projects/$projectId_/issues/$issueId': {
      const projectId = getPathParam(routeParams, 'projectId');
      const issueId = getPathParam(routeParams, 'issueId');
      return projectId && issueId
        ? { kind: 'project-issue', projectId, issueId }
        : null;
    }
    default:
      return null;
  }
}

export const localAppNavigation: AppNavigation = {
  resolveFromPath: (path: string) => resolveLocalDestinationFromPath(path),

  goToRoot: () => {
    void router.navigate({ to: '/' });
  },

  goToOnboarding: () => {},
  goToOnboardingSignIn: () => {},
  goToWorkspaces: () => {},
  goToWorkspacesCreate: () => {},
  goToWorkspace: () => {},
  goToWorkspaceVsCode: () => {},
  goToExport: () => {},

  goToProject: (projectId: string) => {
    void router.navigate({
      to: '/projects/$projectId',
      params: { projectId },
    });
  },

  goToProjectIssue: (projectId: string, issueId: string) => {
    void router.navigate({
      to: '/projects/$projectId/issues/$issueId',
      params: { projectId, issueId },
    });
  },

  goToProjectIssueWorkspace: () => {},
  goToProjectIssueWorkspaceCreate: () => {},
  goToProjectWorkspaceCreate: () => {},
};
