import { Link } from 'react-router-dom';
import { Home, RotateCcw, Search } from 'lucide-react';
import { Button } from '@components/ui';

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <span className="text-9xl font-bold text-gray-200">404</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Page Not Found</h1>
        <p className="text-gray-500 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={() => window.history.back()}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Go Back
          </Button>
          <Link to="/dashboard">
            <Button variant="outline">
              <Home className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
          </Link>
          <Link to="/assets">
            <Button variant="ghost">
              <Search className="h-4 w-4 mr-2" />
              Browse Assets
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}