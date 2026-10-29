import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageContainer } from '@components/layout';
import { Badge, Button, SecurityIconBox } from '@components/ui';
import { Modal } from '@components/ui/Modal';
import { Input } from '@components/ui/Input';
import { Select } from '@components/ui/Select';
import { MapPin, Settings, Calendar, User, ChevronRight, Edit, Download, QrCode, Camera, Shield, ShieldCheck, Loader2, Check } from 'lucide-react';
import { QRCodeDisplay } from '@components/qr/QRCodeDisplay';
import { EVIDENCE_STATUS_COLORS } from '@constants/evidenceStatus';
import type { Asset, AssetHistoryEntry, AssetStatus, AssetCategory, UpdateAssetRequest } from '@type-defs/asset';
import type { Evidence } from '@type-defs/evidence';
import { formatDate } from '@utils/date';
import { assetService } from '@services/assets/assetService';
import { evidenceService } from '@services/evidence/evidenceService';
import { UserDisplayName } from '@services/user/userLookupService';

export function AssetDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [history, setHistory] = useState<AssetHistoryEntry[]>([]);
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState<AssetCategory>('Equipment');
  const [editStatus, setEditStatus] = useState<AssetStatus>('Active');
  const [editAssignedTo, setEditAssignedTo] = useState('');
  const [editSaved, setEditSaved] = useState(false);

  // QR modal state
  const [isQROpen, setIsQROpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const fetchAssetData = async () => {
      if (!id) return;
      setIsLoading(true);
      setError(null);
      
      try {
        const [assetRes, historyRes, evidenceRes] = await Promise.all([
          assetService.getAsset(id),
          assetService.getAssetHistory(id),
          evidenceService.getEvidenceList({ assetId: id })
        ]);

        if (isMounted) {
          if (assetRes.success && assetRes.data) {
            setAsset(assetRes.data);
          } else {
            setError(assetRes.error?.message || 'Asset not found');
          }
          
          if (historyRes.success && historyRes.data) {
            setHistory(historyRes.data);
          }

          if (evidenceRes.success && evidenceRes.data) {
            setEvidenceList(evidenceRes.data.items);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError('Failed to fetch asset details');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchAssetData();
    return () => { isMounted = false; };
  }, [id]);

  const handleOpenEdit = () => {
    if (!asset) return;
    setEditName(asset.name);
    setEditDescription(asset.description || '');
    setEditCategory(asset.category);
    setEditStatus(asset.status);
    setEditAssignedTo(asset.assignedTo || '');
    setEditSaved(false);
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!asset || !id) return;
    setIsSaving(true);
    try {
      const updates: UpdateAssetRequest = {
        name: editName.trim() || asset.name,
        description: editDescription.trim() || undefined,
        category: editCategory,
        status: editStatus,
        assignedTo: editAssignedTo.trim() || undefined,
      };
      const res = await assetService.updateAsset(id, updates);
      if (res.success && res.data) {
        setAsset(res.data);
        setEditSaved(true);
        setTimeout(() => setIsEditOpen(false), 900);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = () => {
    if (!asset) return;
    const exportData = {
      asset,
      history,
      evidenceList,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asset-${asset.assetTag}-export.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const statusColors: Record<AssetStatus, string> = {
    Active: 'bg-success-50 text-success-700',
    Inactive: 'bg-gray-100 text-gray-600',
    Maintenance: 'bg-amber-50 text-amber-700',
    Retired: 'bg-error-50 text-error-700',
    Lost: 'bg-error-50 text-error-700',
    Decommissioned: 'bg-gray-100 text-gray-600',
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="flex flex-col h-64 items-center justify-center gap-4">
        <p className="text-error-600 font-medium">{error || 'Asset not found'}</p>
        <Button variant="outline" onClick={() => navigate('/assets')}>Back to Assets</Button>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-12">
      <PageContainer
        title={asset.name}
        description={asset.description}
        breadcrumbs={[
          { label: 'Assets', href: '/assets' },
          { label: asset.assetTag, href: `/assets/${asset.id}` },
          { label: 'Details' },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setIsQROpen(true)} className="h-10 px-4 font-semibold text-[13px] hover:bg-white/50 border-white/40 shadow-sm backdrop-blur-md bg-white/40 text-gray-900 dark:text-gray-200 dark:border-white/20 dark:bg-white/10">
              <QrCode className="h-4 w-4 mr-2" />
              QR Code
            </Button>
            <Button variant="outline" onClick={handleOpenEdit} className="h-10 px-4 font-semibold text-[13px] hover:bg-white/50 border-white/40 shadow-sm backdrop-blur-md bg-white/40 text-gray-900 dark:text-gray-200 dark:border-white/20 dark:bg-white/10">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button onClick={handleExport} className="h-10 px-4 font-semibold text-[13px] shadow-sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        }
      >
        <div className="grid gap-6 sm:gap-8 lg:grid-cols-12 w-full min-w-0">
          {/* Main Content Area */}
          <div className="lg:col-span-8 space-y-6 sm:space-y-8 min-w-0">
            
            {/* Asset Information */}
            <section className="bg-white/70 dark:bg-[#0F1218]/70 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-[28px] p-4 sm:p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent dark:from-white/5 dark:to-transparent pointer-events-none rounded-[28px]" />
              <div className="relative">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 tracking-tight">Asset Information</h3>
                  <Badge className={statusColors[asset.status]}>{asset.status}</Badge>
                </div>
                
                <dl className="grid gap-y-8 gap-x-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-[12px] font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Asset Tag</dt>
                    <dd className="font-mono text-[15px] font-medium text-gray-900 dark:text-gray-100 bg-white/50 dark:bg-white/5 inline-block px-3 py-1 rounded-lg border border-black/5 dark:border-white/10">{asset.assetTag}</dd>
                  </div>
                  <div>
                    <dt className="text-[12px] font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Category</dt>
                    <dd className="text-[15px] font-medium text-gray-900 dark:text-gray-100">{asset.category}</dd>
                  </div>
                  
                  <div className="sm:col-span-2 pt-6 border-t border-black/5 dark:border-white/5">
                    <dt className="text-[12px] font-semibold text-gray-500 uppercase tracking-widest mb-2">Location</dt>
                    <dd className="flex items-center gap-3 text-[15px] font-medium text-gray-900 dark:text-gray-100 bg-white/40 dark:bg-white/5 p-4 rounded-2xl border border-white/40 dark:border-white/10 shadow-sm">
                      <div className="h-10 w-10 rounded-full bg-white border border-black/5 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <MapPin className="h-5 w-5 text-gray-500" />
                      </div>
                      <span className="leading-relaxed">
                        {asset.location?.site || 'Unknown Site'}
                        {asset.location?.building && <span className="text-gray-400 mx-2">/</span>}
                        {asset.location?.building}
                        {asset.location?.floor && <span className="text-gray-400 mx-2">/</span>}
                        {asset.location?.floor}
                        {asset.location?.room && <span className="text-gray-400 mx-2">/</span>}
                        {asset.location?.room}
                      </span>
                    </dd>
                  </div>
                  
                  {asset.location?.coordinates && (
                    <div className="sm:col-span-2">
                      <dt className="text-[12px] font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Coordinates</dt>
                      <dd className="font-mono text-[14px] text-gray-600">
                        {asset.location.coordinates.latitude.toFixed(6)}, {asset.location.coordinates.longitude.toFixed(6)}
                      </dd>
                    </div>
                  )}
                  
                  <div className="pt-6 border-t border-black/5 dark:border-white/5">
                    <dt className="text-[12px] font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Assigned To</dt>
                    <dd className="flex items-center gap-2 text-[14px] font-medium text-gray-900 dark:text-gray-100">
                      <div className="h-8 w-8 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 flex items-center justify-center shadow-sm">
                        <User className="h-4 w-4" />
                      </div>
                      <UserDisplayName userId={asset.assignedTo} fallback="Unassigned" />
                    </dd>
                  </div>
                  
                  <div className="pt-6 border-t border-black/5 dark:border-white/5">
                    <dt className="text-[12px] font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Created By</dt>
                    <dd className="flex items-center gap-2 text-[14px] font-medium text-gray-900 dark:text-gray-100">
                      <UserDisplayName userId={asset.createdBy} fallback="System Administrator" />
                    </dd>
                  </div>
                  
                  <div>
                    <dt className="text-[12px] font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Created</dt>
                    <dd className="flex items-center gap-2 text-[14px] font-medium text-gray-900 dark:text-gray-100">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      {formatDate(asset.createdAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[12px] font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Last Updated</dt>
                    <dd className="flex items-center gap-2 text-[14px] font-medium text-gray-900 dark:text-gray-100">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      {formatDate(asset.updatedAt)}
                    </dd>
                  </div>
                </dl>
              </div>
            </section>

            {/* Specifications */}
            {asset.specifications && Object.keys(asset.specifications).length > 0 && (
              <section className="bg-white/70 dark:bg-[#0F1218]/70 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-[28px] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent dark:from-white/5 dark:to-transparent pointer-events-none" />
                <div className="relative">
                  <div className="p-4 sm:p-6 lg:p-8 pb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 tracking-tight">Specifications</h3>
                  </div>
                  <dl className="divide-y divide-black/5 dark:divide-white/5">
                    {Object.entries(asset.specifications).map(([key, value]) => (
                      <div key={key} className="flex flex-col sm:flex-row sm:items-center px-4 sm:px-6 lg:px-8 py-4 sm:py-5 hover:bg-white/40 dark:hover:bg-white/5 transition-colors">
                        <dt className="text-[13px] font-semibold text-gray-500 uppercase tracking-widest sm:w-1/3">{key}</dt>
                        <dd className="mt-1 sm:mt-0 text-[15px] font-medium text-gray-900 dark:text-gray-100 sm:w-2/3">{String(value)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </section>
            )}

            {/* Recent Evidence */}
            <section className="bg-white/70 dark:bg-[#0F1218]/70 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-[28px] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent dark:from-white/5 dark:to-transparent pointer-events-none" />
              <div className="relative">
                <div className="p-4 sm:p-6 lg:p-8 pb-4 flex items-end justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 tracking-tight">Recent Evidence</h3>
                  <button className="text-[13px] font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1 group">
                    View all
                    <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
                <div className="divide-y divide-black/5 dark:divide-white/5">
                  {evidenceList.map((ev) => (
                    <div 
                      key={ev.evidenceId} 
                      onClick={() => navigate(`/evidence/${ev.evidenceId}`)}
                      className="flex items-center justify-between p-4 sm:p-6 px-4 sm:px-6 lg:px-8 hover:bg-white/40 dark:hover:bg-white/5 transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <SecurityIconBox
                          icon={ev.status === 'Anchored' || ev.status === 'Verified' ? ShieldCheck : Shield}
                          variant={ev.status === 'Anchored' || ev.status === 'Verified' ? 'verified' : 'primary'}
                          size="md"
                        />
                        <div>
                          <p className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors flex items-center gap-2">
                            <span>{ev.activityType}</span>
                            <span className="font-mono text-xs text-gray-400 font-normal">#{ev.evidenceId.substring(0, 8)}</span>
                          </p>
                          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">{ev.description || 'No description provided'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end gap-1.5">
                          <Badge className={EVIDENCE_STATUS_COLORS[ev.status as keyof typeof EVIDENCE_STATUS_COLORS]}>
                            {ev.status}
                          </Badge>
                          <span className="text-[12px] font-medium text-gray-400 dark:text-gray-500">{formatDate(ev.timestamp)}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  ))}
                  {evidenceList.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-[14px] text-gray-500">No recent evidence found</p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-8">
            {/* Quick Actions */}
            <section className="bg-white/70 dark:bg-[#0F1218]/70 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-[28px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent dark:from-white/5 dark:to-transparent pointer-events-none rounded-[28px]" />
              <div className="relative">
                <h3 className="text-[12px] font-semibold text-gray-500 uppercase tracking-widest mb-6">Quick Actions</h3>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => navigate('/evidence/capture', { state: { assetId: asset.id } })}
                    className="w-full group flex items-center justify-between p-4 rounded-2xl bg-primary-600 hover:bg-primary-700 transition-all shadow-md shadow-primary-600/20 text-white"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                        <Camera className="h-5 w-5" />
                      </div>
                      <span className="font-semibold text-[15px]">Capture Evidence</span>
                    </div>
                    <ChevronRight className="h-5 w-5 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </button>
                  
                  <button 
                    onClick={() => setIsQROpen(true)}
                    className="w-full group flex items-center justify-between p-4 rounded-2xl bg-white/50 backdrop-blur-md border border-white/60 hover:border-white/80 transition-all shadow-sm"
                  >
                    <div className="flex items-center gap-3 text-gray-900 group-hover:text-primary-700">
                      <div className="h-10 w-10 rounded-full bg-white border border-black/5 shadow-sm flex items-center justify-center text-gray-500 group-hover:text-primary-600 transition-colors">
                        <QrCode className="h-5 w-5" />
                      </div>
                      <span className="font-semibold text-[15px]">View QR Code</span>
                    </div>
                  </button>
                </div>
              </div>
            </section>

            {/* History Preview */}
            <section className="bg-white/70 dark:bg-[#0F1218]/70 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-[28px] p-4 sm:p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent dark:from-white/5 dark:to-transparent pointer-events-none rounded-[28px]" />
              <div className="relative">
                <div className="flex items-end justify-between mb-8">
                  <h3 className="text-[12px] font-semibold text-gray-500 uppercase tracking-widest">Recent History</h3>
                  <button 
                    onClick={() => navigate(`/assets/${asset.id}/history`)}
                    className="text-[12px] font-semibold text-primary-600 hover:text-primary-700 transition-colors uppercase tracking-widest flex items-center gap-1 group"
                  >
                    View Full
                    <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
                <div className="relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-black/10 before:to-transparent pt-2">
                  <div className="space-y-6 relative">
                    {history.slice(0, 3).map((entry) => (
                      <div key={entry.id} className="relative flex items-start gap-4 group">
                        <div className="h-10 w-10 rounded-full bg-white border border-black/5 shadow-sm flex items-center justify-center flex-shrink-0 z-10 group-hover:border-primary-200 transition-colors">
                          <Settings className="h-4 w-4 text-gray-400 group-hover:text-primary-600 transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0 pt-1.5 pb-2 border-b border-black/5 last:border-0">
                          <p className="text-[14px] font-semibold text-gray-900 dark:text-gray-100">{entry.action}</p>
                          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">by <UserDisplayName userId={entry.performedBy} fallback="Authorized Staff" /></p>
                          <p className="text-[12px] font-medium text-gray-400 dark:text-gray-500 mt-1.5">{formatDate(entry.performedAt)}</p>
                        </div>
                      </div>
                    ))}
                    {history.length === 0 && (
                      <div className="text-center py-6">
                        <p className="text-[13px] text-gray-500">No recent history</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </PageContainer>

      {/* Edit Asset Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Asset"
        description={`Editing: ${asset.assetTag}`}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Asset name"
          />
          <Input
            label="Description"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            placeholder="Short description (optional)"
          />
          <Select
            label="Category"
            value={editCategory}
            onChange={(e) => setEditCategory(e.target.value as AssetCategory)}
            options={[
              { value: 'Machinery', label: 'Machinery' },
              { value: 'Equipment', label: 'Equipment' },
              { value: 'Vehicle', label: 'Vehicle' },
              { value: 'Tool', label: 'Tool' },
              { value: 'Instrument', label: 'Instrument' },
              { value: 'Facility', label: 'Facility' },
              { value: 'Other', label: 'Other' },
            ]}
          />
          <Select
            label="Status"
            value={editStatus}
            onChange={(e) => setEditStatus(e.target.value as AssetStatus)}
            options={[
              { value: 'Active', label: 'Active' },
              { value: 'Inactive', label: 'Inactive' },
              { value: 'Maintenance', label: 'Maintenance' },
              { value: 'Retired', label: 'Retired' },
              { value: 'Lost', label: 'Lost' },
              { value: 'Decommissioned', label: 'Decommissioned' },
            ]}
          />
          <Input
            label="Assigned To"
            value={editAssignedTo}
            onChange={(e) => setEditAssignedTo(e.target.value)}
            placeholder="Username or user ID (optional)"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} loading={isSaving} disabled={isSaving || editSaved}>
              {editSaved ? <><Check className="h-4 w-4 mr-1" />Saved</> : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* QR Code Modal */}
      <Modal
        isOpen={isQROpen}
        onClose={() => setIsQROpen(false)}
        title="Asset QR Code"
        description={asset.assetTag}
        size="sm"
      >
        <div className="flex flex-col items-center gap-6 py-4">
          <div className="flex justify-center mb-2">
            <QRCodeDisplay value={asset.qrCode || asset.assetTag} size={200} />
          </div>
          <div className="text-center">
            <p className="text-[13px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Asset Identifier</p>
            <p className="font-mono text-[15px] font-medium text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-white/5 px-4 py-2 rounded-xl border border-black/5 dark:border-white/10">
              {asset.qrCode || asset.assetTag}
            </p>
          </div>
          <Button variant="outline" onClick={() => setIsQROpen(false)} className="w-full">
            Close
          </Button>
        </div>
      </Modal>
    </div>
  );
}