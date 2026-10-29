import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  HardDrive, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  RefreshCw, 
  ShieldCheck, 
  FolderCheck, 
  Lock,
  Unlink,
  Loader2
} from 'lucide-react';
import { googleDriveService, type GoogleDriveStatus } from '@services/drive/googleDriveService';

export function GoogleDriveIntegrationCard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState<GoogleDriveStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    if (!window.confirm('Are you sure you want to disconnect Google Drive? Media uploads will fall back to default storage.')) {
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

  const dismissParams = () => {
    searchParams.delete('drive_connected');
    searchParams.delete('drive_account');
    searchParams.delete('drive_error');
    setSearchParams(searchParams, { replace: true });
  };

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
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
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
          <button onClick={dismissParams} className="font-semibold underline ml-2 hover:opacity-80">
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
          <button onClick={dismissParams} className="font-semibold underline ml-2 hover:opacity-80">
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
                  Client Configured · Awaiting User Authorization
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
            <span>Authorized Scope: <code className="font-mono text-[11px] text-gray-800 dark:text-gray-200">https://www.googleapis.com/auth/drive.file</code></span>
          </div>
          <span className="text-[11px] text-gray-400 hidden sm:inline">Least-Privilege Enforcement</span>
        </div>
      </div>

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
                <span className="text-emerald-500 flex items-center gap-1 text-[11px] font-medium"><CheckCircle2 className="w-3 h-3" /> Ready</span>
              ) : (
                <span className="text-amber-500 flex items-center gap-1 text-[11px] font-medium"><AlertTriangle className="w-3 h-3" /> Pending</span>
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
                <span className="text-emerald-500 flex items-center gap-1 text-[11px] font-medium"><CheckCircle2 className="w-3 h-3" /> Ready</span>
              ) : (
                <span className="text-amber-500 flex items-center gap-1 text-[11px] font-medium"><AlertTriangle className="w-3 h-3" /> Pending</span>
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
                <span className="text-emerald-500 flex items-center gap-1 text-[11px] font-medium"><CheckCircle2 className="w-3 h-3" /> Ready</span>
              ) : (
                <span className="text-amber-500 flex items-center gap-1 text-[11px] font-medium"><AlertTriangle className="w-3 h-3" /> Pending</span>
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
