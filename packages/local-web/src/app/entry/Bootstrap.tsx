import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@web/app/entry/App';

function ErrorFallback({ error }: { error: Error | null }) {
  return (
    <div className="h-screen flex items-center justify-center bg-primary">
      <div className="text-center p-8">
        <h1 className="text-xl font-bold text-high mb-4">Something went wrong</h1>
        {error && (
          <pre className="text-sm text-low bg-secondary p-4 rounded max-w-md overflow-auto text-left">
            {error.message}
          </pre>
        )}
      </div>
    </div>
  );
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
