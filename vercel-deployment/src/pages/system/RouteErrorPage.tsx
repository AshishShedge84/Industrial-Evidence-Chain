import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import { Button } from '@components/ui';

export function RouteErrorPage() {
  const error = useRouteError();

  let errorMessage = 'An unexpected error occurred while loading this view.';
  if (isRouteErrorResponse(error)) {
    errorMessage = error.statusText || error.data?.message || errorMessage;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50 dark:bg-[#0A0D14] px-4">
      <div className="text-center max-w-lg p-8 rounded-3xl bg-white/80 dark:bg-[#0F1218]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
        <div className="h-16 w-16 mx-auto mb-6 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Something went wrong</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-mono text-xs bg-black/5 dark:bg-white/5 p-3 rounded-xl break-words">
          {errorMessage}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => window.location.reload()} variant="primary">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reload Page
          </Button>
          <Link to="/dashboard">
            <Button variant="outline">
              <Home className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

