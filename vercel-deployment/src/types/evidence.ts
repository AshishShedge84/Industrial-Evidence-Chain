export type ActivityType =
  | 'Maintenance'
  | 'Inspection'
  | 'Repair'
  | 'Calibration'
  | 'Safety'
  | 'Quality'
  | 'Audit'
  | 'Incident'
  | 'SparePart'
  | 'Transfer'
  | 'Decommissioning'
  | 'Commissioning';

export type EvidenceStatus =
  | 'Draft'
  | 'Submitted'
  | 'Anchored'
  | 'Verified'
  | 'IntegrityMismatch'
  | 'Failed';

export interface EvidenceLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
  timestamp: string;
}

export interface MediaReference {
  id: string;
  type: 'photo' | 'video';
  url: string;
  thumbnailUrl?: string;
  size: number;
  mimeType: string;
  duration?: number;
  width?: number;
  height?: number;
  checksum?: string;
  capturedAt: string;
  uploadedAt?: string;
  driveFileId?: string;
  driveFolderId?: string;
}

export interface Evidence {
  evidenceId: string;
  assetId: string;
  userId: string;
  activityType: ActivityType;
  timestamp: string;
  location: EvidenceLocation;
  description: string;
  mediaReferences: MediaReference[];
  status: EvidenceStatus;
  blockchainProof?: BlockchainProof;
  evidenceHash?: string;
  assetName?: string;
  assetCode?: string;
  userName?: string;
  userRole?: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  anchoredAt?: string;
  verifiedAt?: string;
  verificationStatus?: string;
  verifiedBy?: string;
  assignedManagerId?: string;
  assignedManagerName?: string;
  transactionId?: string;
  mediaHashes?: string[];
  anchorStatus?: string;
}

export interface BlockchainProof {
  evidenceId?: string;
  evidenceHash?: string;
  transactionId: string;
  status?: string;
  proofReference?: string;
  anchoredAt?: string;
  blockNumber: number;
  blockHash: string;
  merkleRoot: string;
  merkleProof: string[];
  timestamp: string;
  network: string;
}

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

export interface CreateEvidenceRequest {
  assetId: string;
  userId: string;
  activityType: ActivityType;
  timestamp: string;
  location: EvidenceLocation;
  description: string;
  mediaReferences: Omit<MediaReference, 'id' | 'url' | 'thumbnailUrl' | 'uploadedAt' | 'checksum'>[];
}

export interface EvidenceUploadRequest {
  evidenceId: string;
  files: File[];
}

export interface EvidenceSearchParams {
  assetId?: string;
  userId?: string;
  activityType?: ActivityType;
  status?: EvidenceStatus;
  verificationStatus?: string;
  assignedManagerId?: string;
  query?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface EvidenceListResponse {
  items: Evidence[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}