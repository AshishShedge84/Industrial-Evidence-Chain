import { apiClient, isMockMode } from '@services/api/apiClient';
import type { Evidence, CreateEvidenceRequest, EvidenceSearchParams, EvidenceListResponse, EvidenceUploadRequest, BlockchainProof, VerificationResult } from '@type-defs/evidence';
import type { ApiResponse } from '@type-defs/api';
import { mockEvidenceService } from '@mocks/index';

export interface EvidenceService {
  getEvidenceList(params?: EvidenceSearchParams): Promise<ApiResponse<EvidenceListResponse>>;
  getEvidence(id: string): Promise<ApiResponse<Evidence>>;
  createEvidence(data: CreateEvidenceRequest): Promise<ApiResponse<Evidence>>;
  uploadMedia(evidenceId: string, files: File[], onProgress?: (progress: number) => void): Promise<ApiResponse<Evidence>>;
  submitEvidence(evidenceId: string): Promise<ApiResponse<Evidence>>;
  anchorEvidence(evidenceId: string): Promise<ApiResponse<BlockchainProof>>;
  verifyEvidence(evidenceId: string): Promise<ApiResponse<VerificationResult>>;
}

class EvidenceServiceImpl implements EvidenceService {
  async getEvidenceList(params?: EvidenceSearchParams): Promise<ApiResponse<EvidenceListResponse>> {
    if (isMockMode()) {
      return mockEvidenceService.getEvidenceList(params);
    }
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
    }
    return apiClient.get<EvidenceListResponse>(`/evidence?${searchParams.toString()}`);
  }

  async getEvidence(id: string): Promise<ApiResponse<Evidence>> {
    if (isMockMode()) {
      return mockEvidenceService.getEvidence(id);
    }
    return apiClient.get<Evidence>(`/evidence/${id}`);
  }

  async createEvidence(data: CreateEvidenceRequest): Promise<ApiResponse<Evidence>> {
    if (isMockMode()) {
      return mockEvidenceService.createEvidence(data);
    }
    return apiClient.post<Evidence>('/evidence', data);
  }

  async uploadMedia(
    evidenceId: string,
    files: File[],
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<Evidence>> {
    if (isMockMode()) {
      return mockEvidenceService.uploadMedia(evidenceId, files);
    }
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return apiClient.upload<Evidence>(`/evidence/${evidenceId}/upload`, formData, onProgress);
  }

  async submitEvidence(evidenceId: string): Promise<ApiResponse<Evidence>> {
    if (isMockMode()) {
      return mockEvidenceService.submitEvidence(evidenceId);
    }
    return apiClient.post<Evidence>(`/evidence/${evidenceId}/submit`);
  }

  async anchorEvidence(evidenceId: string): Promise<ApiResponse<BlockchainProof>> {
    if (isMockMode()) {
      return mockEvidenceService.anchorEvidence(evidenceId);
    }
    return apiClient.post<BlockchainProof>(`/evidence/${evidenceId}/anchor`);
  }

  async verifyEvidence(evidenceId: string): Promise<ApiResponse<VerificationResult>> {
    if (isMockMode()) {
      return mockEvidenceService.verifyEvidence(evidenceId);
    }
    return apiClient.post<VerificationResult>(`/evidence/${evidenceId}/verify`);
  }
}

export const evidenceService = new EvidenceServiceImpl();