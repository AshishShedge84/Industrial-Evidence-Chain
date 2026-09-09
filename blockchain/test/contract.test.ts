import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { EvidenceProofContract } from '../src/chaincode/evidenceContract.js';
import { createMockContext } from './mockStub.js';
import { IChaincodeContext } from '../src/chaincode/types.js';

describe('Hyperledger Fabric Chaincode (EvidenceProofContract)', () => {
  let contract: EvidenceProofContract;
  let ctx: IChaincodeContext;

  const validProof = {
    evidenceId: 'e82b7b51-4623-424a-9b4d-17849cb15d2a',
    assetId: 'a1111111-2222-3333-4444-555555555555',
    evidenceHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    timestamp: '2026-09-02T14:30:00.000Z',
    signerReference: 'technician-alice',
  };

  beforeEach(() => {
    contract = new EvidenceProofContract();
    ctx = createMockContext('tx-test-1001');
  });

  it('Creates an evidence proof successfully and anchors on ledger', async () => {
    const proof = await contract.createEvidenceProof(
      ctx,
      validProof.evidenceId,
      validProof.assetId,
      validProof.evidenceHash,
      validProof.timestamp,
      validProof.signerReference
    );

    assert.strictEqual(proof.evidenceId, validProof.evidenceId);
    assert.strictEqual(proof.assetId, validProof.assetId);
    assert.strictEqual(proof.evidenceHash, validProof.evidenceHash);
    assert.strictEqual(proof.status, 'ANCHORED');
    assert.strictEqual(proof.transactionId, 'tx-test-1001');
    assert.ok(proof.anchoredAtLedgerTime);

    // Verify it exists
    const exists = await contract.evidenceProofExists(ctx, validProof.evidenceId);
    assert.strictEqual(exists, true);
  });

  it('Retrieves an anchored evidence proof by ID', async () => {
    await contract.createEvidenceProof(
      ctx,
      validProof.evidenceId,
      validProof.assetId,
      validProof.evidenceHash,
      validProof.timestamp,
      validProof.signerReference
    );

    const retrieved = await contract.getEvidenceProof(ctx, validProof.evidenceId);
    assert.strictEqual(retrieved.evidenceId, validProof.evidenceId);
    assert.strictEqual(retrieved.evidenceHash, validProof.evidenceHash);
  });

  it('Rejects duplicate proof creation and never overwrites existing proofs', async () => {
    await contract.createEvidenceProof(
      ctx,
      validProof.evidenceId,
      validProof.assetId,
      validProof.evidenceHash,
      validProof.timestamp,
      validProof.signerReference
    );

    // Attempt to overwrite with different hash
    await assert.rejects(
      async () => {
        await contract.createEvidenceProof(
          ctx,
          validProof.evidenceId,
          validProof.assetId,
          'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
          validProof.timestamp,
          'malicious-actor'
        );
      },
      /Conflict Error: Proof for evidenceId .* already exists/
    );

    // Verify original hash was NOT modified
    const untouched = await contract.getEvidenceProof(ctx, validProof.evidenceId);
    assert.strictEqual(untouched.evidenceHash, validProof.evidenceHash);
    assert.strictEqual(untouched.signerReference, 'technician-alice');
  });

  it('Returns false when checking existence of non-existent proof', async () => {
    const exists = await contract.evidenceProofExists(ctx, '00000000-0000-0000-0000-000000000000');
    assert.strictEqual(exists, false);
  });

  it('Throws error when retrieving non-existent proof', async () => {
    await assert.rejects(
      async () => {
        await contract.getEvidenceProof(ctx, '00000000-0000-0000-0000-000000000000');
      },
      /Not Found: Evidence proof with ID .* does not exist/
    );
  });

  it('verifyEvidenceHash returns VERIFIED when hashes match', async () => {
    await contract.createEvidenceProof(
      ctx,
      validProof.evidenceId,
      validProof.assetId,
      validProof.evidenceHash,
      validProof.timestamp,
      validProof.signerReference
    );

    const result = await contract.verifyEvidenceHash(
      ctx,
      validProof.evidenceId,
      validProof.evidenceHash
    );

    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.status, 'VERIFIED');
    assert.strictEqual(result.trustedHash, validProof.evidenceHash);
    assert.strictEqual(result.calculatedHash, validProof.evidenceHash);
  });

  it('verifyEvidenceHash returns INTEGRITY MISMATCH when hashes differ', async () => {
    await contract.createEvidenceProof(
      ctx,
      validProof.evidenceId,
      validProof.assetId,
      validProof.evidenceHash,
      validProof.timestamp,
      validProof.signerReference
    );

    const tamperedHash = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const result = await contract.verifyEvidenceHash(
      ctx,
      validProof.evidenceId,
      tamperedHash
    );

    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.status, 'INTEGRITY MISMATCH');
    assert.strictEqual(result.trustedHash, validProof.evidenceHash);
    assert.strictEqual(result.calculatedHash, tamperedHash);
  });

  it('verifyEvidenceHash returns PROOF_NOT_FOUND when evidenceId is not on ledger', async () => {
    const result = await contract.verifyEvidenceHash(
      ctx,
      '00000000-0000-0000-0000-000000000000',
      validProof.evidenceHash
    );

    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.status, 'PROOF_NOT_FOUND');
    assert.strictEqual(result.trustedHash, null);
  });

  it('Retrieves multiple evidence proofs for an asset', async () => {
    const evidence1 = '11111111-1111-4111-8111-111111111111';
    const evidence2 = '22222222-2222-4222-8222-222222222222';
    const assetId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

    await contract.createEvidenceProof(
      ctx,
      evidence1,
      assetId,
      '1111111111111111111111111111111111111111111111111111111111111111',
      validProof.timestamp,
      validProof.signerReference
    );

    await contract.createEvidenceProof(
      ctx,
      evidence2,
      assetId,
      '2222222222222222222222222222222222222222222222222222222222222222',
      validProof.timestamp,
      validProof.signerReference
    );

    const assetProofs = await contract.getAssetEvidenceProofs(ctx, assetId);
    assert.strictEqual(assetProofs.length, 2);
    assert.ok(assetProofs.some((p) => p.evidenceId === evidence1));
    assert.ok(assetProofs.some((p) => p.evidenceId === evidence2));
  });

  it('Validates evidenceId format strictly', async () => {
    await assert.rejects(
      async () => {
        await contract.createEvidenceProof(
          ctx,
          'invalid-evidence-id',
          validProof.assetId,
          validProof.evidenceHash,
          validProof.timestamp,
          validProof.signerReference
        );
      },
      /Validation Error: Invalid evidenceId/
    );
  });

  it('Allows idempotent anchor retry when same evidenceId and same hash are submitted', async () => {
    const proof1 = await contract.createEvidenceProof(
      ctx,
      validProof.evidenceId,
      validProof.assetId,
      validProof.evidenceHash,
      validProof.timestamp,
      validProof.signerReference
    );

    // Idempotent retry with same parameters
    const proof2 = await contract.createEvidenceProof(
      ctx,
      validProof.evidenceId,
      validProof.assetId,
      validProof.evidenceHash,
      validProof.timestamp,
      validProof.signerReference
    );

    assert.strictEqual(proof1.evidenceId, proof2.evidenceId);
    assert.strictEqual(proof1.evidenceHash, proof2.evidenceHash);
    assert.strictEqual(proof1.transactionId, proof2.transactionId);
    assert.strictEqual(proof2.status, 'ANCHORED');
  });

  it('Returns rich verification details and blockchainProof in verifyEvidenceHash', async () => {
    await contract.createEvidenceProof(
      ctx,
      validProof.evidenceId,
      validProof.assetId,
      validProof.evidenceHash,
      validProof.timestamp,
      validProof.signerReference
    );

    const result = await contract.verifyEvidenceHash(ctx, validProof.evidenceId, validProof.evidenceHash);
    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.status, 'VERIFIED');
    assert.strictEqual(result.details.hashMatch, true);
    assert.strictEqual(result.details.blockchainAnchored, true);
    assert.strictEqual(result.details.chainIntact, true);
    assert.strictEqual(result.details.discrepancies.length, 0);
    assert.ok(result.blockchainProof);
    assert.strictEqual(result.blockchainProof.network, 'industrial-evidence-channel');
    assert.strictEqual(result.blockchainProof.merkleRoot, validProof.evidenceHash);
  });
});
