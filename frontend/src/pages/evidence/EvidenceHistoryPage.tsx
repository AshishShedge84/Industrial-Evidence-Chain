import { useParams, Link as RouterLink } from 'react-router-dom';
import { PageContainer } from '@components/layout';
import { Badge } from '@components/ui';
import { Button } from '@components/ui';
import { ChevronRight, Calendar, Tag, Box, Shield, Camera, MapPin, Eye } from 'lucide-react';
import type { EvidenceStatus, ActivityType } from '@type-defs/evidence';
import { ACTIVITY_TYPE_LABELS, ACTIVITY_TYPE_ICONS } from '@constants/activityTypes';
import { EVIDENCE_STATUS_COLORS } from '@constants/evidenceStatus';
import { formatDate } from '@utils/date';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import type { Evidence } from '@type-defs/evidence';
import { evidenceService } from '@services/evidence/evidenceService';
export function EvidenceHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchEvidence = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const res = await evidenceService.getEvidenceList({ assetId: id });
        if (isMounted) {
          if (res.success && res.data) {
            setEvidenceList(res.data.items);
          } else {
            setError(res.error?.message || 'Failed to fetch evidence');
          }
        }
      } catch (err) {
        if (isMounted) {
          setError('Failed to fetch evidence');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    fetchEvidence();
    return () => { isMounted = false; };
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-64 items-center justify-center gap-4">
        <p className="text-error-600 font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-12">
      <PageContainer
        title="Evidence Ledger"
        description={`Immutable evidence record for Asset ${id}`}
        breadcrumbs={[
          { label: 'Assets', href: '/assets' },
          { label: `Asset ${id}`, href: `/assets/${id}` },
          { label: 'Evidence Ledger' },
        ]}
      >
        <div className="max-w-5xl space-y-6">
          {evidenceList.map((evidence, index) => {
            const Icon = ACTIVITY_TYPE_ICONS[evidence.activityType] || Shield;
            
            return (
              <div 
                key={evidence.evidenceId} 
                className="group flex flex-col md:flex-row bg-white rounded-3xl border border-black/[0.03] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] p-6 md:p-8 gap-6 md:gap-8 transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                {/* Left Section: Icon & Identity */}
                <div className="md:w-64 shrink-0 flex flex-col items-start gap-4 border-b md:border-b-0 md:border-r border-black/5 pb-6 md:pb-0 md:pr-8">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-primary-50 flex items-center justify-center shrink-0">
                      <Icon className="h-6 w-6 text-primary-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[16px] text-gray-900 tracking-tight">{ACTIVITY_TYPE_LABELS[evidence.activityType]}</h4>
                      <p className="text-[13px] text-gray-500 font-medium font-mono mt-0.5">{evidence.evidenceId}</p>
                    </div>
                  </div>
                  
                  <Badge className={`${EVIDENCE_STATUS_COLORS[evidence.status]} px-3 py-1 text-[11px] font-bold uppercase tracking-wider`}>
                    {evidence.status}
                  </Badge>
                </div>
                
                {/* Middle Section: Details */}
                <div className="flex-1 space-y-4">
                  <p className="text-[15px] text-gray-800 leading-relaxed">{evidence.description || 'No description provided.'}</p>
                  
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-4 pt-4 border-t border-black/[0.03]">
                    <div className="flex items-center gap-2 text-[13px] font-medium text-gray-500">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      {formatDate(evidence.timestamp, { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                    {evidence.location && (
                      <div className="flex items-center gap-2 text-[13px] font-medium text-gray-500">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        {evidence.location.address || `${evidence.location.latitude.toFixed(4)}, ${evidence.location.longitude.toFixed(4)}`}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-[13px] font-medium text-gray-500">
                      <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-600">
                        {evidence.userId.charAt(0)}
                      </div>
                      User {evidence.userId}
                    </div>
                  </div>
                </div>
                
                {/* Right Section: Action */}
                <div className="md:w-32 shrink-0 flex items-center justify-end border-t md:border-t-0 border-black/5 pt-6 md:pt-0 pl-0 md:pl-4">
                  <RouterLink 
                    to={`/evidence/${evidence.evidenceId}`}
                    className="w-full md:w-auto inline-flex items-center justify-center h-12 px-6 rounded-xl font-bold text-[14px] text-gray-700 bg-gray-50 hover:bg-black hover:text-white hover:border-black transition-all border border-gray-200"
                  >
                    View
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </RouterLink>
                </div>
              </div>
            );
          })}
        </div>
      </PageContainer>
    </div>
  );
}