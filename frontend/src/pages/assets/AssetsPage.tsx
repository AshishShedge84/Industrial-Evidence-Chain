import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@hooks/useAuth';
import { PageContainer } from '@components/layout';
import { AssetList } from '@components/assets';
import { AssetSearch } from '@components/assets';
import { Button } from '@components/ui';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '@components/ui';
import { Input } from '@components/ui';
import { Select } from '@components/ui';
import { Textarea } from '@components/ui';
import type { AssetCategory, AssetStatus, CreateAssetRequest } from '@type-defs/asset';
import { assetService } from '@services/assets/assetService';

export function AssetsPage() {
  const { hasPermission } = useAuth();
  const [assets, setAssets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<any>(null);
  const [searchParams, setSearchParams] = useState<any>({ query: '', category: '', status: '' });
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [assetToEdit, setAssetToEdit] = useState<any>(null);
  const navigate = useNavigate();
  const [formData, setFormData] = useState<CreateAssetRequest>({
    assetTag: '',
    name: '',
    description: '',
    category: 'Machinery',
    location: undefined,
    specifications: undefined,
    assignedTo: undefined,
  });

  const categories: AssetCategory[] = ['Machinery', 'Equipment', 'Vehicle', 'Tool', 'Instrument', 'Facility', 'Other'];
  const statuses: AssetStatus[] = ['Active', 'Inactive', 'Maintenance', 'Retired', 'Lost', 'Decommissioned'];

  const handleSearch = useCallback((params: any) => {
    setSearchParams(params);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchAssets = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await assetService.getAssets(searchParams);
        if (isMounted) {
          if (response.success && response.data) {
            setAssets(response.data.items);
          } else {
            setError(response.error?.message || 'Failed to fetch assets');
          }
        }
      } catch (err) {
        if (isMounted) {
          setError('An unexpected error occurred while fetching assets');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchAssets();
    return () => {
      isMounted = false;
    };
  }, [searchParams]);

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await assetService.createAsset(formData);
      if (response.success && response.data) {
        setAssets((prev) => [response.data!, ...prev]);
        setShowCreateModal(false);
        setFormData({ assetTag: '', name: '', description: '', category: 'Machinery' });
      } else {
        setError(response.error?.message || 'Failed to create asset');
      }
    } catch (e) {
      setError('An error occurred during creation.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewAsset = (asset: any) => {
    navigate(`/assets/${asset.id}`);
  };

  const handleEditAsset = (asset: any) => {
    setAssetToEdit(asset);
    setFormData({
      assetTag: asset.assetTag,
      name: asset.name,
      description: asset.description,
      category: asset.category,
      location: asset.location,
      specifications: asset.specifications,
      assignedTo: asset.assignedTo,
    });
    setShowEditModal(true);
  };

  const submitEditAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetToEdit) return;
    setIsLoading(true);
    setEditError(null);
    try {
      const response = await assetService.updateAsset(assetToEdit.id, formData);
      if (response.success && response.data) {
        setAssets((prev) => prev.map(a => a.id === assetToEdit.id ? response.data : a));
        setShowEditModal(false);
        setAssetToEdit(null);
      } else {
        setEditError(response.error?.message || 'Update failed');
      }
    } catch (err) {
      setEditError('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAsset = (asset: any) => {
    setAssetToDelete(asset);
  };

  const confirmDeleteAsset = async () => {
    if (!assetToDelete) return;
    setIsLoading(true);
    try {
      setDeleteError(null);
      await assetService.deleteAsset(assetToDelete.id);
      setAssets((prev) => prev.filter((a) => a.id !== assetToDelete.id));
      setAssetToDelete(null);
    } catch (err) {
      setDeleteError('Unable to delete this asset. Please try again.');
      setAssetToDelete(null);
    } finally {
      setIsLoading(false);
    }
  };

  const canCreateAsset = hasPermission('assets:write');

  return (
    <div className="space-y-12 pb-12">
      <PageContainer
        title="Asset Catalog"
        description="Manage and track all industrial equipment, machinery, and facilities."
        actions={
          canCreateAsset && (
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Register Asset
            </Button>
          )
        }
      >
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          <div className="w-full lg:w-72 flex-shrink-0">
            <div className="sticky top-28 bg-white/70 dark:bg-[#0F1218]/70 backdrop-blur-xl border-t border-l border-white/40 dark:border-white/10 border-r border-b border-black/5 dark:border-black/20 rounded-[28px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent dark:from-white/5 dark:to-transparent pointer-events-none rounded-[28px]" />
              <div className="relative">
                <AssetSearch onSearch={handleSearch} categories={categories} statuses={statuses} />
              </div>
            </div>
          </div>
          <div className="flex-1 bg-white/70 dark:bg-[#0F1218]/70 backdrop-blur-xl border-t border-l border-white/40 dark:border-white/10 border-r border-b border-black/5 dark:border-black/20 rounded-[28px] p-2 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] relative min-h-[400px]">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent dark:from-white/5 dark:to-transparent pointer-events-none rounded-[28px]" />
            <div className="relative h-full">
              {error ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <p className="text-error-600 font-medium mb-4">{error}</p>
                  <Button variant="outline" onClick={() => handleSearch(searchParams)}>Retry</Button>
                </div>
              ) : (
                <>
                  {deleteError && (
                    <div className="mb-6 p-4 bg-error-50/80 backdrop-blur-sm border border-error-100 rounded-xl text-error-700 text-sm font-medium flex items-center justify-between">
                      {deleteError}
                      <button onClick={() => setDeleteError(null)} className="text-error-400 hover:text-error-700">
                        <span className="sr-only">Dismiss</span>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  )}
                  <AssetList
                    assets={assets}
                    isLoading={isLoading}
                  onView={handleViewAsset}
                  onEdit={canCreateAsset ? handleEditAsset : undefined}
                  onDelete={canCreateAsset ? handleDeleteAsset : undefined}
                  emptyTitle="No assets registered"
                  emptyDescription="Register or connect an industrial asset to begin tracking."
                  emptyAction={canCreateAsset ? { label: 'Register Asset', onClick: () => setShowCreateModal(true) } : undefined}
                />
                </>
              )}
            </div>
          </div>
        </div>
      </PageContainer>

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Register New Asset"
        size="lg"
      >
        <form onSubmit={handleCreateAsset} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Asset Tag"
              value={formData.assetTag}
              onChange={(e) => setFormData({ ...formData, assetTag: e.target.value.toUpperCase() })}
              placeholder="e.g., PUMP-001"
              required
            />
            <Select
              label="Category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as AssetCategory })}
              options={categories.map((c) => ({ value: c, label: c }))}
              required
            />
          </div>
          <Input
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Centrifugal Pump - Main Line"
            required
          />
          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Optional description"
            rows={3}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Assigned To (User ID)"
              value={formData.assignedTo || ''}
              onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
              placeholder="Optional"
            />
          </div>
          <div className="flex justify-end gap-3 pt-6 mt-2 border-t border-black/5">
            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isLoading}>
              Register Asset
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!assetToDelete}
        onClose={() => setAssetToDelete(null)}
        title="Delete asset?"
        size="sm"
      >
        <div className="space-y-6">
          <div className="text-gray-600 dark:text-gray-300">
            <p>Are you sure you want to delete <span className="font-semibold text-gray-900 dark:text-white">"{assetToDelete?.assetTag} — {assetToDelete?.name}"</span>?</p>
            <p className="mt-2 text-[14px] text-gray-500">This action cannot be undone.</p>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-black/5 dark:border-white/5">
            <Button type="button" variant="outline" onClick={() => setAssetToDelete(null)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="button" variant="primary" className="bg-error-600 hover:bg-error-700 text-white border-transparent" onClick={confirmDeleteAsset} loading={isLoading}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
      <Modal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setAssetToEdit(null); }}
        title="Edit Asset"
        size="lg"
      >
        <form onSubmit={submitEditAsset} className="space-y-4">
          {editError && (
            <div className="p-3 bg-error-50 text-error-700 rounded-lg text-sm">{editError}</div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Asset Tag"
              value={formData.assetTag}
              onChange={(e) => setFormData({ ...formData, assetTag: e.target.value.toUpperCase() })}
              required
            />
            <Select
              label="Category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as AssetCategory })}
              options={categories.map((c) => ({ value: c, label: c }))}
              required
            />
          </div>
          <Input
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
          />
          <div className="flex justify-end gap-3 pt-6 mt-2 border-t border-black/5">
            <Button type="button" variant="outline" onClick={() => { setShowEditModal(false); setAssetToEdit(null); }}>
              Cancel
            </Button>
            <Button type="submit" loading={isLoading}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}