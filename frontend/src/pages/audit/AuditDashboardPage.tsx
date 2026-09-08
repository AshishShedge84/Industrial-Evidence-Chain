import { useState, useMemo } from 'react';
import { PageContainer } from '@components/layout';
import { Badge, Button } from '@components/ui';
import { ChevronRight, FileText, Shield, Download, Filter, Search, AlertTriangle, CheckCircle, XCircle, X } from 'lucide-react';
import { db } from '@mocks/db';
import type { AuditTrailEntry } from '@type-defs/verification';
import { motion, AnimatePresence } from 'framer-motion';

const actionIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  EvidenceCreated: FileText,
  MediaUploaded: FileText,
  EvidenceSubmitted: Shield,
  EvidenceAnchored: Shield,
  EvidenceVerified: CheckCircle,
  EvidenceRejected: XCircle,
  EvidenceModified: AlertTriangle,
  MediaDeleted: AlertTriangle,
  StatusChanged: AlertTriangle,
  AccessGranted: Shield,
  AccessRevoked: XCircle,
  AssetRegistered: FileText,
  AssetUpdated: FileText,
  AssetDeleted: XCircle,
  UserRegistered: FileText,
  UserApproved: CheckCircle,
  UserRejected: XCircle,
  UserSuspended: AlertTriangle,
  UserUpdated: FileText,
  ProfileUpdated: FileText,
  PasswordChanged: Shield,
};

export function AuditDashboardPage() {
  const [logs] = useState<AuditTrailEntry[]>(() => db.getAuditLogs());
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterEvent, setFilterEvent] = useState('');
  const [filterActor, setFilterActor] = useState('');
  const [filterEvidenceId, setFilterEvidenceId] = useState('');
  
  // Detail Modal state
  const [selectedLog, setSelectedLog] = useState<AuditTrailEntry | null>(null);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Search
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        log.id.toLowerCase().includes(searchLower) ||
        log.action.toLowerCase().includes(searchLower) ||
        log.performedBy.toLowerCase().includes(searchLower) ||
        (log.evidenceId && log.evidenceId.toLowerCase().includes(searchLower)) ||
        JSON.stringify(log.details).toLowerCase().includes(searchLower);

      // Filters
      const matchesEvent = !filterEvent || log.action === filterEvent;
      const matchesActor = !filterActor || log.performedBy.toLowerCase().includes(filterActor.toLowerCase());
      const matchesEvidence = !filterEvidenceId || (log.evidenceId && log.evidenceId.toLowerCase().includes(filterEvidenceId.toLowerCase()));

      return matchesSearch && matchesEvent && matchesActor && matchesEvidence;
    });
  }, [logs, searchQuery, filterEvent, filterActor, filterEvidenceId]);

  const uniqueEvents = useMemo(() => Array.from(new Set(logs.map(l => l.action))), [logs]);

  const exportCSV = () => {
    const headers = ['Audit ID', 'Event', 'Evidence Reference', 'Actor', 'Timestamp', 'Details'];
    const rows = filteredLogs.map(log => [
      log.id,
      log.action,
      log.evidenceId || '',
      log.performedBy,
      log.performedAt,
      JSON.stringify(log.details).replace(/"/g, '""') // escape quotes
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `IEC_Audit_Log_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <PageContainer
      title="System Audit Log"
      description="Immutable cryptographic record of all evidence activities and access events."
    >
      <div className="max-w-[1400px] mx-auto pb-12">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 relative">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by ID, User, or Action..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 dark:focus:border-primary-500 transition-all text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto relative">
            <Button variant="outline" className="flex-1 sm:flex-none rounded-xl" onClick={() => setIsFilterOpen(!isFilterOpen)}>
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button variant="outline" className="flex-1 sm:flex-none rounded-xl" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>

            <AnimatePresence>
              {isFilterOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full right-0 mt-2 w-72 bg-white/90 dark:bg-[#1a1f2e]/90 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-xl shadow-xl p-4 z-50"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">Filters</h3>
                    <button onClick={() => setIsFilterOpen(false)}><X className="h-4 w-4 text-gray-500" /></button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Event Type</label>
                      <select 
                        value={filterEvent}
                        onChange={e => setFilterEvent(e.target.value)}
                        className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-white"
                      >
                        <option value="">All Events</option>
                        {uniqueEvents.map(ev => <option key={ev as string} value={ev as string}>{ev as string}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Actor</label>
                      <input 
                        type="text" 
                        value={filterActor}
                        onChange={e => setFilterActor(e.target.value)}
                        className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-white"
                        placeholder="Actor ID or Name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Evidence ID</label>
                      <input 
                        type="text" 
                        value={filterEvidenceId}
                        onChange={e => setFilterEvidenceId(e.target.value)}
                        className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-white"
                        placeholder="EV-..."
                      />
                    </div>
                    
                    <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                      <Button variant="outline" size="sm" className="w-full" onClick={() => {
                        setFilterEvent('');
                        setFilterActor('');
                        setFilterEvidenceId('');
                      }}>
                        Clear
                      </Button>
                      <Button variant="primary" size="sm" className="w-full" onClick={() => setIsFilterOpen(false)}>
                        Apply
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-[#0F1218]/70 backdrop-blur-xl rounded-[32px] border border-black/5 dark:border-white/10 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-black/5">
                  <th className="py-5 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-widest">Event</th>
                  <th className="py-4 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-widest hidden sm:table-cell">Evidence Ref</th>
                  <th className="py-4 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-widest hidden lg:table-cell">Details</th>
                  <th className="py-4 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-widest">Actor</th>
                  <th className="py-4 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-widest text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/80">
                {filteredLogs.map((entry) => {
                  const Icon = actionIcons[entry.action] || FileText;
                  const detailString = entry.details ? Object.entries(entry.details).map(([k, v]) => `${k}: ${v}`).join(', ') : '';
                  const severity = (entry as any).severity || 'info';

                  return (
                    <tr key={entry.id} onClick={() => setSelectedLog(entry)} className="hover:bg-gray-50/80 transition-colors group cursor-pointer">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-4">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                            severity === 'success' ? 'bg-emerald-50 text-emerald-600' :
                            severity === 'warning' ? 'bg-amber-50 text-amber-600' :
                            severity === 'error' ? 'bg-red-50 text-red-600' :
                            'bg-blue-50 text-blue-600'
                          }`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{String(entry.action).replace(/([A-Z])/g, ' $1').trim()}</p>
                            <p className="text-[13px] text-gray-500 font-mono mt-0.5">{entry.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 hidden sm:table-cell">
                        {entry.evidenceId && entry.evidenceId !== 'N/A' && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[13px] font-mono font-medium bg-gray-100 text-gray-700">
                            {entry.evidenceId}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 hidden lg:table-cell">
                        <p className="text-[13px] text-gray-600 truncate max-w-[200px] xl:max-w-[400px]">
                          {detailString || <span className="text-gray-400 italic">No additional details</span>}
                        </p>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{entry.performedBy}</p>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <div>
                            <p className="text-sm text-gray-900 dark:text-gray-100">
                              {new Date(entry.performedAt).toLocaleDateString()}
                            </p>
                            <p className="text-[13px] text-gray-500 mt-0.5 font-mono">
                              {new Date(entry.performedAt).toLocaleTimeString()}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-600 transition-colors hidden sm:block" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setSelectedLog(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white/90 dark:bg-[#1a1f2e]/90 backdrop-blur-2xl rounded-3xl shadow-2xl p-6 border border-white/20 dark:border-white/10"
            >
              <button 
                onClick={() => setSelectedLog(null)}
                className="absolute top-4 right-4 p-2 bg-gray-100/50 hover:bg-gray-200/50 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>

              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-3">
                <Shield className="h-6 w-6 text-primary-500" />
                Audit Detail
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2 py-3 border-b border-gray-100">
                  <span className="text-gray-500 text-sm font-medium">Audit ID</span>
                  <span className="col-span-2 text-gray-900 dark:text-gray-100 font-mono text-sm">{selectedLog.id}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 py-3 border-b border-gray-100">
                  <span className="text-gray-500 text-sm font-medium">Event</span>
                  <span className="col-span-2 text-gray-900 dark:text-gray-100 font-medium">{String(selectedLog.action).replace(/([A-Z])/g, ' $1').trim()}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 py-3 border-b border-gray-100">
                  <span className="text-gray-500 text-sm font-medium">Actor</span>
                  <span className="col-span-2 text-gray-900 dark:text-gray-100 font-medium">{selectedLog.performedBy}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 py-3 border-b border-gray-100">
                  <span className="text-gray-500 text-sm font-medium">Evidence Ref</span>
                  <span className="col-span-2 text-gray-900 dark:text-gray-100 font-mono text-sm">{selectedLog.evidenceId || 'N/A'}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 py-3 border-b border-gray-100">
                  <span className="text-gray-500 text-sm font-medium">Timestamp</span>
                  <span className="col-span-2 text-gray-900 dark:text-gray-100 font-mono text-sm">{new Date(selectedLog.performedAt).toLocaleString()}</span>
                </div>
                
                {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                  <div className="pt-2">
                    <span className="block text-gray-500 text-sm font-medium mb-2">Details</span>
                    <pre className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 text-xs font-mono text-gray-700 dark:text-gray-300 overflow-x-auto border border-gray-100 dark:border-white/10">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageContainer>
  );
}