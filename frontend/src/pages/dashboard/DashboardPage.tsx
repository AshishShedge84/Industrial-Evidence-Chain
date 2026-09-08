import { useAuth } from '@hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { ROUTES } from '@constants/routes';
import { TechnicianDashboard } from '../technician/dashboard/TechnicianDashboard';
import { ManagerDashboard } from '../manager/dashboard/ManagerDashboard';
import { AuditorDashboard } from '../auditor/dashboard/AuditorDashboard';
import { AdminDashboard } from '../admin/dashboard/AdminDashboard';
import { Loader2 } from 'lucide-react';

export function DashboardPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  switch (user.role) {
    case 'Technician':
      return <TechnicianDashboard user={user} />;
    case 'Manager':
      return <ManagerDashboard user={user} />;
    case 'Auditor':
      return <AuditorDashboard user={user} />;
    case 'Admin':
      return <AdminDashboard user={user} />;
    default:
      return (
        <div className="p-8 text-center">
          <p className="text-red-500">Unrecognized role: {user.role}</p>
        </div>
      );
  }
}