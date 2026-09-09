import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@components/layout';
import { StatCard, RecentActivity, QuickActions, DashboardClock } from '@components/dashboard';
import { Box, FileText, Shield, Clock } from 'lucide-react';
import { ROUTES } from '@constants/routes';
import { assetService } from '@services/assets/assetService';
import { evidenceService } from '@services/evidence/evidenceService';
import { ACTIVITY_TYPE_LABELS } from '@constants/activityTypes';
import type { User } from '@type-defs/auth';

export function ManagerDashboard({ user }: { user: User }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalAssets: 0,
    totalEvidence: 0,
    verifiedEvidence: 0,
    pendingReviews: 0,
  });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchManagerData = async () => {
      setIsLoading(true);
      try {
        const [assetsRes, evidenceRes] = await Promise.all([
          assetService.getAssets({ pageSize: 100 }),
          evidenceService.getEvidenceList({ pageSize: 100 }),
        ]);

        if (!isMounted) return;

        const assets = assetsRes.success && assetsRes.data ? assetsRes.data.items : [];
        const evidence = evidenceRes.success && evidenceRes.data ? evidenceRes.data.items : [];

        const verified = evidence.filter((e: any) => e.status === 'Verified' || e.status === 'Anchored');
        const pending = evidence.filter((e: any) => e.status === 'Draft' || e.status === 'Submitted');

        setStats({
          totalAssets: assets.length,
          totalEvidence: evidence.length,
          verifiedEvidence: verified.length,
          pendingReviews: pending.length,
        });

        const mapped = evidence.slice(0, 5).map((e: any) => ({
          id: e.evidenceId,
          type: (e.status === 'Verified' ? 'evidence_verified' : 'evidence_submitted') as any,
          title: `${(ACTIVITY_TYPE_LABELS as any)[e.activityType] || 'Evidence Record'}`,
          description: e.description || `Asset: ${e.assetId}`,
          timestamp: e.createdAt || e.timestamp,
          assetId: e.assetId,
          evidenceId: e.evidenceId,
          status: e.status,
          activityType: e.activityType,
        }));
        setRecentActivities(mapped);
      } catch (err) {
        console.error('Failed to load manager dashboard data', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchManagerData();
    return () => { isMounted = false; };
  }, []);

  const statCards = [
    {
      title: 'Operational Assets',
      value: isLoading ? '...' : String(stats.totalAssets),
      changeLabel: 'Total in PostgreSQL',
      icon: <Box className="h-5 w-5 text-primary-600" />,
      trend: 'up' as const,
    },
    {
      title: 'Total Evidence',
      value: isLoading ? '...' : String(stats.totalEvidence),
      changeLabel: 'Chain records',
      icon: <FileText className="h-5 w-5" />,
      trend: 'up' as const,
    },
    {
      title: 'Verified on Chain',
      value: isLoading ? '...' : String(stats.verifiedEvidence),
      changeLabel: 'Cryptographic proof',
      icon: <Shield className="h-5 w-5 text-emerald-500" />,
      trend: 'up' as const,
    },
    {
      title: 'Pending Sealing',
      value: isLoading ? '...' : String(stats.pendingReviews),
      changeLabel: 'Awaiting anchor',
      icon: <Clock className="h-5 w-5 text-amber-500" />,
      trend: stats.pendingReviews > 0 ? ('up' as const) : ('down' as const),
    },
  ];

  return (
    <div className="space-y-12 pb-12">
      <PageContainer
        title="Operations Manager Portal"
        description={`Welcome back, ${user.firstName}. Here's your fleet overview.`}
        actions={<DashboardClock />}
      >
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-12">
          {statCards.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </div>

        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <RecentActivity
              activities={recentActivities} 
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
