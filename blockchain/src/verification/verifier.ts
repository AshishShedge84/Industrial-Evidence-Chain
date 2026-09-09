import { hashEvidencePackage } from '../hashing/hasher.js';
import { EvidencePackage } from '../canonicalizer/types.js';
import { IBlockchainAdapter, VerifyEvidenceResult } from '../adapter/IBlockchainAdapter.js';

import { BlockchainProof, VerificationDetails } from '../chaincode/types.js';

export interface VerificationReport {
  isValid: boolean;
  status: 'VERIFIED' | 'INTEGRITY_MISMATCH' | 'PROOF_NOT_FOUND' | 'FAILED';
  evidenceId: string;
  calculatedHash: string;
  trustedHash: string | null;
  transactionId?: string;
  verifiedAt: string;
  explanation: string;
  disclaimer: string;
  details?: VerificationDetails;
  blockchainProof?: BlockchainProof;
}

export const VERIFICATION_DISCLAIMER =
  'VERIFIED confirms that the digital evidence state corresponds identically to the cryptographic proof anchored on Hyperledger Fabric. It does not certify the physical veracity of the real-world industrial event.';

/**
 * End-to-end evidence verification pipeline.
 * Reconstructs canonical representation, recalculates SHA-256, queries blockchain proof, and compares.
 */
export async function verifyEvidenceIntegrity(
  evidence: EvidencePackage,
  adapter: IBlockchainAdapter
): Promise<VerificationReport> {
  const verifiedAt = new Date().toISOString();

  // Step 1: Reconstruct canonical representation and compute current SHA-256
  let calculatedHash: string;
  try {
    const hashResult = hashEvidencePackage(evidence);
    calculatedHash = hashResult.evidenceHash;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      isValid: false,
      status: 'FAILED',
      evidenceId: evidence?.evidenceId || 'unknown',
      calculatedHash: '',
      trustedHash: null,
      verifiedAt,
      explanation: `Evidence canonicalization failed: ${msg}`,
      disclaimer: VERIFICATION_DISCLAIMER,
    };
  }

  // Step 2: Query trusted blockchain proof via adapter
  const adapterResult: VerifyEvidenceResult = await adapter.verifyEvidence({
    evidenceId: evidence.evidenceId,
    calculatedHash,
  });

  let explanation: string;
  if (adapterResult.status === 'VERIFIED') {
    explanation = `Integrity Verified: Calculated SHA-256 matches blockchain proof (${calculatedHash.substring(0, 16)}...).`;
  } else if (adapterResult.status === 'INTEGRITY_MISMATCH') {
    explanation = `INTEGRITY ALERT: Reconstructed hash (${calculatedHash.substring(0, 16)}...) DOES NOT MATCH trusted ledger hash (${adapterResult.trustedHash?.substring(0, 16)}...). Data has been tampered with or modified.`;
  } else if (adapterResult.status === 'PROOF_NOT_FOUND') {
    explanation = `Proof Not Found: No blockchain proof exists for evidenceId '${evidence.evidenceId}'.`;
  } else {
    explanation = `Blockchain Adapter Failure: ${adapterResult.error || 'Unknown error'}`;
  }

  return {
    isValid: adapterResult.isValid,
    status: adapterResult.status,
    evidenceId: evidence.evidenceId,
    calculatedHash,
    trustedHash: adapterResult.trustedHash,
    transactionId: adapterResult.transactionId,
    verifiedAt,
    explanation,
    disclaimer: VERIFICATION_DISCLAIMER,
    details: adapterResult.details,
    blockchainProof: adapterResult.blockchainProof,
  };
}
