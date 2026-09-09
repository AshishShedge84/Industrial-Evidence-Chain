import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MockFabricAdapter } from '../src/adapter/mockAdapter.js';
import { hashEvidencePackage } from '../src/hashing/hasher.js';
import { EvidencePackage } from '../src/canonicalizer/types.js';
import { verifyEvidenceIntegrity } from '../src/verification/verifier.js';

describe('Blockchain Adapter and Verification Engine', () => {
  let adapter: MockFabricAdapter;

  const validEvidence: EvidencePackage = {
    evidenceId: 'e82b7b51-4623-424a-9b4d-17849cb15d2a',
    assetId: 'a1111111-2222-3333-4444-555555555555',
    userId: 'b9999999-8888-7777-6666-555555555555',
    activityType: 'Inspection',
    timestamp: '2026-09-02T14:30:00.000Z',
    location: {
      latitude: 18.52043,
      longitude: 73.856744,
    },
    description: 'Quarterly vibration analysis completed on Turbine Rotor #2. Values nominal.',
    mediaReferences: ['https://storage.industrialchain.internal/vibration-log.csv'],
    createdAt: '2026-09-02T14:35:00.000Z',
  };

  beforeEach(() => {
    adapter = new MockFabricAdapter();
  });

  it('Anchors evidence proof successfully and returns ANCHORED status', async () => {
    const { evidenceHash } = hashEvidencePackage(validEvidence);
    const result = await adapter.anchorEvidence({
      evidenceId: validEvidence.evidenceId,
      assetId: validEvidence.assetId,
      evidenceHash,
      timestamp: validEvidence.timestamp,
      signerReference: 'technician-alice',
    });

    assert.strictEqual(result.status, 'ANCHORED');
    assert.ok(result.transactionId);
    assert.ok(result.transactionId?.startsWith('tx-fabric-'));
    assert.strictEqual(result.proofReference, `evidence:${validEvidence.evidenceId}`);
  });

  it('Verifies matching evidence with VERIFIED status', async () => {
    const { evidenceHash } = hashEvidencePackage(validEvidence);
    await adapter.anchorEvidence({
      evidenceId: validEvidence.evidenceId,
      assetId: validEvidence.assetId,
      evidenceHash,
      timestamp: validEvidence.timestamp,
      signerReference: 'technician-alice',
    });

    const report = await verifyEvidenceIntegrity(validEvidence, adapter);

    assert.strictEqual(report.isValid, true);
    assert.strictEqual(report.status, 'VERIFIED');
    assert.strictEqual(report.calculatedHash, evidenceHash);
    assert.strictEqual(report.trustedHash, evidenceHash);
    assert.ok(report.explanation.includes('Integrity Verified'));
  });

  it('Detects tamper and returns INTEGRITY_MISMATCH when description is modified', async () => {
    const { evidenceHash } = hashEvidencePackage(validEvidence);
    await adapter.anchorEvidence({
      evidenceId: validEvidence.evidenceId,
      assetId: validEvidence.assetId,
      evidenceHash,
      timestamp: validEvidence.timestamp,
      signerReference: 'technician-alice',
    });

    const tamperedEvidence: EvidencePackage = {
      ...validEvidence,
      description: 'Quarterly vibration analysis completed on Turbine Rotor #2. Values CRITICAL ABNORMAL.',
    };

    const report = await verifyEvidenceIntegrity(tamperedEvidence, adapter);

    assert.strictEqual(report.isValid, false);
    assert.strictEqual(report.status, 'INTEGRITY_MISMATCH');
    assert.notStrictEqual(report.calculatedHash, evidenceHash);
    assert.strictEqual(report.trustedHash, evidenceHash);
    assert.ok(report.explanation.includes('INTEGRITY ALERT'));
  });

  it('Returns PROOF_NOT_FOUND if evidence was never anchored', async () => {
    const report = await verifyEvidenceIntegrity(validEvidence, adapter);

    assert.strictEqual(report.isValid, false);
    assert.strictEqual(report.status, 'PROOF_NOT_FOUND');
    assert.strictEqual(report.trustedHash, null);
  });

  it('Rejects duplicate anchoring and never reports ANCHORED on failure', async () => {
    const { evidenceHash } = hashEvidencePackage(validEvidence);
    const firstAnchor = await adapter.anchorEvidence({
      evidenceId: validEvidence.evidenceId,
      assetId: validEvidence.assetId,
      evidenceHash,
      timestamp: validEvidence.timestamp,
      signerReference: 'technician-alice',
    });
    assert.strictEqual(firstAnchor.status, 'ANCHORED');

    const duplicateAnchor = await adapter.anchorEvidence({
      evidenceId: validEvidence.evidenceId,
      assetId: validEvidence.assetId,
      evidenceHash: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
      timestamp: validEvidence.timestamp,
      signerReference: 'technician-bob',
    });

    assert.strictEqual(duplicateAnchor.status, 'FAILED');
    assert.strictEqual(duplicateAnchor.transactionId, null);
    assert.ok(duplicateAnchor.error?.includes('already exists'));
  });

  it('Handles Fabric Unavailable failure safely without false ANCHORED', async () => {
    adapter.setOptions({ simulateFabricUnavailable: true });

    const { evidenceHash } = hashEvidencePackage(validEvidence);
    const result = await adapter.anchorEvidence({
      evidenceId: validEvidence.evidenceId,
      assetId: validEvidence.assetId,
      evidenceHash,
      timestamp: validEvidence.timestamp,
      signerReference: 'technician-alice',
    });

    assert.strictEqual(result.status, 'FAILED');
    assert.strictEqual(result.transactionId, null);
    assert.ok(result.error?.includes('Fabric Gateway Unavailable'));
  });

  it('Handles unconfirmed transaction without reporting false ANCHORED', async () => {
    adapter.setOptions({ simulateConfirmationFailure: true });

    const { evidenceHash } = hashEvidencePackage(validEvidence);
    const result = await adapter.anchorEvidence({
      evidenceId: validEvidence.evidenceId,
      assetId: validEvidence.assetId,
      evidenceHash,
      timestamp: validEvidence.timestamp,
      signerReference: 'technician-alice',
    });

    assert.strictEqual(result.status, 'FAILED');
    assert.ok(result.error?.includes('Transaction Confirmation Failure'));
  });

  it('Handles network timeout safely', async () => {
    adapter.setOptions({ simulateTimeout: true });

    const { evidenceHash } = hashEvidencePackage(validEvidence);
    const result = await adapter.anchorEvidence({
      evidenceId: validEvidence.evidenceId,
      assetId: validEvidence.assetId,
      evidenceHash,
      timestamp: validEvidence.timestamp,
      signerReference: 'technician-alice',
    });

    assert.strictEqual(result.status, 'FAILED');
    assert.strictEqual(result.transactionId, null);
    assert.ok(result.error?.includes('Fabric Gateway Timeout'));
  });

  it('Allows idempotent anchor retry on same evidenceId and same hash', async () => {
    const { evidenceHash } = hashEvidencePackage(validEvidence);
    const firstAnchor = await adapter.anchorEvidence({
      evidenceId: validEvidence.evidenceId,
      assetId: validEvidence.assetId,
      evidenceHash,
      timestamp: validEvidence.timestamp,
      signerReference: 'technician-alice',
    });

    const retryAnchor = await adapter.anchorEvidence({
      evidenceId: validEvidence.evidenceId,
      assetId: validEvidence.assetId,
      evidenceHash,
      timestamp: validEvidence.timestamp,
      signerReference: 'technician-alice',
    });

    assert.strictEqual(firstAnchor.status, 'ANCHORED');
    assert.strictEqual(retryAnchor.status, 'ANCHORED');
    assert.strictEqual(firstAnchor.transactionId, retryAnchor.transactionId);
    assert.ok(retryAnchor.proof);
    assert.strictEqual(retryAnchor.proof.network, 'industrial-evidence-channel');
    assert.strictEqual(retryAnchor.proof.merkleRoot, evidenceHash);
  });

  it('Verifies evidence returning rich details and combined proof object', async () => {
    const { evidenceHash } = hashEvidencePackage(validEvidence);
    await adapter.anchorEvidence({
      evidenceId: validEvidence.evidenceId,
      assetId: validEvidence.assetId,
      evidenceHash,
      timestamp: validEvidence.timestamp,
      signerReference: 'technician-alice',
    });

    const result = await adapter.verifyEvidence({
      evidenceId: validEvidence.evidenceId,
      calculatedHash: evidenceHash,
    });

    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.status, 'VERIFIED');
    assert.ok(result.details);
    assert.strictEqual(result.details.hashMatch, true);
    assert.strictEqual(result.details.blockchainAnchored, true);
    assert.strictEqual(result.details.chainIntact, true);
    assert.ok(result.blockchainProof);
    assert.strictEqual(result.blockchainProof.evidenceId, validEvidence.evidenceId);
    assert.strictEqual(result.blockchainProof.merkleRoot, evidenceHash);
  });
});
