import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@components/layout';
import { StatCard, RecentActivity, QuickActions } from '@components/dashboard';
import { Shield, FileText, AlertTriangle, CheckCircle } from 'lucide-react';
import { ROUTES } from '@constants/routes';
import type { User } from '@type-defs/auth';

export function AuditorDashboard({ user }: { user: User }) {
  const navigate = useNavigate();

  const stats = [
    { title: 'Audits Pending', value: '45', change: 12, changeLabel: 'vs last week', icon: <FileText className="h-5 w-5" />, trend: 'up' as const },
    { title: 'Integrity Alerts', value: '2', change: 0, changeLabel: 'no change', icon: <AlertTriangle className="h-5 w-5 text-amber-500" />, trend: 'down' as const },
    { title: 'Verified Records', value: '8,432', change: 150, changeLabel: 'this month', icon: <CheckCircle className="h-5 w-5" />, trend: 'up' as const },
    { title: 'Blockchain Anchors', value: '100%', change: 0, changeLabel: 'sync status', icon: <Shield className="h-5 w-5" />, trend: 'up' as const },
  ];

  return (
    <div className="space-y-12 pb-12">
      <PageContainer
        title="Auditor Portal"
        description={`Welcome back, ${user.firstName}. Review compliance and integrity data.`}
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
              onSearchAssets={() => navigate(ROUTES.ASSETS)}
            />
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
