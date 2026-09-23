import { apiClient, isMockMode } from '@services/api/apiClient';
import type { VerificationResult, BatchVerificationRequest, BatchVerificationResponse, VerificationStatus, BlockchainProof, AuditTrailEntry } from '@type-defs/verification';
import type { ApiResponse } from '@type-defs/api';

export interface VerificationService {
  verifyEvidence(evidenceId: string): Promise<ApiResponse<VerificationResult>>;
  getEvidenceVerification(evidenceId: string): Promise<ApiResponse<VerificationResult>>;
  batchVerify(request: BatchVerificationRequest): Promise<ApiResponse<BatchVerificationResponse>>;
  getVerificationStatus(evidenceId: string): Promise<ApiResponse<VerificationStatus>>;
  getBlockchainProof(evidenceId: string): Promise<ApiResponse<BlockchainProof>>;
  getAuditTrail(evidenceId: string): Promise<ApiResponse<AuditTrailEntry[]>>;
}

class VerificationServiceImpl implements VerificationService {
  async verifyEvidence(evidenceId: string): Promise<ApiResponse<VerificationResult>> {
    return apiClient.post<VerificationResult>(`/evidence/${evidenceId}/verify`);
  }

  async getEvidenceVerification(evidenceId: string): Promise<ApiResponse<VerificationResult>> {
    return apiClient.get<VerificationResult>(`/evidence/${evidenceId}/verification`);
  }

  async batchVerify(request: BatchVerificationRequest): Promise<ApiResponse<BatchVerificationResponse>> {
    return apiClient.post<BatchVerificationResponse>('/evidence/batch-verify', request);
  }

  async getVerificationStatus(evidenceId: string): Promise<ApiResponse<VerificationStatus>> {
    return apiClient.get<VerificationStatus>(`/evidence/${evidenceId}/verification-status`);
  }

  async getBlockchainProof(evidenceId: string): Promise<ApiResponse<BlockchainProof>> {
    return apiClient.get<BlockchainProof>(`/evidence/${evidenceId}/proof`);
  }

  async getAuditTrail(evidenceId: string): Promise<ApiResponse<AuditTrailEntry[]>> {
    return apiClient.get<AuditTrailEntry[]>(`/evidence/${evidenceId}/audit-trail`);
  }
}

export const verificationService = new VerificationServiceImpl();