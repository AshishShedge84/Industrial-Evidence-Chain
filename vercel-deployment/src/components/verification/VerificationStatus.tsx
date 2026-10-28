import { useState } from 'react';
import { Loader2, CheckCircle, AlertCircle, Clock, XCircle, Link, Copy } from 'lucide-react';
import { Card } from '@components/ui';
import { Badge } from '@components/ui';
import { Button } from '@components/ui';
import type { VerificationStatus } from '@type-defs/verification';

interface VerificationStatusProps {
  status: VerificationStatus | null;
  onRetry?: () => void;
}

export function VerificationStatus({ status, onRetry }: VerificationStatusProps) {
  if (!status) {
    return (
      <Card>
        <div className="text-center py-8">
          <Clock className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No verification status available</p>
        </div>
      </Card>
    );
  }

  const statusConfig = {
    pending: { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-100', label: 'Pending' },
    verifying: { icon: Loader2, color: 'text-primary-500', bg: 'bg-primary-100', label: 'Verifying...' },
    completed: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100', label: 'Completed' },
    failed: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-100', label: 'Failed' },
  };

  const config = statusConfig[status.status];

  return (
    <Card>
      <div className="flex items-center gap-4">
        <div className={`h-12 w-12 rounded-full flex items-center justify-center ${config.bg}`}>
          {config.icon !== Loader2 ? (
            <config.icon className={`h-6 w-6 ${config.color}`} />
          ) : (
            <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Badge variant={status.status === 'completed' ? 'success' : status.status === 'failed' ? 'error' : status.status === 'verifying' ? 'info' : 'neutral'} size="lg">
              {config.label}
            </Badge>
            {status.progress !== undefined && (
              <span className="text-sm text-gray-500">{Math.round(status.progress)}%</span>
            )}
          </div>
          <div className="mt-1 text-sm text-gray-500">
            {status.startedAt && `Started: ${new Date(status.startedAt).toLocaleString()}`}
            {status.completedAt && ` • Completed: ${new Date(status.completedAt).toLocaleString()}`}
          </div>
          {status.error && (
            <p className="mt-2 text-sm text-red-600">{status.error}</p>
          )}
        </div>
        {status.status === 'failed' && onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        )}
      </div>
      {status.progress !== undefined && status.status === 'verifying' && (
        <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-500 transition-all duration-300"
            style={{ width: `${status.progress}%` }}
          />
        </div>
      )}
    </Card>
  );
}

interface BlockchainProofProps {
  proof: {
    transactionId: string;
    blockNumber: number;
    blockHash: string;
    merkleRoot: string;
    merkleProof: string[];
    timestamp: string;
    network: string;
  } | null;
}

export function BlockchainProof({ proof }: BlockchainProofProps) {
  if (!proof) {
    return (
      <Card>
        <div className="text-center py-8">
          <Link className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No blockchain proof available</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h4 className="font-semibold text-gray-900 mb-4">Blockchain Anchor Proof</h4>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <ProofField label="Transaction ID" value={proof.transactionId} copyable />
          <ProofField label="Block Number" value={proof.blockNumber.toLocaleString()} />
          <ProofField label="Block Hash" value={proof.blockHash} copyable />
          <ProofField label="Network" value={proof.network} />
          <ProofField label="Merkle Root" value={proof.merkleRoot} copyable />
          <ProofField label="Anchored At" value={new Date(proof.timestamp).toLocaleString()} />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Merkle Proof</p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {proof.merkleProof.map((hash, index) => (
              <div key={index} className="flex items-center gap-2 text-xs font-mono text-gray-600 bg-gray-50 p-2 rounded">
                <span className="text-gray-400">{index + 1}.</span>
                <span className="break-all flex-1">{hash}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function ProofField({ label, value, copyable }: { label: string; value: string; copyable?: boolean }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <div className="flex items-center gap-2 mt-1">
        <code className="flex-1 text-sm font-mono text-gray-900 bg-gray-50 px-2 py-1.5 rounded break-all">{value}</code>
        {copyable && (
          <button
            onClick={handleCopy}
            className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${copied ? 'text-green-500' : 'text-gray-400'}`}
            title="Copy"
          >
            {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
}