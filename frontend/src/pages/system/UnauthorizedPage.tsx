import { Link } from 'react-router-dom';
import { Lock, RotateCcw, Home, User } from 'lucide-react';
import { Button } from '@components/ui';
import { useAuth } from '@hooks/useAuth';

export function UnauthorizedPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <div className="h-20 w-20 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <Lock className="h-10 w-10 text-red-600" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Access Denied</h1>
        <p className="text-gray-500 mb-8">
          You don't have permission to access this page. Please contact your administrator
          if you believe this is an error.
        </p>
        {user && (
          <div className="mb-6 p-4 bg-gray-100 rounded-lg text-left">
            <p className="text-sm font-medium text-gray-700">Current Role: {user.role}</p>
            <p className="text-sm text-gray-500 mt-1">Email: {user.email}</p>
          </div>
        )}
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
          <Button variant="ghost" onClick={logout}>
            <User className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}