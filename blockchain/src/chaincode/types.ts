export type ProofStatus = 'PENDING' | 'ANCHORED' | 'FAILED';

export interface BlockchainProof {
  evidenceId: string;
  assetId: string;
  evidenceHash: string;
  timestamp: string;
  signerReference: string;
  transactionId: string;
  status: ProofStatus;
  proofReference: string;
  anchoredAt: string;
  anchoredAtLedgerTime?: string;
  blockNumber: number;
  blockHash: string;
  merkleRoot: string;
  merkleProof: string[];
  network: string;
}

export type EvidenceProof = BlockchainProof;

export type VerificationStatus = 'VERIFIED' | 'INTEGRITY MISMATCH' | 'PROOF_NOT_FOUND';

export interface VerificationDiscrepancy {
  field: string;
  expected: string;
  actual: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface VerificationDetails {
  hashMatch: boolean;
  signatureValid: boolean;
  blockchainAnchored: boolean;
  chainIntact: boolean;
  timestampValid: boolean;
  discrepancies: VerificationDiscrepancy[];
}

export interface ChaincodeVerificationResult {
  isValid: boolean;
  status: VerificationStatus;
  trustedHash: string | null;
  calculatedHash: string;
  evidenceId: string;
  assetId?: string;
  transactionId?: string;
  anchoredTimestamp?: string;
  details: VerificationDetails;
  blockchainProof?: BlockchainProof;
  message: string;
}

export interface IterationKV {
  key: string;
  value: Uint8Array;
}

export interface StubIterator {
  next(): Promise<{ value?: IterationKV; done: boolean }>;
  close(): Promise<void>;
}

export interface IChaincodeStub {
  getState(key: string): Promise<Uint8Array | null | undefined>;
  putState(key: string, value: Uint8Array): Promise<void>;
  deleteState(key: string): Promise<void>;
  getTxID(): string;
  getTxTimestamp(): { seconds: { low: number; high?: number }; nanos: number };
  createCompositeKey(objectType: string, attributes: string[]): string;
  splitCompositeKey(compositeKey: string): { objectType: string; attributes: string[] };
  getStateByPartialCompositeKey(objectType: string, attributes: string[]): Promise<StubIterator>;
}

export interface IChaincodeContext {
  stub: IChaincodeStub;
  clientIdentity?: {
    getMSPID(): string;
    getID(): string;
  };
}
