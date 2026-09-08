import { useState, useEffect } from 'react';
import { PageContainer } from '@components/layout';
import { Button, Badge } from '@components/ui';
import { Search, QrCode, ArrowRight, FileText } from 'lucide-react';
import { VerificationResult } from '@components/verification';
import type { VerificationResult as VerificationResultType, VerificationStatus } from '@type-defs/verification';
import { QRScanner } from '@components/qr';
import { verificationService } from '@services/verification/verificationService';
import { db } from '@mocks/db';

export function VerificationPage() {
  const [evidenceId, setEvidenceId] = useState('');
  const [result, setResult] = useState<VerificationResultType | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const [recentChecks, setRecentChecks] = useState<any[]>([]);

  useEffect(() => {
    // In a real app, you'd fetch the actual history from the API
    // For now, let's grab a few evidence items and fake recent checks based on their status
    const allEvidence = db.getEvidence();
    const checks = allEvidence.slice(0, 5).map(ev => ({
      id: ev.evidenceId,
      status: ev.status,
      timestamp: ev.updatedAt,
    }));
    setRecentChecks(checks);
  }, []);

  const handleVerify = async (id: string = evidenceId) => {
    if (!id.trim()) return;
    setIsVerifying(true);
    
    try {
      const res = await verificationService.verifyEvidence(id);
      if (res.success && res.data) {
        setResult(res.data);
      } else {
        alert(res.error?.message || 'Failed to verify evidence');
        setResult(null);
      }
    } catch (err) {
      console.error(err);
      alert('Error verifying evidence');
      setResult(null);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleScan = (code: string) => {
    setEvidenceId(code);
    handleVerify(code);
  };

  const getStatusBadge = (status: string) => {
    if (status === 'Verified') return <Badge variant="success" size="sm">Verified</Badge>;
    if (status === 'IntegrityMismatch') return <Badge variant="error" size="sm">Mismatch</Badge>;
    return <Badge variant="warning" size="sm">Pending</Badge>;
  };

  return (
    <PageContainer
      title="Verification"
      description="Cryptographically verify evidence integrity against immutable blockchain records."
    >
      <div className="grid gap-8 lg:grid-cols-12 max-w-7xl mx-auto pb-12">
        {/* Main Verification Column */}
        <div className="lg:col-span-8 space-y-8">
          
          <div className="glass-panel rounded-[32px] p-8 sm:p-10">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-8 text-[18px] tracking-tight">New Verification</h3>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  value={evidenceId}
                  onChange={(e) => setEvidenceId(e.target.value)}
                  placeholder="Enter Evidence ID or Asset Tag"
                  className="w-full pl-11 pr-4 py-4 bg-gray-50/50 dark:bg-black/20 border border-black/5 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-300 dark:focus:border-primary-500 transition-all text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-[15px]"
                />
              </div>
              <Button size="lg" onClick={() => handleVerify()} loading={isVerifying} disabled={!evidenceId.trim()} className="rounded-2xl px-10">
                Verify
              </Button>
            </div>

            <VerificationResult
              result={result}
              isLoading={isVerifying}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-panel rounded-[32px] p-8">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-6 text-[16px] tracking-tight">Tools</h3>
            <div className="space-y-3">
              <button 
                onClick={() => setIsScannerOpen(true)}
                className="w-full flex items-center justify-between p-4 rounded-2xl border border-black/5 dark:border-white/10 hover:border-black/10 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/5 transition-all group shadow-sm hover:shadow-md"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-[18px] bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
                    <QrCode className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <span className="font-semibold text-[15px] text-gray-900 dark:text-gray-100">Scan QR Code</span>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors" />
              </button>
              
              <button className="w-full flex items-center justify-between p-4 rounded-2xl border border-black/5 dark:border-white/10 hover:border-black/10 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/5 transition-all group shadow-sm hover:shadow-md">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-[18px] bg-gray-50 dark:bg-white/5 flex items-center justify-center border border-black/5 dark:border-white/10">
                    <FileText className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <span className="font-semibold text-[15px] text-gray-900 dark:text-gray-100">Batch Verification</span>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors" />
              </button>
            </div>
          </div>

          <div className="glass-panel rounded-[32px] p-8">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Recent Checks</h3>
              <button className="text-sm text-primary-600 dark:text-primary-400 font-medium hover:text-primary-700 dark:hover:text-primary-300">View All</button>
            </div>
            <div className="space-y-1">
              {recentChecks.map((v, i) => (
                <div key={v.id + i} className="flex items-center justify-between p-3 -mx-3 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl cursor-pointer transition-colors" onClick={() => { setEvidenceId(v.id); handleVerify(v.id); }}>
                  <div>
                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{v.id}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {getStatusBadge(v.status)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <QRScanner 
        isOpen={isScannerOpen} 
        onClose={() => setIsScannerOpen(false)} 
        onScan={handleScan} 
      />
    </PageContainer>
  );
}