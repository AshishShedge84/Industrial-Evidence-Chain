import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HardDrive, 
  CheckCircle2, 
  AlertTriangle, 
  Copy,
  Check,
  RefreshCw, 
  ShieldCheck, 
  FolderPlus,
  Lock,
  Unlink,
  Loader2,
  ExternalLink,
  Search,
  Sparkles,
  MousePointerClick
} from 'lucide-react';
import { googleDriveService, type GoogleDriveStatus } from '@services/drive/googleDriveService';
import { useApp } from '@context/AppContext';

declare global {
  interface Window {
    gapi?: any;
    google?: any;
  }
}

export function GoogleDriveIntegrationCard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToast } = useApp();
  const [status, setStatus] = useState<GoogleDriveStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisionResult, setProvisionResult] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Manual folder check state
  const [manualFolderId, setManualFolderId] = useState('');
  const [manualFolderType, setManualFolderType] = useState<'photos' | 'videos' | 'root'>('photos');
  const [isVerifyingManual, setIsVerifyingManual] = useState(false);
  const [manualVerifyResult, setManualVerifyResult] = useState<any | null>(null);

  // Picker loading state
  const [isPickerOpening, setIsPickerOpening] = useState<string | null>(null);

  const driveConnected = searchParams.get('drive_connected');
  const driveAccount = searchParams.get('drive_account');
  const driveError = searchParams.get('drive_error');

  const fetchStatus = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await googleDriveService.getStatus();
      if (res.success && res.data) {
        setStatus(res.data);
      } else {
        setErrorMessage(res.error?.message || 'Failed to query Drive integration endpoint');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error querying Drive status');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleConnect = () => {
    googleDriveService.startOAuthFlow('/settings');
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect Google Drive? Media uploads will require re-connecting Drive.')) {
      return;
    }
    setIsDisconnecting(true);
    try {
      await googleDriveService.disconnect();
      await fetchStatus();
    } finally {
      setIsDisconnecting(false);
    }
  };

  /**
   * Loads the Google API client script for Google Picker dynamically
   */
  const loadPickerScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.gapi && window.google?.picker) {
        resolve();
        return;
      }
      const existingScript = document.getElementById('google-api-picker-script');
      if (existingScript) {
        if (window.gapi) {
          window.gapi.load('picker', {
            callback: () => resolve(),
            onerror: () => reject(new Error('Failed to load Google Picker component')),
          });
          return;
        }
      }

      const script = document.createElement('script');
      script.id = 'google-api-picker-script';
      script.src = 'https://apis.google.com/js/api.js';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (window.gapi) {
          window.gapi.load('picker', {
            callback: () => resolve(),
            onerror: () => reject(new Error('Failed to load Google Picker module')),
          });
        } else {
          reject(new Error('Google API client did not load properly'));
        }
      };
      script.onerror = () => reject(new Error('Failed to load Google API script'));
      document.body.appendChild(script);
    });
  };

  /**
   * Opens Google Picker so the administrator can select/authorize an existing folder.
   * This grants the app 'drive.file' scope permission for the selected folder.
   */
  const handleOpenPicker = async (folderType: 'root' | 'photos' | 'videos') => {
    if (!status?.connected) {
      alert('Please connect Google Drive before authorizing folders.');
      return;
    }

    setIsPickerOpening(folderType);
    try {
      // 1. Fetch valid OAuth access token from server
      const tokenRes = await googleDriveService.getPickerToken();
      if (!tokenRes.success || !tokenRes.data?.accessToken) {
        throw new Error(tokenRes.error?.message || 'Could not generate Google Picker access token.');
      }
      const tokenData = tokenRes.data;

      // 2. Load Google Picker script
      await loadPickerScript();

      if (!window.google?.picker) {
        throw new Error('Google Picker library is not ready.');
      }

      const folderRoleTitle =
        folderType === 'root'
          ? 'Main Evidence Root Folder'
          : folderType === 'photos'
          ? 'Photo Evidence Folder'
          : 'Video Evidence Folder';

      // 3. Configure folder view in Google Picker
      const docsView = new window.google.picker.DocsView(window.google.picker.ViewId.FOLDERS)
        .setSelectFolderEnabled(true)
        .setMimeTypes('application/vnd.google-apps.folder');

      const origin = window.location.protocol + '//' + window.location.host;

      const builder = new window.google.picker.PickerBuilder()
        .addView(docsView)
        .setOAuthToken(tokenData.accessToken)
        .setOrigin(origin)
        .setTitle(`Select ${folderRoleTitle} to Authorise`)
        .setCallback(async (data: any) => {
          if (data.action === window.google.picker.Action.PICKED) {
            const doc = data.docs[0];
            const pickedId = doc.id;
            const pickedName = doc.name;

            try {
              // 4. Send selected folder to backend for verification and assignment
              const vRes = await googleDriveService.verifyFolder({
                folderId: pickedId,
                folderType,
                folderName: pickedName,
              });

              if (vRes.success) {
                addToast({
                  type: 'success',
                  title: 'Folder Authorized',
                  message: `Successfully verified "${pickedName}" (${pickedId}) for ${folderRoleTitle}.`,
                });
                await fetchStatus();
              } else {
                alert(vRes.error?.message || 'Failed to verify folder access on server.');
              }
            } catch (err: any) {
              alert(err.message || 'Error communicating with folder verification endpoint.');
            }
          }
        });

      if (tokenData.developerKey) {
        builder.setDeveloperKey(tokenData.developerKey);
      }
      if (tokenData.appId) {
        builder.setAppId(tokenData.appId);
      }

      const picker = builder.build();
      picker.setVisible(true);
    } catch (err: any) {
      console.error('Picker launch error:', err);
      alert(`Could not launch Google Picker: ${err.message}`);
    } finally {
      setIsPickerOpening(null);
    }
  };

  /**
   * Auto-provisions Photo and Video subfolders inside an authorized root folder or creates Vault in My Drive
   */
  const handleAutoProvisionFolders = async (useRootId?: string) => {
    setIsProvisioning(true);
    setProvisionResult(null);
    try {
      const res = await googleDriveService.createFolders(useRootId);
      if (res.success && res.data) {
        setProvisionResult(
          `Success: Verified Photo Folder (${res.data.photoFolderId}) and Video Folder (${res.data.videoFolderId}). Effective destinations updated.`
        );
        addToast({
          type: 'success',
          title: 'Evidence Folders Provisioned',
          message: 'Evidence folders are now verified and accessible under drive.file.',
        });
        await fetchStatus();
      } else {
        alert(res.error?.message || 'Failed to auto-create Google Drive folders.');
      }
    } catch (err: any) {
      alert(err.message || 'Error communicating with folder creation service.');
    } finally {
      setIsProvisioning(false);
    }
  };

  /**
   * Manually checks and authorizes a specific folder ID directly against Google Drive API
   */
  const handleVerifyManualFolder = async () => {
    if (!manualFolderId.trim()) return;
    setIsVerifyingManual(true);
    setManualVerifyResult(null);

    try {
      const res = await googleDriveService.verifyFolder({
        folderId: manualFolderId.trim(),
        folderType: manualFolderType,
      });

      setManualVerifyResult(res);

      if (res.success) {
        addToast({
          type: 'success',
          title: 'Folder Verified',
          message: `Folder '${res.data?.name}' verified and assigned to ${manualFolderType}.`,
        });
        await fetchStatus();
      }
    } catch (err: any) {
      setManualVerifyResult({
        success: false,
        error: { message: err.message || 'Failed to verify folder.' },
      });
    } finally {
      setIsVerifyingManual(false);
    }
  };

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const dismissParams = () => {
    searchParams.delete('drive_connected');
    searchParams.delete('drive_account');
    searchParams.delete('drive_error');
    setSearchParams(searchParams, { replace: true });
  };

  const redirectUri =
    status?.setupStatus?.redirectUri ||
    'https://iec-firebase-deployment.vercel.app/api/integrations/google-drive/oauth/callback';
  const jsOrigin = 'https://iec-firebase-deployment.vercel.app';

  const anyFolderPending =
    status?.connected &&
    (!status.folders.root.accessible ||
      !status.folders.photos.accessible ||
      !status.folders.videos.accessible);

  const envSnippet = `GOOGLE_DRIVE_ROOT_FOLDER_ID=${status?.effectiveFolders?.rootFolderId || status?.requiredFolders?.rootFolderId || '1M7uMS4jEqcZcHqAcFo4xFKMw4Zq3U8OR'}
GOOGLE_DRIVE_PHOTO_FOLDER_ID=${status?.effectiveFolders?.photoFolderId || status?.requiredFolders?.photoFolderId || '1IAAhox8zZx1uCUwumiBtg0ZTKHvMfOM9'}
GOOGLE_DRIVE_VIDEO_FOLDER_ID=${status?.effectiveFolders?.videoFolderId || status?.requiredFolders?.videoFolderId || '1xLTaHhSU1iaCmpTXMPK6EXqFY13QLR-V'}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="bg-white/70 dark:bg-black/40 backdrop-blur-2xl rounded-[32px] p-6 sm:p-10 border border-black/5 dark:border-white/5 shadow-sm space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-black/5 dark:border-white/10">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <HardDrive className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Google Drive Evidence Storage</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                Enterprise
              </span>
            </div>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 font-medium">
              Notarized industrial media is sealed and backed up into Google Drive cloud storage.
            </p>
          </div>
        </div>

        <button
          onClick={fetchStatus}
          disabled={isLoading}
          className="self-start sm:self-center p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          title="Refresh Drive connection status"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* URL Banner Feedback */}
      {driveConnected && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                Google Drive Connected Successfully
              </p>
              <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                Authenticated as {driveAccount || 'Authorized Account'}. Offline refresh tokens have been secured.
              </p>
            </div>
          </div>
          <button onClick={dismissParams} className="text-emerald-700 dark:text-emerald-400 hover:opacity-75 text-xs font-semibold cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {driveError && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-rose-900 dark:text-rose-200">Authentication Error</p>
              <p className="text-xs text-rose-800 dark:text-rose-300 mt-0.5">{driveError}</p>
            </div>
          </div>
          <button onClick={dismissParams} className="text-rose-700 dark:text-rose-400 hover:opacity-75 text-xs font-semibold cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Connection Status Box */}
      <div className="p-5 rounded-2xl bg-gray-50/70 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Connection Health</span>
            <div className="flex items-center gap-2 mt-1">
              {status?.connected ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Connected ({status.accountEmail || 'Authorized Account'})
                </span>
              ) : status?.configured ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Ready to Connect
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Credentials Required in Vercel
                </span>
              )}
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center gap-2">
            {status?.connected ? (
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 transition-all cursor-pointer"
              >
                {isDisconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlink className="w-3.5 h-3.5" />}
                <span>Disconnect</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConnect}
                disabled={!status?.configured}
                className="inline-flex items-center gap-2 h-10 px-5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-sm shadow-blue-500/20 cursor-pointer"
              >
                <HardDrive className="w-4 h-4" />
                <span>Connect Google Drive</span>
              </button>
            )}
          </div>
        </div>

        {/* Scope Indicator */}
        <div className="pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-gray-400" />
            <span>
              Authorized Scope: <code className="font-mono text-[11px] text-gray-800 dark:text-gray-200">https://www.googleapis.com/auth/drive.file</code>
            </span>
          </div>
          <span className="text-[11px] text-gray-400 hidden sm:inline">Least-Privilege Enforcement</span>
        </div>
      </div>

      {/* Destination Folders Overview & Action Controls */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Evidence Destination Folders
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Under Google's <code className="font-mono text-[11px]">drive.file</code> scope, folders must be authorized via Google Picker or provisioned by the app.
            </p>
          </div>

          {status?.connected && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleAutoProvisionFolders(status?.folders?.root?.accessible ? status.folders.root.id : undefined)}
                disabled={isProvisioning}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isProvisioning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>Auto-Provision Subfolders</span>
              </button>
            </div>
          )}
        </div>

        {provisionResult && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-xs text-emerald-800 dark:text-emerald-200">
            {provisionResult}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* 1. Root Folder Card */}
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 space-y-2.5 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-900 dark:text-white">Main Evidence Root</span>
                {status?.folders?.root?.accessible ? (
                  <span className="text-emerald-500 flex items-center gap-1 text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> Ready
                  </span>
                ) : (
                  <span className="text-amber-500 flex items-center gap-1 text-[11px] font-medium bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full">
                    <AlertTriangle className="w-3 h-3" /> Pending Auth
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                {status?.folders?.root?.name || 'Configured Vault Root'}
              </p>
              <code className="text-[11px] font-mono text-gray-600 dark:text-gray-300 block break-all bg-black/5 dark:bg-white/5 p-1.5 rounded-lg">
                {status?.effectiveFolders?.rootFolderId || status?.requiredFolders?.rootFolderId || '1M7uMS4jEqcZcHqAcFo4xFKMw4Zq3U8OR'}
              </code>
            </div>

            <button
              type="button"
              onClick={() => handleOpenPicker('root')}
              disabled={isPickerOpening === 'root' || !status?.connected}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-white/10 hover:bg-black/5 dark:hover:bg-white/15 border border-black/10 dark:border-white/10 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isPickerOpening === 'root' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MousePointerClick className="w-3.5 h-3.5" />}
              <span>Authorise via Picker</span>
            </button>
          </div>

          {/* 2. Photo Evidence Folder Card */}
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 space-y-2.5 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-900 dark:text-white">Photo Evidence</span>
                {status?.folders?.photos?.accessible ? (
                  <span className="text-emerald-500 flex items-center gap-1 text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> Ready
                  </span>
                ) : (
                  <span className="text-amber-500 flex items-center gap-1 text-[11px] font-medium bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full">
                    <AlertTriangle className="w-3 h-3" /> Pending Auth
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                {status?.folders?.photos?.name || 'Photo Destination'}
              </p>
              <code className="text-[11px] font-mono text-gray-600 dark:text-gray-300 block break-all bg-black/5 dark:bg-white/5 p-1.5 rounded-lg">
                {status?.effectiveFolders?.photoFolderId || status?.requiredFolders?.photoFolderId || '1IAAhox8zZx1uCUwumiBtg0ZTKHvMfOM9'}
              </code>
            </div>

            <button
              type="button"
              onClick={() => handleOpenPicker('photos')}
              disabled={isPickerOpening === 'photos' || !status?.connected}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-white/10 hover:bg-black/5 dark:hover:bg-white/15 border border-black/10 dark:border-white/10 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isPickerOpening === 'photos' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MousePointerClick className="w-3.5 h-3.5" />}
              <span>Authorise via Picker</span>
            </button>
          </div>

          {/* 3. Video Evidence Folder Card */}
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 space-y-2.5 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-900 dark:text-white">Video Evidence</span>
                {status?.folders?.videos?.accessible ? (
                  <span className="text-emerald-500 flex items-center gap-1 text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> Ready
                  </span>
                ) : (
                  <span className="text-amber-500 flex items-center gap-1 text-[11px] font-medium bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full">
                    <AlertTriangle className="w-3 h-3" /> Pending Auth
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                {status?.folders?.videos?.name || 'Video Destination'}
              </p>
              <code className="text-[11px] font-mono text-gray-600 dark:text-gray-300 block break-all bg-black/5 dark:bg-white/5 p-1.5 rounded-lg">
                {status?.effectiveFolders?.videoFolderId || status?.requiredFolders?.videoFolderId || '1xLTaHhSU1iaCmpTXMPK6EXqFY13QLR-V'}
              </code>
            </div>

            <button
              type="button"
              onClick={() => handleOpenPicker('videos')}
              disabled={isPickerOpening === 'videos' || !status?.connected}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-white/10 hover:bg-black/5 dark:hover:bg-white/15 border border-black/10 dark:border-white/10 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isPickerOpening === 'videos' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MousePointerClick className="w-3.5 h-3.5" />}
              <span>Authorise via Picker</span>
            </button>
          </div>
        </div>
      </div>

      {/* Manual Folder ID Check & Assignment */}
      <div className="p-5 rounded-2xl bg-gray-50/70 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5" />
          Verify & Assign Folder by ID
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Enter any Google Drive Folder ID to verify write access or bind it directly to an evidence destination.
        </p>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            placeholder="Paste Google Drive Folder ID (e.g. 1IAAhox8zZx1uCUwumiBtg0ZTKHvMfOM9)"
            value={manualFolderId}
            onChange={(e) => setManualFolderId(e.target.value)}
            className="flex-1 px-3 py-2 bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />

          <select
            value={manualFolderType}
            onChange={(e) => setManualFolderType(e.target.value as any)}
            className="px-3 py-2 bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none"
          >
            <option value="photos">Assign to Photo Evidence</option>
            <option value="videos">Assign to Video Evidence</option>
            <option value="root">Assign to Main Evidence Root</option>
          </select>

          <button
            type="button"
            onClick={handleVerifyManualFolder}
            disabled={isVerifyingManual || !manualFolderId.trim() || !status?.connected}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-black transition-all cursor-pointer disabled:opacity-50"
          >
            {isVerifyingManual ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            <span>Verify & Assign</span>
          </button>
        </div>

        {manualVerifyResult && (
          <div className={`p-3 rounded-xl text-xs ${manualVerifyResult.success ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/40' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800/40'}`}>
            {manualVerifyResult.success ? (
              <div className="space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Folder Verified: {manualVerifyResult.data?.name} ({manualVerifyResult.data?.id})
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                  Write capability confirmed (canAddChildren: {String(manualVerifyResult.data?.canAddChildren)}). Assigned to {manualVerifyResult.data?.folderType}.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  Access Check Failed
                </p>
                <p className="text-[11px] text-rose-700 dark:text-rose-300">
                  {manualVerifyResult.error?.message || manualVerifyResult.data?.error}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Copyable Environment Variables Snippet for Permanent Vercel Configuration */}
      <div className="p-5 rounded-2xl bg-gray-50/70 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
            Permanent Vercel Environment Variables
          </span>
          <button
            type="button"
            onClick={() => copyToClipboard(envSnippet, 'envSnippet')}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-600 hover:text-primary-700 cursor-pointer"
          >
            {copiedField === 'envSnippet' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedField === 'envSnippet' ? 'Copied' : 'Copy All'}
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Save these verified folder IDs in Vercel Production Environment Variables so they persist indefinitely across new builds:
        </p>
        <pre className="font-mono text-[11px] text-gray-800 dark:text-gray-200 bg-black/5 dark:bg-white/5 p-3 rounded-xl overflow-x-auto">
          {envSnippet}
        </pre>
      </div>
    </motion.div>
  );
}
