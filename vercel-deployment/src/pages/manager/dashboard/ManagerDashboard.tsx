import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@components/layout';
import { StatCard, RecentActivity, DashboardClock } from '@components/dashboard';
import { Box, FileText, ShieldCheck, Clock, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';
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
    pendingVerification: 0,
    integrityMismatches: 0,
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

        // Real counts from backend PostgreSQL state
        const verified = evidence.filter((e: any) => e.verificationStatus === 'VERIFIED');
        const pending = evidence.filter(
          (e: any) =>
            (e.verificationStatus === 'PENDING_VERIFICATION' || !e.verificationStatus) &&
            e.anchorStatus === 'Anchored'
        );
        const mismatches = evidence.filter((e: any) => e.verificationStatus === 'INTEGRITY_MISMATCH');

        setStats({
          totalAssets: assetsRes.success && assetsRes.data?.total !== undefined ? assetsRes.data.total : assets.length,
          totalEvidence: evidenceRes.success && evidenceRes.data?.total !== undefined ? evidenceRes.data.total : evidence.length,
          verifiedEvidence: verified.length,
          pendingVerification: pending.length,
          integrityMismatches: mismatches.length,
        });

        // Map real backend activities
        const mapped = evidence.slice(0, 6).map((e: any) => {
          let actType: any = 'evidence_submitted';
          if (e.verificationStatus === 'VERIFIED') actType = 'evidence_verified';
          else if (e.verificationStatus === 'INTEGRITY_MISMATCH') actType = 'verification_failed';

          return {
            id: e.evidenceId,
            type: actType,
            title: `${(ACTIVITY_TYPE_LABELS as any)[e.activityType] || e.activityType || 'Evidence'} · ${e.assetName || e.assetCode || 'Asset'}`,
            description: typeof e.description === 'string' && e.description ? e.description : `Submitted by ${e.userName || 'Technician'}`,
            timestamp: e.timestamp || e.createdAt,
            assetId: e.assetId,
            evidenceId: e.evidenceId,
            status: typeof e.verificationStatus === 'string' ? e.verificationStatus : (typeof e.anchorStatus === 'string' ? e.anchorStatus : 'Submitted'),
            activityType: e.activityType,
            userName: e.userName,
          };
        });

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
      changeLabel: 'View equipment fleet',
      icon: <Box className="h-5 w-5 text-primary-600" />,
      trend: 'up' as const,
      onClick: () => navigate(ROUTES.ASSETS),
      className: 'cursor-pointer hover:border-primary-500/30 transition-all active:scale-[0.99]',
      role: 'button',
      tabIndex: 0,
    },
    {
      title: 'Total Evidence Records',
      value: isLoading ? '...' : String(stats.totalEvidence),
      changeLabel: 'Chain-anchored telemetry',
      icon: <FileText className="h-5 w-5 text-blue-500" />,
      trend: 'up' as const,
      onClick: () => navigate(ROUTES.VERIFICATION),
      className: 'cursor-pointer hover:border-blue-500/30 transition-all active:scale-[0.99]',
      role: 'button',
      tabIndex: 0,
    },
    {
      title: 'Pending Verification',
      value: isLoading ? '...' : String(stats.pendingVerification),
      changeLabel: stats.pendingVerification > 0 ? 'Requires manager review' : 'All caught up',
      icon: <Clock className="h-5 w-5 text-amber-500" />,
      trend: stats.pendingVerification > 0 ? ('down' as const) : ('up' as const),
      onClick: () => navigate(ROUTES.VERIFICATION),
      className: `cursor-pointer transition-all active:scale-[0.99] ${
        stats.pendingVerification > 0
          ? 'ring-2 ring-amber-500/30 border-amber-500/40 bg-amber-50/20 dark:bg-amber-950/10'
          : 'hover:border-amber-500/30'
      }`,
      role: 'button',
      tabIndex: 0,
    },
    {
      title: 'Verified Reports',
      value: isLoading ? '...' : String(stats.verifiedEvidence),
      changeLabel: 'Cryptographically sealed',
      icon: <ShieldCheck className="h-5 w-5 text-emerald-500" />,
      trend: 'up' as const,
      onClick: () => navigate('/verification?tab=verified'),
      className: 'cursor-pointer hover:border-emerald-500/30 transition-all active:scale-[0.99]',
      role: 'button',
      tabIndex: 0,
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-10 pb-8 sm:pb-12">
      <PageContainer
        title="Operations Manager Portal"
        description={`Welcome back, ${user.firstName || user.fullName || 'Manager'}. Review your operational workload and pending verification queue.`}
        actions={<DashboardClock />}
      >
        {/* Top Metric Cards — All Clickable and Role-Specific */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-6 mb-6 sm:mb-10 w-full">
          {statCards.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </div>

        <div className="grid gap-6 sm:gap-8 lg:gap-12 lg:grid-cols-12">
          {/* Recent Operational Activity */}
          <div className="lg:col-span-8">
            <RecentActivity
              activities={recentActivities}
              onViewAsset={(id) => navigate(ROUTES.ASSET_DETAILS(id))}
              onViewEvidence={(id) => navigate(ROUTES.EVIDENCE_DETAILS(id))}
            />
          </div>

          {/* Manager-Specific Quick Actions */}
          <div className="lg:col-span-4">
            <div className="w-full">
              <h3 className="text-base sm:text-[17px] font-semibold text-gray-900 dark:text-white tracking-tight mb-3.5 sm:mb-6 px-1">
                Operational Actions
              </h3>
              <div className="flex flex-col gap-2.5 sm:gap-4">
                {/* Primary Action: Review Pending Verification */}
                <button
                  onClick={() => navigate(ROUTES.VERIFICATION)}
                  className="w-full group flex items-center p-3.5 sm:p-5 rounded-2xl sm:rounded-[24px] transition-all duration-300 text-left bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-black dark:hover:bg-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:-translate-y-0.5 relative overflow-hidden"
                >
                  <div className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 rounded-xl sm:rounded-[18px] flex items-center justify-center mr-3 sm:mr-4 bg-white/10 dark:bg-gray-900/10 text-white dark:text-gray-900">
                    <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400 dark:text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm sm:text-[15px] font-semibold tracking-tight">
                        Review Pending Verification
                      </p>
                      {stats.pendingVerification > 0 && (
                        <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-amber-500 text-black">
                          {stats.pendingVerification}
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-[13px] mt-0.5 text-white/70 dark:text-gray-600 truncate">
                      Inspect technician evidence & execute verification
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 ml-2 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </button>

                {/* View Assets */}
                <button
                  onClick={() => navigate(ROUTES.ASSETS)}
                  className="w-full group flex items-center p-3.5 sm:p-5 rounded-2xl sm:rounded-[24px] transition-all duration-300 text-left bg-white/70 dark:bg-[#0F1218]/70 backdrop-blur-xl border border-black/5 dark:border-white/10 hover:border-black/15 dark:hover:border-white/20 shadow-sm hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 rounded-xl sm:rounded-[18px] flex items-center justify-center mr-3 sm:mr-4 bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400">
                    <Box className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-[15px] font-semibold text-gray-900 dark:text-white tracking-tight">
                      Operational Assets
                    </p>
                    <p className="text-xs sm:text-[13px] mt-0.5 text-gray-500 dark:text-gray-400 truncate">
                      Browse and monitor {stats.totalAssets} equipment units
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 ml-2 text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white group-hover:translate-x-1 transition-all" />
                </button>

                {/* View Verification History */}
                <button
                  onClick={() => navigate('/verification?tab=verified')}
                  className="w-full group flex items-center p-3.5 sm:p-5 rounded-2xl sm:rounded-[24px] transition-all duration-300 text-left bg-white/70 dark:bg-[#0F1218]/70 backdrop-blur-xl border border-black/5 dark:border-white/10 hover:border-black/15 dark:hover:border-white/20 shadow-sm hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 rounded-xl sm:rounded-[18px] flex items-center justify-center mr-3 sm:mr-4 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-[15px] font-semibold text-gray-900 dark:text-white tracking-tight">
                      Verification History
                    </p>
                    <p className="text-xs sm:text-[13px] mt-0.5 text-gray-500 dark:text-gray-400 truncate">
                      Audit past verification records & ledger seals
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 ml-2 text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white group-hover:translate-x-1 transition-all" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
