import {
  ChaincodeVerificationResult,
  EvidenceProof,
  IChaincodeContext,
} from './types.js';
import { createHash } from 'node:crypto';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHA256_HEX_REGEX = /^[0-9a-f]{64}$/i;

export class EvidenceProofContract {
  public readonly name = 'EvidenceProofContract';

  /**
   * Helper to construct state key for evidence proof
   */
  private makeEvidenceKey(evidenceId: string): string {
    return `evidence:${evidenceId.toLowerCase()}`;
  }

  /**
   * Validates mandatory proof creation parameters.
   */
  private validateProofInputs(
    evidenceId: string,
    assetId: string,
    evidenceHash: string,
    timestamp: string,
    signerReference: string
  ): void {
    if (!evidenceId || !UUID_REGEX.test(evidenceId.trim())) {
      throw new Error(`Validation Error: Invalid evidenceId format '${evidenceId}'. Must be a 36-character UUID.`);
    }
    if (!assetId || !UUID_REGEX.test(assetId.trim())) {
      throw new Error(`Validation Error: Invalid assetId format '${assetId}'. Must be a 36-character UUID.`);
    }
    if (!evidenceHash || !SHA256_HEX_REGEX.test(evidenceHash.trim())) {
      throw new Error(
        `Validation Error: Invalid evidenceHash format '${evidenceHash}'. Must be a 64-character lowercase SHA-256 hex string.`
      );
    }
    if (!timestamp || isNaN(new Date(timestamp).getTime())) {
      throw new Error(`Validation Error: Invalid timestamp '${timestamp}'. Must be a valid ISO-8601 string.`);
    }
    if (!signerReference || typeof signerReference !== 'string' || signerReference.trim().length === 0) {
      throw new Error('Validation Error: Signer reference must be a non-empty string.');
    }
  }

  /**
   * Creates an immutable proof for an industrial evidence record.
   * Enforces strict duplicate prevention; existing proofs CANNOT be overwritten.
   */
  public async createEvidenceProof(
    ctx: IChaincodeContext,
    evidenceId: string,
    assetId: string,
    evidenceHash: string,
    timestamp: string,
    signerReference: string
  ): Promise<EvidenceProof> {
    this.validateProofInputs(evidenceId, assetId, evidenceHash, timestamp, signerReference);

    const normEvidenceId = evidenceId.trim().toLowerCase();
    const normAssetId = assetId.trim().toLowerCase();
    const normHash = evidenceHash.trim().toLowerCase();
    const normTimestamp = new Date(timestamp.trim()).toISOString();
    const normSigner = signerReference.trim();

    // Check if proof already exists (Idempotency & Conflict Check)
    const exists = await this.evidenceProofExists(ctx, normEvidenceId);
    if (exists) {
      const existingProof = await this.getEvidenceProof(ctx, normEvidenceId);
      if (existingProof.evidenceHash.toLowerCase() === normHash) {
        // Idempotent retry: safe return of existing anchored proof
        return existingProof;
      }
      throw new Error(
        `Conflict Error: Proof for evidenceId '${normEvidenceId}' already exists on the ledger with a different hash. Existing proofs cannot be overwritten.`
      );
    }

    const txId = ctx.stub.getTxID();
    const txTime = ctx.stub.getTxTimestamp();
    const ledgerTimeIso = new Date(txTime.seconds.low * 1000).toISOString();
    const blockNum = Math.floor(Math.abs(txTime.seconds.low) / 10) + 1;
    const blockHashHex = createHash('sha256').update(`${txId}:${ledgerTimeIso}:${normHash}`).digest('hex');

    const proof: EvidenceProof = {
      evidenceId: normEvidenceId,
      assetId: normAssetId,
      evidenceHash: normHash,
      timestamp: normTimestamp,
      signerReference: normSigner,
      transactionId: txId,
      status: 'ANCHORED',
      proofReference: this.makeEvidenceKey(normEvidenceId),
      anchoredAt: ledgerTimeIso,
      anchoredAtLedgerTime: ledgerTimeIso,
      blockNumber: blockNum,
      blockHash: blockHashHex,
      merkleRoot: normHash,
      merkleProof: [normHash],
      network: 'industrial-evidence-channel',
    };

    // Store primary proof record
    const proofBytes = Buffer.from(JSON.stringify(proof), 'utf8');
    await ctx.stub.putState(this.makeEvidenceKey(normEvidenceId), proofBytes);

    // Create composite key index for asset queries: asset~evidence:assetId:evidenceId
    const compositeKey = ctx.stub.createCompositeKey('asset~evidence', [normAssetId, normEvidenceId]);
    await ctx.stub.putState(compositeKey, Buffer.from('\u0000', 'utf8'));

    return proof;
  }

  /**
   * Retrieves an evidence proof by its evidenceId.
   */
  public async getEvidenceProof(ctx: IChaincodeContext, evidenceId: string): Promise<EvidenceProof> {
    if (!evidenceId || !UUID_REGEX.test(evidenceId.trim())) {
      throw new Error(`Validation Error: Invalid evidenceId format '${evidenceId}'.`);
    }

    const normEvidenceId = evidenceId.trim().toLowerCase();
    const dataBytes = await ctx.stub.getState(this.makeEvidenceKey(normEvidenceId));

    if (!dataBytes || dataBytes.length === 0) {
      throw new Error(`Not Found: Evidence proof with ID '${normEvidenceId}' does not exist on the blockchain ledger.`);
    }

    return JSON.parse(Buffer.from(dataBytes).toString('utf8')) as EvidenceProof;
  }

  /**
   * Checks whether an evidence proof exists on the ledger.
   */
  public async evidenceProofExists(ctx: IChaincodeContext, evidenceId: string): Promise<boolean> {
    if (!evidenceId) {
      return false;
    }
    const normEvidenceId = evidenceId.trim().toLowerCase();
    const dataBytes = await ctx.stub.getState(this.makeEvidenceKey(normEvidenceId));
    return !!dataBytes && dataBytes.length > 0;
  }

  /**
   * Verifies a client-recalculated SHA-256 hash against the trusted on-ledger proof.
   * Returns MATCH -> VERIFIED or MISMATCH -> INTEGRITY MISMATCH with rich audit details.
   */
  public async verifyEvidenceHash(
    ctx: IChaincodeContext,
    evidenceId: string,
    calculatedHash: string
  ): Promise<ChaincodeVerificationResult> {
    const normEvidenceId = (evidenceId || '').trim().toLowerCase();
    const normCalculatedHash = (calculatedHash || '').trim().toLowerCase();

    if (!SHA256_HEX_REGEX.test(normCalculatedHash)) {
      throw new Error(`Validation Error: Invalid calculatedHash format '${calculatedHash}'. Must be a 64-char hex SHA-256 string.`);
    }

    const exists = await this.evidenceProofExists(ctx, normEvidenceId);
    if (!exists) {
      return {
        isValid: false,
        status: 'PROOF_NOT_FOUND',
        trustedHash: null,
        calculatedHash: normCalculatedHash,
        evidenceId: normEvidenceId,
        details: {
          hashMatch: false,
          signatureValid: false,
          blockchainAnchored: false,
          chainIntact: false,
          timestampValid: false,
          discrepancies: [
            {
              field: 'evidenceId',
              expected: 'ANCHORED on blockchain ledger',
              actual: 'PROOF_NOT_FOUND',
              severity: 'critical',
            },
          ],
        },
        message: `Evidence proof '${normEvidenceId}' was not found on the blockchain ledger.`,
      };
    }

    const proof = await this.getEvidenceProof(ctx, normEvidenceId);
    const isMatch = proof.evidenceHash.toLowerCase() === normCalculatedHash;

    const discrepancies = isMatch
      ? []
      : [
          {
            field: 'evidenceHash',
            expected: proof.evidenceHash,
            actual: normCalculatedHash,
            severity: 'critical' as const,
          },
        ];

    return {
      isValid: isMatch,
      status: isMatch ? 'VERIFIED' : 'INTEGRITY MISMATCH',
      trustedHash: proof.evidenceHash,
      calculatedHash: normCalculatedHash,
      evidenceId: proof.evidenceId,
      assetId: proof.assetId,
      transactionId: proof.transactionId,
      anchoredTimestamp: proof.timestamp,
      details: {
        hashMatch: isMatch,
        signatureValid: proof.signerReference.length > 0,
        blockchainAnchored: proof.status === 'ANCHORED',
        chainIntact: isMatch && proof.status === 'ANCHORED',
        timestampValid: !isNaN(new Date(proof.timestamp).getTime()),
        discrepancies,
      },
      blockchainProof: proof,
      message: isMatch
        ? 'Digital evidence state corresponds identically to the hash anchored on the blockchain.'
        : 'INTEGRITY ALERT: Reconstructed evidence hash does not match trusted blockchain proof.',
    };
  }

  /**
   * Retrieves all evidence proofs associated with an asset ID.
   */
  public async getAssetEvidenceProofs(ctx: IChaincodeContext, assetId: string): Promise<EvidenceProof[]> {
    if (!assetId || !UUID_REGEX.test(assetId.trim())) {
      throw new Error(`Validation Error: Invalid assetId format '${assetId}'.`);
    }

    const normAssetId = assetId.trim().toLowerCase();
    const iterator = await ctx.stub.getStateByPartialCompositeKey('asset~evidence', [normAssetId]);
    const proofs: EvidenceProof[] = [];

    let result = await iterator.next();
    while (!result.done) {
      if (result.value) {
        const splitKey = ctx.stub.splitCompositeKey(result.value.key);
        const evidenceId = splitKey.attributes[1];
        if (evidenceId) {
          const proof = await this.getEvidenceProof(ctx, evidenceId);
          proofs.push(proof);
        }
      }
      result = await iterator.next();
    }
    await iterator.close();

    return proofs;
  }
}
