import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@components/layout';
import { StatCard, RecentActivity, QuickActions, DashboardClock } from '@components/dashboard';
import { Shield, Users, Box, FileText } from 'lucide-react';
import { ROUTES } from '@constants/routes';
import { adminService } from '@services/admin/adminService';
import { assetService } from '@services/assets/assetService';
import { evidenceService } from '@services/evidence/evidenceService';
import type { User } from '@type-defs/auth';

export function AdminDashboard({ user }: { user: User }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalAccounts: 0,
    pendingApprovals: 0,
    totalAssets: 0,
    totalEvidence: 0,
  });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchAdminData = async () => {
      setIsLoading(true);
      try {
        const [usersRes, assetsRes, evidenceRes, auditRes] = await Promise.all([
          adminService.getUsers(),
          assetService.getAssets({ pageSize: 1 }),
          evidenceService.getEvidenceList({ pageSize: 1 }),
          adminService.getAuditLogs(10),
        ]);

        if (!isMounted) return;

        const usersList = usersRes.success && usersRes.data ? usersRes.data : [];
        const pending = usersList.filter((u) => u.status === 'pending' || (u as any).isActive === false);

        setStats({
          totalAccounts: usersList.length,
          pendingApprovals: pending.length,
          totalAssets: assetsRes.success && assetsRes.data ? assetsRes.data.total : 0,
          totalEvidence: evidenceRes.success && evidenceRes.data ? evidenceRes.data.total : 0,
        });

        if (auditRes.success && auditRes.data && auditRes.data.length > 0) {
          const mapped = auditRes.data.slice(0, 5).map((log: any) => ({
            id: log.id,
            type: log.action.includes('Evidence') ? 'evidence_submitted' : 'asset_created',
            title: `${log.performedBy} — ${log.action.replace(/([A-Z])/g, ' $1').trim()}`,
            description: log.details || (log.entityType ? `${log.entityType}: ${log.entityId}` : 'System event'),
            timestamp: log.performedAt,
            evidenceId: log.entityType === 'EvidenceRecord' ? log.entityId : undefined,
            assetId: log.entityType === 'Asset' ? log.entityId : undefined,
          }));
          setRecentActivities(mapped);
        }
      } catch (err) {
        console.error('Failed to load admin dashboard data', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchAdminData();
    return () => { isMounted = false; };
  }, []);

  const statCards = [
    {
      title: 'Total Accounts',
      value: isLoading ? '...' : String(stats.totalAccounts),
      changeLabel: 'Registered users',
      icon: <Users className="h-5 w-5" />,
      trend: 'up' as const,
    },
    {
      title: 'Pending Approvals',
      value: isLoading ? '...' : String(stats.pendingApprovals),
      changeLabel: 'Action required',
      icon: <Shield className="h-5 w-5 text-amber-500" />,
      trend: stats.pendingApprovals > 0 ? ('up' as const) : ('down' as const),
    },
    {
      title: 'Tracked Assets',
      value: isLoading ? '...' : String(stats.totalAssets),
      changeLabel: 'Total in PostgreSQL',
      icon: <Box className="h-5 w-5 text-primary-500" />,
      trend: 'up' as const,
    },
    {
      title: 'Sealed Evidence',
      value: isLoading ? '...' : String(stats.totalEvidence),
      changeLabel: 'Ledger records',
      icon: <FileText className="h-5 w-5 text-emerald-500" />,
      trend: 'up' as const,
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-10 pb-8 sm:pb-12">
      <PageContainer
        title="Admin Portal"
        description={`Welcome back, ${user.firstName}. System administration and user management.`}
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
              onManageUsers={() => navigate('/admin/users')}
              onSystemSettings={() => navigate('/settings')}
            />
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
