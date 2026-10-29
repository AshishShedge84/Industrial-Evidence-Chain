import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  ExternalLink
} from 'lucide-react';
import { googleDriveService, type GoogleDriveStatus } from '@services/drive/googleDriveService';

export function GoogleDriveIntegrationCard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState<GoogleDriveStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisionResult, setProvisionResult] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

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

  const handleAutoProvisionFolders = async () => {
    setIsProvisioning(true);
    setProvisionResult(null);
    try {
      const res = await googleDriveService.createFolders();
      if (res.success && res.data) {
        setProvisionResult(
          `Created folders: Root (${res.data.rootFolderId}), Photo (${res.data.photoFolderId}), Video (${res.data.videoFolderId}). Refreshing connection health...`
        );
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
                Phase 1
              </span>
            </div>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 font-medium">
              Enterprise binary media archiving with SHA-256 verification and least-privilege scoping.
            </p>
          </div>
        </div>

        <button
          onClick={fetchStatus}
          disabled={isLoading}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          title="Refresh connection status"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* OAuth Banner Alerts */}
      {driveConnected && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>
              Google Drive OAuth connected successfully! {driveAccount ? `Account: ${driveAccount}` : ''}
            </span>
          </div>
          <button onClick={dismissParams} className="font-semibold underline ml-2 hover:opacity-80 cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {driveError && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 flex items-center justify-between text-xs text-rose-800 dark:text-rose-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>OAuth connection error: {driveError}</span>
          </div>
          <button onClick={dismissParams} className="font-semibold underline ml-2 hover:opacity-80 cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Connection Status Card */}
      <div className="p-5 rounded-2xl bg-gray-50/80 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 block mb-1">
              Connection Status
            </span>
            <div className="flex items-center gap-2">
              {status?.connected ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Connected {status.accountEmail ? `(${status.accountEmail})` : ''}
                </span>
              ) : status?.configured ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300/40">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Credentials Detected · Ready to Connect
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-300/40">
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

      {/* Setup Guide when credentials are not yet saved in Vercel */}
      {!status?.configured && (
        <div className="p-5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 space-y-3.5">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                Vercel Environment Setup Required
              </h4>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
                To enable the <strong>Connect Google Drive</strong> button, set your Google Cloud OAuth Client credentials in your Vercel Project Settings.
              </p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="bg-white/80 dark:bg-black/40 p-3 rounded-xl border border-amber-200/40 dark:border-amber-800/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">Authorized Redirect URI (exact):</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(redirectUri, 'uri')}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-600 hover:text-primary-700 cursor-pointer"
                >
                  {copiedField === 'uri' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedField === 'uri' ? 'Copied' : 'Copy URI'}
                </button>
              </div>
              <code className="font-mono text-[11px] text-gray-800 dark:text-gray-200 block break-all bg-black/5 dark:bg-white/5 p-2 rounded-lg">
                {redirectUri}
              </code>
            </div>

            <div className="bg-white/80 dark:bg-black/40 p-3 rounded-xl border border-amber-200/40 dark:border-amber-800/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">Authorized JavaScript Origin:</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(jsOrigin, 'origin')}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-600 hover:text-primary-700 cursor-pointer"
                >
                  {copiedField === 'origin' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedField === 'origin' ? 'Copied' : 'Copy Origin'}
                </button>
              </div>
              <code className="font-mono text-[11px] text-gray-800 dark:text-gray-200 block break-all bg-black/5 dark:bg-white/5 p-2 rounded-lg">
                {jsOrigin}
              </code>
            </div>
          </div>
        </div>
      )}

      {/* Scope Auto-Provisioning Helper when folders need drive.file authorization */}
      {anyFolderPending && (
        <div className="p-5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 space-y-3">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wider">
                Folder Authorization Under drive.file Scope
              </h4>
              <p className="text-xs text-blue-800 dark:text-blue-300 mt-1 leading-relaxed">
                Google Drive is connected, but your pre-created folders show "Pending" because Google's least-privilege <code className="font-mono text-[11px]">drive.file</code> scope only permits access to folders created by this app.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleAutoProvisionFolders}
              disabled={isProvisioning}
              className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isProvisioning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderPlus className="w-3.5 h-3.5" />}
              <span>Auto-Provision Evidence Folders in My Drive</span>
            </button>
          </div>

          {provisionResult && (
            <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
              {provisionResult}
            </p>
          )}
        </div>
      )}

      {/* Configured Folders Overview */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
          Configured Evidence Folders
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* 1. Root Folder */}
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-900 dark:text-white">Main Evidence Root</span>
              {status?.folders?.root?.accessible ? (
                <span className="text-emerald-500 flex items-center gap-1 text-[11px] font-medium">
                  <CheckCircle2 className="w-3 h-3" /> Ready
                </span>
              ) : (
                <span className="text-amber-500 flex items-center gap-1 text-[11px] font-medium">
                  <AlertTriangle className="w-3 h-3" /> Pending
                </span>
              )}
            </div>
            <code className="text-[11px] font-mono text-gray-500 dark:text-gray-400 block break-all">
              {status?.requiredFolders?.rootFolderId || '1M7uMS4jEqcZcHqAcFo4xFKMw4Zq3U8OR'}
            </code>
            {status?.folders?.root?.scopeNotice && (
              <p className="text-[10px] text-gray-400 leading-tight pt-1">
                {status.folders.root.scopeNotice}
              </p>
            )}
          </div>

          {/* 2. Photo Evidence */}
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-900 dark:text-white">Photo Evidence</span>
              {status?.folders?.photos?.accessible ? (
                <span className="text-emerald-500 flex items-center gap-1 text-[11px] font-medium">
                  <CheckCircle2 className="w-3 h-3" /> Ready
                </span>
              ) : (
                <span className="text-amber-500 flex items-center gap-1 text-[11px] font-medium">
                  <AlertTriangle className="w-3 h-3" /> Pending
                </span>
              )}
            </div>
            <code className="text-[11px] font-mono text-gray-500 dark:text-gray-400 block break-all">
              {status?.requiredFolders?.photoFolderId || '1IAAhox8zZx1uCUwumiBtg0ZTKHvMfOM9'}
            </code>
          </div>

          {/* 3. Video Evidence */}
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-900 dark:text-white">Video Evidence</span>
              {status?.folders?.videos?.accessible ? (
                <span className="text-emerald-500 flex items-center gap-1 text-[11px] font-medium">
                  <CheckCircle2 className="w-3 h-3" /> Ready
                </span>
              ) : (
                <span className="text-amber-500 flex items-center gap-1 text-[11px] font-medium">
                  <AlertTriangle className="w-3 h-3" /> Pending
                </span>
              )}
            </div>
            <code className="text-[11px] font-mono text-gray-500 dark:text-gray-400 block break-all">
              {status?.requiredFolders?.videoFolderId || '1xLTaHhSU1iaCmpTXMPK6EXqFY13QLR-V'}
            </code>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
