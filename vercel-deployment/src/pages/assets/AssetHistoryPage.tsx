import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageContainer } from '@components/layout';
import { Button } from '@components/ui';
import { Settings, Loader2, ChevronLeft, Calendar } from 'lucide-react';
import type { Asset, AssetHistoryEntry } from '@type-defs/asset';
import { formatDate } from '@utils/date';
import { assetService } from '@services/assets/assetService';
import { UserDisplayName } from '@services/user/userLookupService';

export function AssetHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [history, setHistory] = useState<AssetHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchAssetData = async () => {
      if (!id) return;
      setIsLoading(true);
      setError(null);
      
      try {
        const [assetRes, historyRes] = await Promise.all([
          assetService.getAsset(id),
          assetService.getAssetHistory(id)
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
        }
      } catch (err) {
        if (isMounted) {
          setError('Failed to fetch asset history');
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
    <div className="space-y-8 pb-12 max-w-4xl mx-auto w-full min-w-0">
      <div className="flex items-center gap-4 mb-4">
        <button 
          onClick={() => navigate(`/assets/${asset.id}`)}
          className="h-10 w-10 rounded-full bg-white/70 dark:bg-black/20 backdrop-blur-md border border-white/40 dark:border-white/10 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors shadow-sm"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Asset History</h1>
          <p className="text-[14px] text-gray-500">{asset.name} ({asset.assetTag})</p>
        </div>
      </div>

      <section className="bg-white/70 dark:bg-[#0F1218]/70 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-[28px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative min-h-[400px]">
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent dark:from-white/5 dark:to-transparent pointer-events-none rounded-[28px]" />
        <div className="relative">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Calendar className="h-12 w-12 text-gray-300 mb-4" />
              <p className="text-[15px] font-medium text-gray-900 dark:text-gray-100">No history available</p>
              <p className="text-[14px] text-gray-500 mt-1">This asset has no recorded events.</p>
            </div>
          ) : (
            <div className="relative before:absolute before:inset-0 before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-black/10 before:to-transparent pt-4 pb-4">
              <div className="space-y-12 relative max-w-3xl mx-auto">
                {history.map((entry) => (
                  <div key={entry.id} className="relative flex items-start gap-6 group md:justify-center">
                    {/* Left side for desktop */}
                    <div className="hidden md:flex flex-1 justify-end pt-1">
                      <div className="text-right pr-8">
                        <p className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">{entry.action}</p>
                        <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">by <UserDisplayName userId={entry.performedBy} fallback="Authorized Staff" /></p>
                      </div>
                    </div>
                    
                    {/* Center Icon */}
                    <div className="h-12 w-12 rounded-full bg-white border-2 border-primary-100 shadow-sm flex items-center justify-center flex-shrink-0 z-10 group-hover:border-primary-300 group-hover:bg-primary-50 transition-colors">
                      <Settings className="h-5 w-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
                    </div>

                    {/* Right side for desktop / Main content for mobile */}
                    <div className="flex-1 min-w-0 pt-1 pb-4 border-b border-black/5 md:border-0 last:border-0 md:pl-8">
                      <div className="md:hidden mb-2">
                        <p className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">{entry.action}</p>
                        <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">by <UserDisplayName userId={entry.performedBy} fallback="Authorized Staff" /></p>
                      </div>
                      <div className="flex items-center gap-2 text-[13px] font-medium text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-white/5 inline-flex px-3 py-1.5 rounded-lg border border-black/5 dark:border-white/10">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(entry.performedAt)}
                      </div>
                      
                      {entry.details && Object.keys(entry.details).length > 0 && (
                        <div className="mt-4 bg-white/40 border border-white/40 rounded-xl p-4 text-[13px] text-gray-700 shadow-sm">
                          {Object.entries(entry.details).map(([k, v]) => (
                            <div key={k} className="flex gap-2">
                              <span className="font-semibold capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}:</span>
                              <span>{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
