import type { Evidence, CreateEvidenceRequest, EvidenceSearchParams, EvidenceListResponse, BlockchainProof, VerificationResult } from '@type-defs/evidence';
import type { ApiResponse } from '@type-defs/api';
import { mockEvidence, mockVerificationResults } from './apiResponses';
import { notificationService } from '@services/notification/notificationService';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function filterEvidence(evidence: Evidence[], params?: EvidenceSearchParams): Evidence[] {
  if (!params) return evidence;

  return evidence.filter((e) => {
    if (params.assetId && e.assetId !== params.assetId) return false;
    if (params.userId && e.userId !== params.userId) return false;
    if (params.activityType && e.activityType !== params.activityType) return false;
    if (params.status && e.status !== params.status) return false;
    if (params.startDate && e.timestamp < params.startDate) return false;
    if (params.endDate && e.timestamp > params.endDate) return false;
    return true;
  });
}

export const mockEvidenceService = {
  async getEvidenceList(params?: EvidenceSearchParams): Promise<ApiResponse<EvidenceListResponse>> {
    await delay(300);

    const userEvidence = mockEvidence.filter((e) => e.userId === '1');
    const filtered = filterEvidence(userEvidence, params);
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;
    const start = (page - 1) * pageSize;
    const paginated = filtered.slice(start, start + pageSize);

    return {
      success: true,
      data: {
        items: paginated,
        total: filtered.length,
        page,
        pageSize,
        totalPages: Math.ceil(filtered.length / pageSize),
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req-${Date.now()}`,
        version: '1.0.0',
      },
    };
  },

  async getEvidence(id: string): Promise<ApiResponse<Evidence>> {
    await delay(200);

    const evidence = mockEvidence.find((e) => e.evidenceId === id);
    if (!evidence) {
      return {
        success: false,
        error: {
          code: 'EVIDENCE_NOT_FOUND',
          message: 'Evidence not found',
          statusCode: 404,
        },
      };
    }

    return {
      success: true,
      data: evidence,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req-${Date.now()}`,
        version: '1.0.0',
      },
    };
  },

  async createEvidence(data: CreateEvidenceRequest): Promise<ApiResponse<Evidence>> {
    await delay(500);

    const newEvidence: Evidence = {
      evidenceId: `ev-${Date.now()}`,
      ...data,
      userId: data.userId || '1',
      mediaReferences: data.mediaReferences.map((m, i) => ({
        ...m,
        id: `media-${Date.now()}-${i}`,
        url: '',
        uploadedAt: new Date().toISOString(),
      })),
      status: 'Draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockEvidence.push(newEvidence);

    return {
      success: true,
      data: newEvidence,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req-${Date.now()}`,
        version: '1.0.0',
      },
    };
  },

  async uploadMedia(evidenceId: string, files: File[]): Promise<ApiResponse<Evidence>> {
    await delay(1000);

    const evidence = mockEvidence.find((e) => e.evidenceId === evidenceId);
    if (!evidence) {
      return {
        success: false,
        error: {
          code: 'EVIDENCE_NOT_FOUND',
          message: 'Evidence not found',
          statusCode: 404,
        },
      };
    }

    const newMedia = files.map((file, i) => ({
      id: `media-${Date.now()}-${i}`,
      type: file.type.startsWith('video/') ? 'video' : 'photo' as 'photo' | 'video',
      url: URL.createObjectURL(file),
      thumbnailUrl: URL.createObjectURL(file),
      size: file.size,
      mimeType: file.type,
      capturedAt: new Date().toISOString(),
      uploadedAt: new Date().toISOString(),
    }));

    evidence.mediaReferences.push(...newMedia);
    evidence.status = 'Submitted';
    evidence.updatedAt = new Date().toISOString();
    evidence.submittedAt = new Date().toISOString();

    notificationService.broadcastToHierarchy({
      type: 'info',
      title: 'New Evidence Uploaded',
      message: `Evidence ${evidence.evidenceId} has been successfully uploaded for asset ${evidence.assetId}.`,
      relatedEntityId: evidence.evidenceId,
      relatedEntity: 'evidence',
      actionUrl: `/evidence/${evidence.evidenceId}`,
    }, 'Manager');

    return {
      success: true,
      data: evidence,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req-${Date.now()}`,
        version: '1.0.0',
      },
    };
  },

  async submitEvidence(evidenceId: string): Promise<ApiResponse<Evidence>> {
    await delay(300);

    const evidence = mockEvidence.find((e) => e.evidenceId === evidenceId);
    if (!evidence) {
      return {
        success: false,
        error: {
          code: 'EVIDENCE_NOT_FOUND',
          message: 'Evidence not found',
          statusCode: 404,
        },
      };
    }

    evidence.status = 'Submitted';
    evidence.updatedAt = new Date().toISOString();
    evidence.submittedAt = new Date().toISOString();

    return {
      success: true,
      data: evidence,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req-${Date.now()}`,
        version: '1.0.0',
      },
    };
  },

  async anchorEvidence(evidenceId: string): Promise<ApiResponse<BlockchainProof>> {
    await delay(1500);

    const evidence = mockEvidence.find((e) => e.evidenceId === evidenceId);
    if (!evidence) {
      return {
        success: false,
        error: {
          code: 'EVIDENCE_NOT_FOUND',
          message: 'Evidence not found',
          statusCode: 404,
        },
      };
    }

    const proof: BlockchainProof = {
      transactionId: `0x${Math.random().toString(16).slice(2, 18)}...`,
      blockNumber: Math.floor(Math.random() * 1000000) + 1200000,
      blockHash: `0x${Math.random().toString(16).slice(2, 18)}...`,
      merkleRoot: `0x${Math.random().toString(16).slice(2, 18)}...`,
      merkleProof: Array.from({ length: 3 }, () => `0x${Math.random().toString(16).slice(2, 18)}...`),
      timestamp: new Date().toISOString(),
      network: 'Hyperledger Fabric',
    };

    evidence.blockchainProof = proof;
    evidence.status = 'Anchored';
    evidence.updatedAt = new Date().toISOString();
    evidence.anchoredAt = new Date().toISOString();

    return {
      success: true,
      data: proof,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req-${Date.now()}`,
        version: '1.0.0',
      },
    };
  },

  async verifyEvidence(evidenceId: string): Promise<ApiResponse<VerificationResult>> {
    await delay(1000);

    const existingResult = mockVerificationResults.find((r) => r.evidenceId === evidenceId);
    if (existingResult) {
      return {
        success: true,
        data: existingResult,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: `req-${Date.now()}`,
          version: '1.0.0',
        },
      };
    }

    const evidence = mockEvidence.find((e) => e.evidenceId === evidenceId);
    if (!evidence) {
      return {
        success: false,
        error: {
          code: 'EVIDENCE_NOT_FOUND',
          message: 'Evidence not found',
          statusCode: 404,
        },
      };
    }

    const isValid = evidence.status === 'Anchored' || evidence.status === 'Verified';

    const result: VerificationResult = {
      evidenceId,
      isValid,
      verifiedAt: new Date().toISOString(),
      checkedBy: '3',
      details: {
        hashMatch: true,
        signatureValid: true,
        blockchainAnchored: evidence.status === 'Anchored' || evidence.status === 'Verified',
        chainIntact: true,
        timestampValid: true,
        discrepancies: [],
      },
      blockchainProof: evidence.blockchainProof,
    };

    if (isValid) {
      evidence.status = 'Verified';
      evidence.verifiedAt = new Date().toISOString();
      
      notificationService.broadcastToHierarchy({
        type: 'success',
        title: 'Evidence Verified',
        message: `Evidence ${evidence.evidenceId} has been successfully verified.`,
        relatedEntityId: evidence.evidenceId,
        relatedEntity: 'evidence',
        actionUrl: `/evidence/${evidence.evidenceId}`,
      }, 'Auditor');
      
    } else {
      evidence.status = 'IntegrityMismatch';
      
      notificationService.broadcastToHierarchy({
        type: 'alert',
        title: 'Evidence Integrity Mismatch',
        message: `Evidence ${evidence.evidenceId} failed verification!`,
        relatedEntityId: evidence.evidenceId,
        relatedEntity: 'evidence',
        actionUrl: `/evidence/${evidence.evidenceId}`,
      }, 'Manager');
    }
    evidence.updatedAt = new Date().toISOString();

    mockVerificationResults.push(result);

    return {
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req-${Date.now()}`,
        version: '1.0.0',
      },
    };
  },
};