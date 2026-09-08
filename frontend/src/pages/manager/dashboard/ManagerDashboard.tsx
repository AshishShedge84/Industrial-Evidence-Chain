import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@components/layout';
import { StatCard, RecentActivity, QuickActions } from '@components/dashboard';
import { Box, FileText, Activity, Users } from 'lucide-react';
import { ROUTES } from '@constants/routes';
import type { User } from '@type-defs/auth';

export function ManagerDashboard({ user }: { user: User }) {
  const navigate = useNavigate();

  const stats = [
    { title: 'Total Operations Assets', value: '142', change: 12, changeLabel: 'vs last month', icon: <Box className="h-5 w-5" />, trend: 'up' as const },
    { title: 'Pending Reviews', value: '24', change: -5, changeLabel: 'vs last week', icon: <FileText className="h-5 w-5" />, trend: 'down' as const },
    { title: 'Active Technicians', value: '18', change: 2, changeLabel: 'this month', icon: <Users className="h-5 w-5" />, trend: 'up' as const },
    { title: 'Compliance Rate', value: '94%', change: 1.2, changeLabel: 'vs last month', icon: <Activity className="h-5 w-5" />, trend: 'up' as const },
  ];

  return (
    <div className="space-y-12 pb-12">
      <PageContainer
        title="Operations Manager Portal"
        description={`Welcome back, ${user.firstName}. Here's your fleet overview.`}
      >
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-12">
          {stats.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </div>

        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <RecentActivity
              activities={[]} 
              onViewAsset={(id) => navigate(ROUTES.ASSET_DETAILS(id))}
              onViewEvidence={(id) => navigate(ROUTES.EVIDENCE_DETAILS(id))}
            />
          </div>
          <div className="lg:col-span-4">
            <QuickActions
              onVerifyEvidence={() => navigate(ROUTES.VERIFICATION)}
              onCreateAsset={() => navigate(ROUTES.ASSETS)}
              onSearchAssets={() => navigate(ROUTES.ASSETS)}
            />
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
