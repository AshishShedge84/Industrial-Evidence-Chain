export interface VerificationRequest {
  evidenceId: string;
}

export interface VerificationResponse {
  success: boolean;
  result: VerificationResult;
}

export interface BatchVerificationRequest {
  evidenceIds: string[];
}

export interface BatchVerificationResponse {
  results: VerificationResult[];
  summary: {
    total: number;
    verified: number;
    failed: number;
    mismatched: number;
  };
}

export interface VerificationStatus {
  evidenceId: string;
  status: 'pending' | 'verifying' | 'completed' | 'failed';
  progress?: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface BlockchainAnchorRequest {
  evidenceId: string;
}

export interface BlockchainAnchorResponse {
  success: boolean;
  proof: BlockchainProof;
}

export interface BlockchainProof {
  transactionId: string;
  blockNumber: number;
  blockHash: string;
  merkleRoot: string;
  merkleProof: string[];
  timestamp: string;
  network: string;
}

export interface AuditTrailEntry {
  id: string;
  evidenceId: string;
  action: AuditAction;
  performedBy: string;
  performedAt: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export type AuditAction =
  | 'EvidenceCreated'
  | 'EvidenceSubmitted'
  | 'EvidenceAnchored'
  | 'EvidenceVerified'
  | 'EvidenceRejected'
  | 'EvidenceModified'
  | 'MediaUploaded'
  | 'MediaDeleted'
  | 'StatusChanged'
  | 'AccessGranted'
  | 'AccessRevoked';

// Re-export shared types
export interface VerificationResult {
  evidenceId: string;
  isValid: boolean;
  verifiedAt: string;
  checkedBy: string;
  details: VerificationDetails;
  blockchainProof?: BlockchainProof;
}

export interface VerificationDetails {
  hashMatch: boolean;
  signatureValid: boolean;
  blockchainAnchored: boolean;
  chainIntact: boolean;
  timestampValid: boolean;
  discrepancies: VerificationDiscrepancy[];
}

export interface VerificationDiscrepancy {
  field: string;
  expected: string;
  actual: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}