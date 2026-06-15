import { Outlet, createRootRoute } from '@tanstack/react-router';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider } from '@web/app/providers/ThemeProvider';
import { ThemeMode } from 'shared/types';
import i18n from '@/i18n';
import '@/app/styles/new/index.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2000,
      refetchOnWindowFocus: false,
    },
  },
});

function RootRouteComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <ThemeProvider initialTheme={ThemeMode.SYSTEM}>
          <Outlet />
        </ThemeProvider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

export const Route = createRootRoute({
  component: RootRouteComponent,
});
