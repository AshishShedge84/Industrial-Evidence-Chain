import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@components/layout';
import { StatCard, RecentActivity, QuickActions } from '@components/dashboard';
import { Box, Camera, Shield, FileText } from 'lucide-react';
import { ROUTES } from '@constants/routes';
import type { User } from '@type-defs/auth';

export function TechnicianDashboard({ user }: { user: User }) {
  const navigate = useNavigate();

  const stats = [
    { title: 'My Assigned Assets', value: '12', change: 0, changeLabel: 'no change', icon: <Box className="h-5 w-5" />, trend: 'up' as const },
    { title: 'Evidence Captured', value: '45', change: 8, changeLabel: 'this week', icon: <Camera className="h-5 w-5" />, trend: 'up' as const },
    { title: 'Pending Verifications', value: '3', change: -2, changeLabel: 'vs last week', icon: <FileText className="h-5 w-5" />, trend: 'down' as const },
  ];

  return (
    <div className="space-y-12 pb-12">
      <PageContainer
        title="Technician Portal"
        description={`Welcome back, ${user.firstName}. Ready for field operations.`}
      >
        <div className="grid gap-6 sm:grid-cols-3 mb-12">
          {stats.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </div>

        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-8">
            {/* Technician focused recent activity */}
            <RecentActivity
              activities={[]} // Ideally filter for this user
              onViewAsset={(id) => navigate(ROUTES.ASSET_DETAILS(id))}
              onViewEvidence={(id) => navigate(ROUTES.EVIDENCE_DETAILS(id))}
            />
          </div>
          <div className="lg:col-span-4">
            <QuickActions
              onCaptureEvidence={() => navigate(ROUTES.EVIDENCE_CAPTURE)}
              onScanQR={() => navigate('/assets')}
              onSearchAssets={() => navigate(ROUTES.ASSETS)}
            />
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
