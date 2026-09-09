import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createBlockchainAdapter } from '../src/adapter/factory.js';
import { hashEvidencePackage } from '../src/hashing/hasher.js';
import { EvidencePackage } from '../src/canonicalizer/types.js';

describe('Member 1 Integration Boundary Tests (Contract Decoupling)', () => {
  const sampleEvidence: EvidencePackage = {
    evidenceId: 'd91a2384-5f12-4c28-98f1-332211445566',
    assetId: 'b2233445-5566-4778-8899-aabbccddeeff',
    userId: 'c1122334-4455-4667-8899-001122334455',
    activityType: 'Quality',
    timestamp: '2026-09-02T14:30:00.000Z',
    location: {
      latitude: '18.520430',
      longitude: '73.856744',
    },
    description: 'ISO-9001 calibration check passed on CNC Milling Station Alpha.',
    mediaReferences: ['https://storage.internal/evidence/iso9001-cert.pdf'],
    createdAt: '2026-09-02T14:35:00.000Z',
  };

  it('Consumes adapter without exposing any Hyperledger Fabric internals', async () => {
    // Member 1 calls createBlockchainAdapter() via factory
    const adapter = createBlockchainAdapter();

    // 1. Check health
    const health = await adapter.isHealthy();
    assert.strictEqual(health.isConnected, true);

    // 2. Compute canonical hash
    const { evidenceHash } = hashEvidencePackage(sampleEvidence);

    // 3. Anchor evidence
    const anchorReceipt = await adapter.anchorEvidence({
      evidenceId: sampleEvidence.evidenceId,
      assetId: sampleEvidence.assetId,
      evidenceHash,
      timestamp: sampleEvidence.timestamp,
      signerReference: 'qc-inspector-c1122334',
    });

    assert.strictEqual(anchorReceipt.status, 'ANCHORED');
    assert.ok(typeof anchorReceipt.transactionId === 'string');
    assert.strictEqual(anchorReceipt.proofReference, `evidence:${sampleEvidence.evidenceId}`);

    // 4. Verify authentic evidence
    const verifySuccess = await adapter.verifyEvidence({
      evidenceId: sampleEvidence.evidenceId,
      calculatedHash: evidenceHash,
    });

    assert.strictEqual(verifySuccess.isValid, true);
    assert.strictEqual(verifySuccess.status, 'VERIFIED');
    assert.strictEqual(verifySuccess.trustedHash, evidenceHash);

    // 5. Verify tampered evidence
    const tamperedHash = '0000000000000000000000000000000000000000000000000000000000000000';
    const verifyTampered = await adapter.verifyEvidence({
      evidenceId: sampleEvidence.evidenceId,
      calculatedHash: tamperedHash,
    });

    assert.strictEqual(verifyTampered.isValid, false);
    assert.strictEqual(verifyTampered.status, 'INTEGRITY_MISMATCH');
    assert.strictEqual(verifyTampered.trustedHash, evidenceHash);
    assert.strictEqual(verifyTampered.calculatedHash, tamperedHash);
  });
});
