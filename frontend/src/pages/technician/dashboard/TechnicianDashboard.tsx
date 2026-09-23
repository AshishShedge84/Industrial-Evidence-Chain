import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@components/layout';
import { StatCard, RecentActivity, QuickActions, DashboardClock } from '@components/dashboard';
import { Box, Camera, Shield, FileText, CheckCircle2, Clock } from 'lucide-react';
import { ROUTES } from '@constants/routes';
import { assetService } from '@services/assets/assetService';
import { evidenceService } from '@services/evidence/evidenceService';
import { ACTIVITY_TYPE_LABELS } from '@constants/activityTypes';
import type { User } from '@type-defs/auth';

export function TechnicianDashboard({ user }: { user: User }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    myEvidence: 0,
    verifiedEvidence: 0,
    pendingEvidence: 0,
    totalAssets: 0,
  });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchTechnicianData = async () => {
      setIsLoading(true);
      try {
        const [assetsRes, evidenceRes] = await Promise.all([
          assetService.getAssets({ pageSize: 100 }),
          evidenceService.getEvidenceList({ pageSize: 100 }),
        ]);

        if (!isMounted) return;

        const allAssets = assetsRes.success && assetsRes.data ? assetsRes.data.items : [];
        const allEvidence = evidenceRes.success && evidenceRes.data ? evidenceRes.data.items : [];

        // Genuine metrics for this technician
        const myEvidence = allEvidence.filter((e: any) => e.userId === user.id);
        const myVerified = myEvidence.filter((e: any) => e.status === 'Verified' || e.status === 'Anchored');
        const myPending = myEvidence.filter((e: any) => e.status === 'Draft' || e.status === 'Submitted');

        setStats({
          myEvidence: myEvidence.length,
          verifiedEvidence: myVerified.length,
          pendingEvidence: myPending.length,
          totalAssets: allAssets.length,
        });

        const mappedActivities = myEvidence.slice(0, 5).map((e: any) => ({
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

        setRecentActivities(mappedActivities);
      } catch (err) {
        console.error('Failed to load technician dashboard data', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchTechnicianData();
    return () => { isMounted = false; };
  }, [user.id]);

  const statCards = [
    {
      title: 'My Uploaded Evidence',
      value: isLoading ? '...' : String(stats.myEvidence),
      changeLabel: 'Created by you',
      icon: <Camera className="h-5 w-5" />,
      trend: 'up' as const,
    },
    {
      title: 'Verified on Chain',
      value: isLoading ? '...' : String(stats.verifiedEvidence),
      changeLabel: 'Ledger anchored',
      icon: <Shield className="h-5 w-5 text-emerald-500" />,
      trend: 'up' as const,
    },
    {
      title: 'Pending Sealing',
      value: isLoading ? '...' : String(stats.pendingEvidence),
      changeLabel: 'Draft / Submitted',
      icon: <Clock className="h-5 w-5 text-amber-500" />,
      trend: stats.pendingEvidence > 0 ? ('up' as const) : ('down' as const),
    },
    {
      title: 'Available Assets',
      value: isLoading ? '...' : String(stats.totalAssets),
      changeLabel: 'Active in system',
      icon: <Box className="h-5 w-5" />,
      trend: 'up' as const,
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-10 lg:space-y-12 pb-8 sm:pb-12">
      <PageContainer
        title="Technician Portal"
        description={`Welcome back, ${user.firstName}. Ready for field operations.`}
        actions={<DashboardClock />}
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-10">
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
