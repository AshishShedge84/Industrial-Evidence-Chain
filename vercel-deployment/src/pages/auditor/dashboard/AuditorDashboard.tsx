import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@components/layout';
import { StatCard, RecentActivity, QuickActions, DashboardClock } from '@components/dashboard';
import { Shield, FileText, CheckCircle2, Clock } from 'lucide-react';
import { ROUTES } from '@constants/routes';
import { evidenceService } from '@services/evidence/evidenceService';
import { assetService } from '@services/assets/assetService';
import { ACTIVITY_TYPE_LABELS } from '@constants/activityTypes';
import type { User } from '@type-defs/auth';

export function AuditorDashboard({ user }: { user: User }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalEvidence: 0,
    verifiedEvidence: 0,
    pendingEvidence: 0,
    totalAssets: 0,
  });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchAuditorData = async () => {
      setIsLoading(true);
      try {
        const [evidenceRes, assetsRes] = await Promise.all([
          evidenceService.getEvidenceList({ pageSize: 100 }),
          assetService.getAssets({ pageSize: 1 }),
        ]);

        if (!isMounted) return;

        const evidence = evidenceRes.success && evidenceRes.data ? evidenceRes.data.items : [];
        const verified = evidence.filter((e: any) => e.status === 'Verified' || e.status === 'Anchored');
        const pending = evidence.filter((e: any) => e.status === 'Draft' || e.status === 'Submitted');

        setStats({
          totalEvidence: evidenceRes.success && evidenceRes.data ? evidenceRes.data.total : 0,
          verifiedEvidence: verified.length,
          pendingEvidence: pending.length,
          totalAssets: assetsRes.success && assetsRes.data ? assetsRes.data.total : 0,
        });

        const mapped = evidence.slice(0, 5).map((e: any) => ({
          id: e.evidenceId,
          type: (e.status === 'Verified' ? 'evidence_verified' : 'evidence_submitted') as any,
          title: `${(ACTIVITY_TYPE_LABELS as any)[e.activityType] || 'Evidence'} for ${e.assetId}`,
          description: typeof e.description === 'string' && e.description ? e.description : `Evidence ID: ${e.evidenceId}`,
          timestamp: e.createdAt || e.timestamp,
          assetId: e.assetId,
          evidenceId: e.evidenceId,
          status: e.status,
          activityType: e.activityType,
        }));
        setRecentActivities(mapped);
      } catch (err) {
        console.error('Failed to load auditor dashboard data', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchAuditorData();
    return () => { isMounted = false; };
  }, []);

  const statCards = [
    {
      title: 'Verified Records',
      value: isLoading ? '...' : String(stats.verifiedEvidence),
      changeLabel: 'Cryptographically proven',
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
      trend: 'up' as const,
    },
    {
      title: 'Pending Verification',
      value: isLoading ? '...' : String(stats.pendingEvidence),
      changeLabel: 'Awaiting ledger seal',
      icon: <Clock className="h-5 w-5 text-amber-500" />,
      trend: stats.pendingEvidence > 0 ? ('up' as const) : ('down' as const),
    },
    {
      title: 'Total Evidence Tracked',
      value: isLoading ? '...' : String(stats.totalEvidence),
      changeLabel: 'In PostgreSQL',
      icon: <FileText className="h-5 w-5" />,
      trend: 'up' as const,
    },
    {
      title: 'Blockchain Anchors',
      value: isLoading ? '...' : (stats.totalEvidence > 0 ? `${Math.round((stats.verifiedEvidence / stats.totalEvidence) * 100)}%` : '100%'),
      changeLabel: 'Ledger sync integrity',
      icon: <Shield className="h-5 w-5 text-primary-500" />,
      trend: 'up' as const,
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-10 pb-8 sm:pb-12">
      <PageContainer
        title="Auditor Portal"
        description={`Welcome back, ${user.firstName}. Review compliance and integrity data.`}
        actions={<DashboardClock />}
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-6 mb-6 sm:mb-10">
          {statCards.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </div>

        <div className="grid gap-6 sm:gap-8 lg:gap-12 lg:grid-cols-12">
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
              onSearchAssets={() => navigate(ROUTES.ASSETS)}
            />
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
