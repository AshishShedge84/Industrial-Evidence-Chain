import { apiClient, isMockMode } from '@services/api/apiClient';
import type { VerificationResult, BatchVerificationRequest, BatchVerificationResponse, VerificationStatus, BlockchainProof, AuditTrailEntry } from '@type-defs/verification';
import type { ApiResponse } from '@type-defs/api';
import { mockVerificationService } from '@mocks/index';

export interface VerificationService {
  verifyEvidence(evidenceId: string): Promise<ApiResponse<VerificationResult>>;
  batchVerify(request: BatchVerificationRequest): Promise<ApiResponse<BatchVerificationResponse>>;
  getVerificationStatus(evidenceId: string): Promise<ApiResponse<VerificationStatus>>;
  getBlockchainProof(evidenceId: string): Promise<ApiResponse<BlockchainProof>>;
  getAuditTrail(evidenceId: string): Promise<ApiResponse<AuditTrailEntry[]>>;
}

class VerificationServiceImpl implements VerificationService {
  async verifyEvidence(evidenceId: string): Promise<ApiResponse<VerificationResult>> {
    if (isMockMode()) {
      return mockVerificationService.verifyEvidence(evidenceId);
    }
    return apiClient.post<VerificationResult>(`/evidence/${evidenceId}/verify`);
  }

  async batchVerify(request: BatchVerificationRequest): Promise<ApiResponse<BatchVerificationResponse>> {
    if (isMockMode()) {
      return mockVerificationService.batchVerify(request);
    }
    return apiClient.post<BatchVerificationResponse>('/evidence/batch-verify', request);
  }

  async getVerificationStatus(evidenceId: string): Promise<ApiResponse<VerificationStatus>> {
    if (isMockMode()) {
      return mockVerificationService.getVerificationStatus(evidenceId);
    }
    return apiClient.get<VerificationStatus>(`/evidence/${evidenceId}/verification-status`);
  }

  async getBlockchainProof(evidenceId: string): Promise<ApiResponse<BlockchainProof>> {
    if (isMockMode()) {
      return mockVerificationService.getBlockchainProof(evidenceId);
    }
    return apiClient.get<BlockchainProof>(`/evidence/${evidenceId}/proof`);
  }

  async getAuditTrail(evidenceId: string): Promise<ApiResponse<AuditTrailEntry[]>> {
    if (isMockMode()) {
      return mockVerificationService.getAuditTrail(evidenceId);
    }
    return apiClient.get<AuditTrailEntry[]>(`/evidence/${evidenceId}/audit-trail`);
  }
}

export const verificationService = new VerificationServiceImpl();