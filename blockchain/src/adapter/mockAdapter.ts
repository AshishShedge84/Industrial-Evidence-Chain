import { EvidenceProofContract } from '../chaincode/evidenceContract.js';
import { IChaincodeContext, EvidenceProof } from '../chaincode/types.js';
import { MockChaincodeStub } from '../../test/mockStub.js';
import {
  AnchorEvidenceParams,
  AnchorEvidenceResult,
  IBlockchainAdapter,
  VerifyEvidenceParams,
  VerifyEvidenceResult,
} from './IBlockchainAdapter.js';
import { randomUUID } from 'node:crypto';

export interface MockAdapterOptions {
  simulateFabricUnavailable?: boolean;
  simulateTimeout?: boolean;
  simulateConfirmationFailure?: boolean;
  latencyMs?: number;
}

export class MockFabricAdapter implements IBlockchainAdapter {
  private contract: EvidenceProofContract;
  private stub: MockChaincodeStub;
  private ctx: IChaincodeContext;
  private options: MockAdapterOptions;

  constructor(options: MockAdapterOptions = {}) {
    this.contract = new EvidenceProofContract();
    this.stub = new MockChaincodeStub();
    this.options = options;
    this.ctx = {
      stub: this.stub,
      clientIdentity: {
        getMSPID: () => 'Org1MSP',
        getID: () => 'x509::/CN=TechnicianAdapter::/CN=FabricCA',
      },
    };
  }

  public setOptions(options: Partial<MockAdapterOptions>): void {
    this.options = { ...this.options, ...options };
  }

  public async isHealthy(): Promise<{ isConnected: boolean; details: Record<string, unknown> }> {
    if (this.options.simulateFabricUnavailable) {
      return {
        isConnected: false,
        details: { error: 'Fabric peer/gateway endpoint unreachable (simulated).' },
      };
    }
    return {
      isConnected: true,
      details: {
        network: 'industrial-evidence-network-dev',
        channel: 'evidencechannel',
        chaincode: 'evidenceproof',
        adapterMode: 'mock-in-memory',
      },
    };
  }

  public async anchorEvidence(params: AnchorEvidenceParams): Promise<AnchorEvidenceResult> {
    // Check failure simulations
    if (this.options.simulateFabricUnavailable) {
      return {
        transactionId: null,
        status: 'FAILED',
        proofReference: `evidence:${params.evidenceId}`,
        error: 'Fabric Gateway Unavailable: Connection refused to Fabric peer.',
      };
    }

    if (this.options.simulateTimeout) {
      return {
        transactionId: null,
        status: 'FAILED',
        proofReference: `evidence:${params.evidenceId}`,
        error: 'Fabric Gateway Timeout: Transaction submission timed out waiting for consensus.',
      };
    }

    if (this.options.simulateConfirmationFailure) {
      return {
        transactionId: `tx-unconfirmed-${randomUUID().substring(0, 8)}`,
        status: 'FAILED',
        proofReference: `evidence:${params.evidenceId}`,
        error: 'Transaction Confirmation Failure: Peer endorsed but commit event timed out.',
      };
    }

    if (this.options.latencyMs && this.options.latencyMs > 0) {
      await new Promise((r) => setTimeout(r, this.options.latencyMs));
    }

    try {
      const txId = `tx-fabric-${randomUUID().replace(/-/g, '').substring(0, 16)}`;
      this.stub.setTxID(txId);

      const proof = await this.contract.createEvidenceProof(
        this.ctx,
        params.evidenceId,
        params.assetId,
        params.evidenceHash,
        params.timestamp,
        params.signerReference
      );

      return {
        transactionId: proof.transactionId,
        status: 'ANCHORED',
        proofReference: `evidence:${proof.evidenceId}`,
        anchoredAt: proof.anchoredAt || proof.anchoredAtLedgerTime || new Date().toISOString(),
        proof,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        transactionId: null,
        status: 'FAILED',
        proofReference: `evidence:${params.evidenceId}`,
        error: errorMsg,
      };
    }
  }

  public async verifyEvidence(params: VerifyEvidenceParams): Promise<VerifyEvidenceResult> {
    if (this.options.simulateFabricUnavailable) {
      return {
        isValid: false,
        trustedHash: null,
        calculatedHash: params.calculatedHash,
        status: 'FAILED',
        error: 'Fabric Gateway Unavailable: Unable to query ledger state.',
      };
    }

    if (this.options.latencyMs && this.options.latencyMs > 0) {
      await new Promise((r) => setTimeout(r, this.options.latencyMs));
    }

    try {
      const verification = await this.contract.verifyEvidenceHash(
        this.ctx,
        params.evidenceId,
        params.calculatedHash
      );

      let statusOutcome: 'VERIFIED' | 'INTEGRITY_MISMATCH' | 'PROOF_NOT_FOUND' = 'PROOF_NOT_FOUND';
      if (verification.status === 'VERIFIED') {
        statusOutcome = 'VERIFIED';
      } else if (verification.status === 'INTEGRITY MISMATCH') {
        statusOutcome = 'INTEGRITY_MISMATCH';
      }

      return {
        isValid: verification.isValid,
        trustedHash: verification.trustedHash,
        calculatedHash: verification.calculatedHash,
        status: statusOutcome,
        transactionId: verification.transactionId,
        proofReference: `evidence:${params.evidenceId}`,
        details: verification.details,
        blockchainProof: verification.blockchainProof,
        error: verification.status === 'PROOF_NOT_FOUND' ? verification.message : undefined,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        isValid: false,
        trustedHash: null,
        calculatedHash: params.calculatedHash,
        status: 'FAILED',
        error: errorMsg,
      };
    }
  }

  public async getEvidenceProof(evidenceId: string): Promise<EvidenceProof> {
    return this.contract.getEvidenceProof(this.ctx, evidenceId);
  }
}
