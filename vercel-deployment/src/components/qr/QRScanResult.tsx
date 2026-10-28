import { QrCode, CheckCircle, AlertCircle, Copy, ExternalLink, X } from 'lucide-react';
import { Button } from '@components/ui';
import { Card } from '@components/ui';
import { Badge } from '@components/ui';
import { useState } from 'react';

interface QRScanResultProps {
  result: string;
  assetId?: string;
  assetTag?: string;
  onClose: () => void;
  onConfirm: () => void;
  onViewAsset?: () => void;
}

export function QRScanResult({ result, assetId, assetTag, onClose, onConfirm, onViewAsset }: QRScanResultProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl max-w-md w-full animate-scale-in">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">QR Code Scanned</h3>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-4 text-center">
            <QrCode className="h-10 w-10 mx-auto mb-2 text-gray-400" />
            <p className="font-mono text-sm text-gray-600 break-all">{result}</p>
            <Button variant="ghost" size="sm" onClick={handleCopy} className="mt-2">
              {copied ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </>
              )}
            </Button>
          </div>

          {assetId && assetTag && (
            <Card variant="outlined" className="mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary-100 flex items-center justify-center">
                  <QrCode className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Asset Identified</p>
                  <p className="text-sm text-gray-500">{assetTag}</p>
                </div>
                <Badge variant="success" className="ml-auto">Verified</Badge>
              </div>
            </Card>
          )}

          <div className="flex gap-3">
            {onViewAsset && (
              <Button variant="outline" onClick={onViewAsset} className="flex-1">
                <ExternalLink className="h-4 w-4 mr-2" />
                View Asset
              </Button>
            )}
            <Button onClick={onConfirm} className="flex-1 bg-primary-500 hover:bg-primary-600">
              Start Evidence Capture
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}