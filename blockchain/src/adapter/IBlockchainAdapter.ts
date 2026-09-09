import { BlockchainProof, EvidenceProof, VerificationDetails } from '../chaincode/types.js';

export interface AnchorEvidenceParams {
  evidenceId: string;
  assetId: string;
  evidenceHash: string;
  timestamp: string;
  signerReference: string;
}

export type AnchorStatus = 'ANCHORED' | 'FAILED' | 'PENDING';

export interface AnchorEvidenceResult {
  transactionId: string | null;
  status: AnchorStatus;
  proofReference: string;
  anchoredAt?: string;
  proof?: BlockchainProof;
  error?: string;
}

export interface VerifyEvidenceParams {
  evidenceId: string;
  calculatedHash: string;
}

export type VerificationOutcome =
  | 'VERIFIED'
  | 'INTEGRITY_MISMATCH'
  | 'PROOF_NOT_FOUND'
  | 'FAILED';

export interface VerifyEvidenceResult {
  isValid: boolean;
  trustedHash: string | null;
  calculatedHash: string;
  status: VerificationOutcome;
  transactionId?: string;
  proofReference?: string;
  details?: VerificationDetails;
  blockchainProof?: BlockchainProof;
  error?: string;
}

export interface IBlockchainAdapter {
  anchorEvidence(params: AnchorEvidenceParams): Promise<AnchorEvidenceResult>;
  verifyEvidence(params: VerifyEvidenceParams): Promise<VerifyEvidenceResult>;
  getEvidenceProof(evidenceId: string): Promise<EvidenceProof>;
  isHealthy(): Promise<{ isConnected: boolean; details: Record<string, unknown> }>;
}
