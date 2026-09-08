import type { VerificationResult, BatchVerificationRequest, BatchVerificationResponse, VerificationStatus, BlockchainProof, AuditTrailEntry } from '@type-defs/verification';
import type { ApiResponse } from '@type-defs/api';
import { mockVerificationResults, mockAuditTrail, mockEvidence } from './apiResponses';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockVerificationService = {
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

  async batchVerify(request: BatchVerificationRequest): Promise<ApiResponse<BatchVerificationResponse>> {
    await delay(2000);

    const results: VerificationResult[] = [];
    let verified = 0;
    let failed = 0;
    let mismatched = 0;

    for (const evidenceId of request.evidenceIds) {
      const result = await this.verifyEvidence(evidenceId);
      if (result.success && result.data) {
        results.push(result.data);
        if (result.data.isValid) verified++;
        else if (result.data.details.discrepancies.some((d) => d.severity === 'critical')) mismatched++;
        else failed++;
      } else {
        failed++;
      }
    }

    return {
      success: true,
      data: {
        results,
        summary: {
          total: request.evidenceIds.length,
          verified,
          failed,
          mismatched,
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req-${Date.now()}`,
        version: '1.0.0',
      },
    };
  },

  async getVerificationStatus(evidenceId: string): Promise<ApiResponse<VerificationStatus>> {
    await delay(200);

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

    let status: VerificationStatus['status'] = 'pending';
    if (evidence.status === 'Verified') status = 'completed';
    else if (evidence.status === 'IntegrityMismatch' || evidence.status === 'Failed') status = 'failed';
    else if (evidence.status === 'Anchored' || evidence.status === 'Submitted') status = 'verifying';

    return {
      success: true,
      data: {
        evidenceId,
        status,
        startedAt: evidence.submittedAt,
        completedAt: evidence.verifiedAt,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req-${Date.now()}`,
        version: '1.0.0',
      },
    };
  },

  async getBlockchainProof(evidenceId: string): Promise<ApiResponse<BlockchainProof>> {
    await delay(300);

    const evidence = mockEvidence.find((e) => e.evidenceId === evidenceId);
    if (!evidence || !evidence.blockchainProof) {
      return {
        success: false,
        error: {
          code: 'PROOF_NOT_FOUND',
          message: 'Blockchain proof not available',
          statusCode: 404,
        },
      };
    }

    return {
      success: true,
      data: evidence.blockchainProof,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req-${Date.now()}`,
        version: '1.0.0',
      },
    };
  },

  async getAuditTrail(evidenceId: string): Promise<ApiResponse<AuditTrailEntry[]>> {
    await delay(300);

    const trail = mockAuditTrail.filter((a) => a.evidenceId === evidenceId);

    return {
      success: true,
      data: trail,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req-${Date.now()}`,
        version: '1.0.0',
      },
    };
  },
};