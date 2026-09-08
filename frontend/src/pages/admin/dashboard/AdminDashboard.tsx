import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@components/layout';
import { StatCard, RecentActivity, QuickActions } from '@components/dashboard';
import { Shield, Users, Activity, Settings } from 'lucide-react';
import { ROUTES } from '@constants/routes';
import type { User } from '@type-defs/auth';

export function AdminDashboard({ user }: { user: User }) {
  const navigate = useNavigate();

  const stats = [
    { title: 'Total Accounts', value: '124', change: 4, changeLabel: 'this week', icon: <Users className="h-5 w-5" />, trend: 'up' as const },
    { title: 'Pending Approvals', value: '7', change: 2, changeLabel: 'new requests', icon: <Shield className="h-5 w-5 text-amber-500" />, trend: 'up' as const },
    { title: 'System Uptime', value: '99.9%', change: 0, changeLabel: 'all systems operational', icon: <Activity className="h-5 w-5 text-emerald-500" />, trend: 'up' as const },
    { title: 'Security Events', value: '0', change: 0, changeLabel: 'last 24 hours', icon: <Settings className="h-5 w-5" />, trend: 'up' as const },
  ];

  return (
    <div className="space-y-12 pb-12">
      <PageContainer
        title="Admin Portal"
        description={`Welcome back, ${user.firstName}. System administration and user management.`}
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
              onManageUsers={() => navigate('/admin/users')}
              onSystemSettings={() => navigate('/settings')}
            />
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
