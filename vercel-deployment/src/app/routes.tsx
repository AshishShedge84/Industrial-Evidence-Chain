import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute, PublicRoute, RoleRoute } from '@components/auth/ProtectedRoute';
import { AppLayout } from '@components/layout';
import { LoginPage } from '@pages/auth';
import { DashboardPage } from '@pages/dashboard';
import { AssetsPage, AssetDetailsPage, AssetHistoryPage } from '@pages/assets';
import { EvidenceDetailsPage, EvidenceHistoryPage } from '@pages/evidence';
import { CaptureEvidencePage } from '../pages/technician/evidence/CaptureEvidencePage';
import { VerificationPage } from '@pages/verification';
import { AuditDashboardPage } from '@pages/audit';
import { ProfilePage } from '@pages/profile';
import { SettingsPage } from '@pages/settings';
import { UsersPage } from '@pages/admin';
import { NotFoundPage, UnauthorizedPage, RouteErrorPage } from '@pages/system';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <PublicRoute><LoginPage /></PublicRoute>,
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <ProtectedRoute><DashboardPage /></ProtectedRoute>,
      },
      {
        path: 'assets',
        element: <ProtectedRoute><AssetsPage /></ProtectedRoute>,
      },
      {
        path: 'assets/:id',
        element: <ProtectedRoute><AssetDetailsPage /></ProtectedRoute>,
      },
      {
        path: 'assets/:id/history',
        element: <ProtectedRoute><AssetHistoryPage /></ProtectedRoute>,
      },
      {
        path: 'evidence',
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'evidence/capture',
        element: <RoleRoute allowedRoles={['Technician']}><CaptureEvidencePage /></RoleRoute>,
      },
      {
        path: 'evidence/:id',
        element: <ProtectedRoute><EvidenceDetailsPage /></ProtectedRoute>,
      },
      {
        path: 'evidence/:id/history',
        element: <ProtectedRoute><EvidenceHistoryPage /></ProtectedRoute>,
      },
      {
        path: 'verification',
        element: <RoleRoute allowedRoles={['Manager', 'Auditor', 'Admin']}><VerificationPage /></RoleRoute>,
      },
      {
        path: 'verify',
        element: <Navigate to="/verification" replace />,
      },
      {
        path: 'audit',
        element: <RoleRoute allowedRoles={['Admin']}><AuditDashboardPage /></RoleRoute>,
      },
      {
        path: 'profile',
        element: <ProtectedRoute><ProfilePage /></ProtectedRoute>,
      },
      {
        path: 'settings',
        element: <ProtectedRoute><SettingsPage /></ProtectedRoute>,
      },
      {
        path: 'admin/users',
        element: <RoleRoute allowedRoles={['Admin']}><UsersPage /></RoleRoute>,
      },
      {
        path: 'unauthorized',
        element: <UnauthorizedPage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]);