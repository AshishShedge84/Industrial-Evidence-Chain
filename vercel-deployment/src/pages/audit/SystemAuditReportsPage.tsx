import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageContainer } from '@components/layout';
import { StatCard } from '@components/dashboard/StatCard';
import { Button } from '@components/ui';
import { UserAvatar } from '@components/ui/UserAvatar';
import { useAuth } from '@hooks/useAuth';
import { useApp } from '@context/AppContext';
import { auditLogService } from '@services/audit/auditLogService';
import type { SystemAuditRecord, AuditSummaryMetrics } from '@services/audit/auditLogService';
import {
  buildCsvContent,
  triggerBrowserCsvDownload,
  getStandardReportFilename,
} from '@utils/csvExport';
import type { CsvColumn } from '@utils/csvExport';
import {
  Download,
  Search,
  Filter,
  RotateCw,
  Shield,
  FileText,
  Camera,
  User as UserIcon,
  Box,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Copy,
  Check,
  Calendar,
  ExternalLink,
  Loader2,
  FileSpreadsheet,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Icons mapped to audit action names
const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  EvidenceCreated: FileText,
  MediaAttached: Camera,
  EvidenceSubmitted: Clock,
  EvidenceAnchored: Shield,
  EvidenceVerified: Shield,
  USER_PROFILE_UPDATED: UserIcon,
  Updated: Box,
  Created: Box,
};

export function SystemAuditReportsPage() {
  const { user, hasPermission } = useAuth();
  const { addToast } = useApp();
  const navigate = useNavigate();

  // Role verification: Auditor or Admin required
  const isAuthorized =
    user?.role === 'Auditor' ||
    user?.role === 'Admin' ||
    hasPermission('audit:read') ||
    hasPermission('audit:export');

  // Core Data State
  const [allRecords, setAllRecords] = useState<SystemAuditRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [selectedEntityType, setSelectedEntityType] = useState<string>('all');
  const [selectedActor, setSelectedActor] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState<boolean>(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Detail Modal State
  const [inspectRecord, setInspectRecord] = useState<SystemAuditRecord | null>(null);
  const [copiedId, setCopiedId] = useState<boolean>(false);

  // Export Menu State
  const [isExportMenuOpen, setIsExportMenuOpen] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Fetch Authoritative Audit Records directly from Cloud Firestore
  const fetchRecords = async (showRefreshSpinner = false) => {
    if (showRefreshSpinner) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const res = await auditLogService.getSystemAuditRecords({ forceRefresh: showRefreshSpinner });
      if (res.success && res.data) {
        setAllRecords(res.data);
      } else {
        setError(res.error?.message || 'Failed to retrieve authoritative audit logs.');
      }
    } catch (err: any) {
      setError(err?.message || 'Network error while contacting audit ledger.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchRecords();
    }
  }, [isAuthorized]);

  // Extract unique filter options dynamically from authoritative records
  const availableActions = useMemo(() => {
    const set = new Set<string>();
    allRecords.forEach((r) => r.action && set.add(r.action));
    return Array.from(set).sort();
  }, [allRecords]);

  const availableEntityTypes = useMemo(() => {
    const set = new Set<string>();
    allRecords.forEach((r) => r.entityType && set.add(r.entityType));
    return Array.from(set).sort();
  }, [allRecords]);

  const availableActors = useMemo(() => {
    const set = new Set<string>();
    allRecords.forEach((r) => r.actorName && set.add(r.actorName));
    return Array.from(set).sort();
  }, [allRecords]);

  const availableStatuses = useMemo(() => {
    const set = new Set<string>();
    allRecords.forEach((r) => r.status && set.add(r.status));
    return Array.from(set).sort();
  }, [allRecords]);

  // Filter application
  const filteredRecords = useMemo(() => {
    return allRecords.filter((record) => {
      // 1. Text Search across key fields
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery =
          record.id.toLowerCase().includes(q) ||
          record.action.toLowerCase().includes(q) ||
          record.actorName.toLowerCase().includes(q) ||
          record.actorRole.toLowerCase().includes(q) ||
          (record.referenceId && record.referenceId.toLowerCase().includes(q)) ||
          record.description.toLowerCase().includes(q) ||
          (record.ipAddress && record.ipAddress.toLowerCase().includes(q));

        if (!matchesQuery) return false;
      }

      // 2. Date Range Filter
      if (dateFrom) {
        const fromTime = new Date(`${dateFrom}T00:00:00`).getTime();
        const recordTime = new Date(record.timestamp).getTime();
        if (recordTime < fromTime) return false;
      }
      if (dateTo) {
        const toTime = new Date(`${dateTo}T23:59:59.999`).getTime();
        const recordTime = new Date(record.timestamp).getTime();
        if (recordTime > toTime) return false;
      }

      // 3. Action Filter
      if (selectedAction !== 'all' && record.action !== selectedAction) {
        return false;
      }

      // 4. Entity Type Filter
      if (selectedEntityType !== 'all' && record.entityType !== selectedEntityType) {
        return false;
      }

      // 5. Actor Filter
      if (selectedActor !== 'all' && record.actorName !== selectedActor) {
        return false;
      }

      // 6. Status Filter
      if (selectedStatus !== 'all' && record.status !== selectedStatus) {
        return false;
      }

      return true;
    });
  }, [
    allRecords,
    searchQuery,
    dateFrom,
    dateTo,
    selectedAction,
    selectedEntityType,
    selectedActor,
    selectedStatus,
  ]);

  // Dynamic summary metrics calculated strictly from the filtered dataset
  const metrics: AuditSummaryMetrics = useMemo(() => {
    return auditLogService.calculateSummaryMetrics(filteredRecords);
  }, [filteredRecords]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredRecords.slice(startIndex, startIndex + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    dateFrom,
    dateTo,
    selectedAction,
    selectedEntityType,
    selectedActor,
    selectedStatus,
    pageSize,
  ]);

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    selectedAction !== 'all' ||
    selectedEntityType !== 'all' ||
    selectedActor !== 'all' ||
    selectedStatus !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
    setSelectedAction('all');
    setSelectedEntityType('all');
    setSelectedActor('all');
    setSelectedStatus('all');
  };

  // CSV Export Definition
  const auditCsvColumns: CsvColumn<SystemAuditRecord>[] = [
    { header: 'Audit ID', accessor: (r) => r.id },
    { header: 'Timestamp (ISO)', accessor: (r) => r.timestamp },
    { header: 'Timestamp (Formatted)', accessor: (r) => formatDateTime(r.timestamp) },
    { header: 'Actor Name', accessor: (r) => r.actorName },
    { header: 'Actor Role', accessor: (r) => r.actorRole },
    { header: 'Actor User ID', accessor: (r) => r.userId || '' },
    { header: 'Actor Email', accessor: (r) => r.actorEmail || '' },
    { header: 'Action / Event', accessor: (r) => r.action },
    { header: 'Entity Type', accessor: (r) => r.entityType },
    { header: 'Entity ID', accessor: (r) => r.entityId },
    { header: 'Reference ID', accessor: (r) => r.referenceId },
    { header: 'Status / Result', accessor: (r) => r.status },
    { header: 'IP Address', accessor: (r) => r.ipAddress || '' },
    { header: 'Description', accessor: (r) => r.description },
    {
      header: 'Audit Details Summary',
      accessor: (r) => {
        try {
          return JSON.stringify(r.details);
        } catch {
          return '';
        }
      },
    },
  ];

  const handleExportCsv = (mode: 'filtered' | 'all') => {
    setIsExporting(true);
    setIsExportMenuOpen(false);

    try {
      const recordsToExport = mode === 'filtered' ? filteredRecords : allRecords;

      if (recordsToExport.length === 0) {
        addToast({
          type: 'warning',
          title: 'No Records To Export',
          message: 'The selected export set contains 0 audit events.',
        });
        setIsExporting(false);
        return;
      }

      const csvContent = buildCsvContent(recordsToExport, auditCsvColumns);
      const filename = getStandardReportFilename(
        mode === 'filtered' ? 'IEC_System_Audit_Report_Filtered' : 'IEC_System_Audit_Report_All'
      );

      const result = triggerBrowserCsvDownload(csvContent, filename);

      addToast({
        type: 'success',
        title: 'CSV Report Downloaded',
        message: `Successfully exported ${recordsToExport.length} audit records to ${result.filename}.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Export Failed',
        message: err?.message || 'Unable to generate CSV report file.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Helper formatting for dates
  function formatDateTime(isoString: string): string {
    if (!isoString) return 'N/A';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    } catch {
      return isoString;
    }
  }

  // Access check fallback UI
  if (!isAuthorized) {
    return (
      <PageContainer
        title="System Audit Reports"
        description="Access restricted to authorized Compliance Auditors and Administrators."
      >
        <div className="max-w-xl mx-auto py-16 text-center space-y-4">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Shield className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Auditor Authorization Required
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            System audit trail reports contain immutable operational logs and regulatory records.
            Your current account role does not have permission to view this report.
          </p>
          <Button onClick={() => navigate('/dashboard')} className="mt-4">
            Return to Dashboard
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="System Audit Reports"
      description="Authoritative cryptographic audit log of all industrial evidence, blockchain seals, user operations, and asset events."
      actions={
        <div className="flex items-center gap-2 relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchRecords(true)}
            disabled={isLoading || isRefreshing}
            className="rounded-xl flex items-center gap-1.5"
            title="Refresh from Firestore"
          >
            <RotateCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-primary-500' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          {/* Prominent Download CSV Button with Scope Options */}
          <div className="relative">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              disabled={isLoading || isExporting || allRecords.length === 0}
              className="rounded-xl flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white shadow-sm"
              id="download-csv-button"
            >
              <Download className="h-4 w-4" />
              <span>Download CSV</span>
            </Button>

            <AnimatePresence>
              {isExportMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 4 }}
                  className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-[#121620] border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl p-2 z-50 overflow-hidden"
                >
                  <div className="px-3 py-2 border-b border-black/5 dark:border-white/5 mb-1">
                    <p className="text-xs font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                      Export System Audit Report
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      Actual RFC 4180 CSV with formula injection protection
                    </p>
                  </div>

                  <button
                    onClick={() => handleExportCsv('filtered')}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex flex-col group"
                  >
                    <span className="text-xs font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400">
                      Export Filtered View ({filteredRecords.length} records)
                    </span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                      Respects active date range, search query & filters
                    </span>
                  </button>

                  <button
                    onClick={() => handleExportCsv('all')}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex flex-col group"
                  >
                    <span className="text-xs font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400">
                      Export All Authorised Records ({allRecords.length} records)
                    </span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                      Complete system audit trail available to Auditor
                    </span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      }
    >
      <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
        {/* Dynamic Summary Metrics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          <StatCard
            title="Total Audit Events"
            value={isLoading ? '...' : String(metrics.totalEvents)}
            changeLabel={hasActiveFilters ? 'Filtered view' : 'Authoritative total'}
            icon={<FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary-500" />}
            trend="neutral"
          />
          <StatCard
            title="Evidence Verifications"
            value={isLoading ? '...' : String(metrics.evidenceVerifications)}
            changeLabel="Cryptographically proven"
            icon={<Shield className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500" />}
            trend="up"
          />
          <StatCard
            title="User Operations"
            value={isLoading ? '...' : String(metrics.userActivity)}
            changeLabel="Profile & access events"
            icon={<UserIcon className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-500" />}
            trend="neutral"
          />
          <StatCard
            title="Asset & Evidence Activity"
            value={isLoading ? '...' : String(metrics.assetEvidenceOperations)}
            changeLabel="Creation & media lifecycle"
            icon={<Box className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />}
            trend="up"
          />
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white/80 dark:bg-[#0F1218]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search audit trail by ID, Actor, Action, Reference, or Description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Quick Toggle Filter Panel Button */}
            <div className="flex items-center gap-2">
              <Button
                variant={hasActiveFilters ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                className="rounded-xl flex items-center gap-1.5"
              >
                <Filter className="h-4 w-4" />
                <span>Filters</span>
                {hasActiveFilters && (
                  <span className="ml-1 px-1.5 py-0.2 bg-white/20 text-white rounded-full text-[10px]">
                    Active
                  </span>
                )}
              </Button>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="rounded-xl text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* Expandable Filter Controls */}
          <AnimatePresence>
            {isFilterPanelOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="pt-3 border-t border-black/5 dark:border-white/5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
              >
                {/* Date From */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    From Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    />
                  </div>
                </div>

                {/* Date To */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    To Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    />
                  </div>
                </div>

                {/* Action Type Dropdown */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Action / Event
                  </label>
                  <select
                    value={selectedAction}
                    onChange={(e) => setSelectedAction(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option value="all">All Actions ({allRecords.length})</option>
                    {availableActions.map((act) => (
                      <option key={act} value={act}>
                        {act}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Entity Type Dropdown */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Entity Type
                  </label>
                  <select
                    value={selectedEntityType}
                    onChange={(e) => setSelectedEntityType(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option value="all">All Entities</option>
                    {availableEntityTypes.map((ent) => (
                      <option key={ent} value={ent}>
                        {ent}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Actor Dropdown */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Actor
                  </label>
                  <select
                    value={selectedActor}
                    onChange={(e) => setSelectedActor(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option value="all">All Actors</option>
                    {availableActors.map((actor) => (
                      <option key={actor} value={actor}>
                        {actor}
                      </option>
                    ))}
                  </select>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Audit Log Table Container */}
        <div className="bg-white/80 dark:bg-[#0F1218]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
          {/* Header Row with Active Count and Page Size Selector */}
          <div className="px-5 py-4 border-b border-black/5 dark:border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-900 dark:text-white">
                Audit Trail Events
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-400">
                {filteredRecords.length} records
                {filteredRecords.length !== allRecords.length && ` (of ${allRecords.length})`}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span>Show:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-gray-50 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-2 py-1 text-xs text-gray-900 dark:text-white focus:outline-none"
              >
                <option value={10}>10 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>
            </div>
          </div>

          {/* Loading, Error, or Table Content */}
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Loading immutable audit logs from Firestore...
              </p>
            </div>
          ) : error ? (
            <div className="p-8 text-center space-y-3">
              <AlertTriangle className="h-8 w-8 text-rose-500 mx-auto" />
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{error}</p>
              <Button size="sm" onClick={() => fetchRecords(true)}>
                Retry
              </Button>
            </div>
          ) : paginatedRecords.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-gray-100 dark:bg-white/5 mx-auto flex items-center justify-center text-gray-400">
                <FileText className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                No Audit Records Found
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                {hasActiveFilters
                  ? 'No audit events match the active search and filter criteria. Try clearing filters.'
                  : 'No audit records have been committed to the Firestore audit ledger.'}
              </p>
              {hasActiveFilters && (
                <Button size="sm" variant="outline" onClick={resetFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] text-gray-400 uppercase font-semibold text-[10px] tracking-wider">
                    <th className="px-5 py-3">Timestamp</th>
                    <th className="px-5 py-3">Actor</th>
                    <th className="px-5 py-3">Action / Event</th>
                    <th className="px-5 py-3">Entity / Reference</th>
                    <th className="px-5 py-3">Result / Status</th>
                    <th className="px-5 py-3">Description</th>
                    <th className="px-4 py-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                  {paginatedRecords.map((record) => {
                    const ActionIcon = ACTION_ICONS[record.action] || ActivityIconFallback;
                    const isVerification =
                      record.action === 'EvidenceVerified' ||
                      record.action.toLowerCase().includes('verif');

                    return (
                      <tr
                        key={record.id}
                        className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group cursor-pointer"
                        onClick={() => setInspectRecord(record)}
                      >
                        {/* Timestamp */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {formatDateTime(record.timestamp)}
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                            {record.ipAddress || '127.0.0.1'}
                          </div>
                        </td>

                        {/* Actor */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 flex items-center justify-center font-bold text-[11px] shrink-0">
                              {record.actorName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                                <span>{record.actorName}</span>
                              </div>
                              <div className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md text-[10px] font-medium bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 mt-0.5">
                                {record.actorRole}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Action / Event */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                              isVerification
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                                : record.action === 'MediaAttached'
                                ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400'
                                : record.action.includes('USER')
                                ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400'
                                : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            <ActionIcon className="h-3 w-3" />
                            {record.action}
                          </span>
                        </td>

                        {/* Entity / Reference */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="text-gray-900 dark:text-white font-medium">
                            {record.entityType}
                          </div>
                          {record.referenceId && (
                            <div className="text-[10px] text-gray-400 font-mono mt-0.5 flex items-center gap-1">
                              <span>Ref: {record.referenceId.slice(0, 10)}...</span>
                            </div>
                          )}
                        </td>

                        {/* Result / Status */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium capitalize ${
                              record.status.toLowerCase().includes('verif') ||
                              record.status.toLowerCase() === 'success' ||
                              record.status.toLowerCase() === 'active'
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                                : record.status.toLowerCase() === 'pending'
                                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400'
                            }`}
                          >
                            {record.status.toLowerCase().includes('verif') && (
                              <CheckCircle2 className="h-3 w-3" />
                            )}
                            {record.status}
                          </span>
                        </td>

                        {/* Description */}
                        <td className="px-5 py-3.5 min-w-[260px] max-w-[420px]">
                          <p className="text-gray-600 dark:text-gray-300 text-xs leading-relaxed line-clamp-2">
                            {record.description}
                          </p>
                        </td>

                        {/* Inspect action */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setInspectRecord(record);
                            }}
                            className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors"
                            title="Inspect Audit Event Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {!isLoading && filteredRecords.length > 0 && (
            <div className="px-5 py-4 border-t border-black/5 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
              <div>
                Showing{' '}
                <span className="font-semibold text-gray-900 dark:text-white">
                  {(currentPage - 1) * pageSize + 1}
                </span>{' '}
                to{' '}
                <span className="font-semibold text-gray-900 dark:text-white">
                  {Math.min(currentPage * pageSize, filteredRecords.length)}
                </span>{' '}
                of{' '}
                <span className="font-semibold text-gray-900 dark:text-white">
                  {filteredRecords.length}
                </span>{' '}
                entries
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-xl px-2.5 py-1"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>

                <span className="px-3 py-1 font-medium text-gray-900 dark:text-white text-xs">
                  Page {currentPage} of {totalPages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-xl px-2.5 py-1"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Audit Record Inspection Modal */}
      <AnimatePresence>
        {inspectRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => setInspectRecord(null)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-2xl bg-white dark:bg-[#11141c] border border-black/10 dark:border-white/10 rounded-3xl shadow-2xl p-6 sm:p-7 max-h-[90vh] overflow-y-auto space-y-5"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 border-b border-black/5 dark:border-white/5 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-400">
                      {inspectRecord.action}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">
                      {inspectRecord.entityType}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                    System Audit Event Record
                  </h3>
                </div>
                <button
                  onClick={() => setInspectRecord(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-full hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Core Information Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Audit ID */}
                <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-2xl">
                  <span className="text-gray-400 font-semibold block uppercase text-[10px] tracking-wider mb-1">
                    Audit Log ID
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-gray-900 dark:text-white truncate">
                      {inspectRecord.id}
                    </span>
                    <button
                      onClick={() => copyToClipboard(inspectRecord.id)}
                      className="text-gray-400 hover:text-primary-600 shrink-0"
                      title="Copy ID"
                    >
                      {copiedId ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Timestamp */}
                <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-2xl">
                  <span className="text-gray-400 font-semibold block uppercase text-[10px] tracking-wider mb-1">
                    Timestamp
                  </span>
                  <span className="font-mono text-gray-900 dark:text-white">
                    {formatDateTime(inspectRecord.timestamp)}
                  </span>
                </div>

                {/* Actor */}
                <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-2xl">
                  <span className="text-gray-400 font-semibold block uppercase text-[10px] tracking-wider mb-1">
                    Actor Name & Role
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {inspectRecord.actorName} ({inspectRecord.actorRole})
                  </span>
                  {inspectRecord.actorEmail && (
                    <span className="text-gray-400 block text-[11px]">
                      {inspectRecord.actorEmail}
                    </span>
                  )}
                </div>

                {/* IP Address */}
                <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-2xl">
                  <span className="text-gray-400 font-semibold block uppercase text-[10px] tracking-wider mb-1">
                    IP Address & Origin
                  </span>
                  <span className="font-mono text-gray-900 dark:text-white">
                    {inspectRecord.ipAddress || '127.0.0.1'}
                  </span>
                </div>
              </div>

              {/* Event Description */}
              <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl space-y-1">
                <span className="text-gray-400 font-semibold block uppercase text-[10px] tracking-wider">
                  Event Description
                </span>
                <p className="text-sm text-gray-900 dark:text-white leading-relaxed">
                  {inspectRecord.description}
                </p>
              </div>

              {/* Reference Links if entity is Evidence or Asset */}
              {inspectRecord.referenceId && (
                <div className="flex items-center justify-between p-3.5 bg-primary-50/50 dark:bg-primary-950/20 border border-primary-200/50 dark:border-primary-800/30 rounded-2xl text-xs">
                  <div>
                    <span className="font-semibold text-primary-900 dark:text-primary-300 block">
                      Associated {inspectRecord.referenceType?.toUpperCase() || 'RECORD'}
                    </span>
                    <span className="font-mono text-primary-700 dark:text-primary-400 text-[11px]">
                      {inspectRecord.referenceId}
                    </span>
                  </div>

                  {inspectRecord.referenceType === 'evidence' ? (
                    <Link
                      to={`/evidence/${inspectRecord.referenceId}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium text-xs shadow-sm transition-colors"
                    >
                      <span>View Evidence</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  ) : inspectRecord.referenceType === 'asset' ? (
                    <Link
                      to={`/assets/${inspectRecord.referenceId}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium text-xs shadow-sm transition-colors"
                    >
                      <span>View Asset</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  ) : null}
                </div>
              )}

              {/* Raw Sanitized Event Payload */}
              <div className="space-y-1.5">
                <span className="text-gray-400 font-semibold block uppercase text-[10px] tracking-wider">
                  Audit Metadata & Cryptographic Proof Details
                </span>
                <pre className="p-4 bg-black/90 text-gray-200 rounded-2xl font-mono text-[11px] overflow-x-auto max-h-56 leading-relaxed border border-white/5">
                  {JSON.stringify(inspectRecord.details, null, 2)}
                </pre>
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-black/5 dark:border-white/5 flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setInspectRecord(null)}>
                  Close
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageContainer>
  );
}

function ActivityIconFallback({ className }: { className?: string }) {
  return <FileText className={className} />;
}
