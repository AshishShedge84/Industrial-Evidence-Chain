import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { canonicalizeEvidence } from '../src/canonicalizer/canonicalizer.js';
import { EvidencePackage } from '../src/canonicalizer/types.js';
import { MockFabricAdapter } from '../src/adapter/mockAdapter.js';
import { generateEcdsaKeyPair } from '../src/crypto/signer.js';

describe('Blockchain Security & Secret Exposure Tests', () => {
  const baseEvidence: EvidencePackage = {
    evidenceId: 'e82b7b51-4623-424a-9b4d-17849cb15d2a',
    assetId: 'a1111111-2222-3333-4444-555555555555',
    userId: 'b9999999-8888-7777-6666-555555555555',
    activityType: 'Audit',
    timestamp: '2026-09-02T14:30:00.000Z',
    location: {
      latitude: 18.52043,
      longitude: 73.856744,
    },
    description: 'Security audit log check.',
    mediaReferences: ['https://storage.internal/audit.log'],
    createdAt: '2026-09-02T14:35:00.000Z',
  };

  it('Security: Rejects injection strings in evidenceId', () => {
    const maliciousIds = [
      "'; DROP TABLE evidence; --",
      '<script>alert("xss")</script>',
      '../../../etc/passwd',
      'e82b7b51-4623-424a-9b4d-17849cb15d2a; SELECT *',
    ];

    for (const badId of maliciousIds) {
      assert.throws(
        () => canonicalizeEvidence({ ...baseEvidence, evidenceId: badId }),
        { name: 'CanonicalizationValidationError' }
      );
    }
  });

  it('Security: Rejects malicious payloads in assetId and userId', () => {
    assert.throws(
      () => canonicalizeEvidence({ ...baseEvidence, assetId: 'not-uuid' }),
      { name: 'CanonicalizationValidationError' }
    );
    assert.throws(
      () => canonicalizeEvidence({ ...baseEvidence, userId: 'not-uuid' }),
      { name: 'CanonicalizationValidationError' }
    );
  });

  it('Security: Rejects invalid SHA-256 hashes during anchoring', async () => {
    const adapter = new MockFabricAdapter();
    const maliciousHashes = [
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b85', // 63 chars (too short)
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b8555', // 65 chars (too long)
      'g3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', // 'g' is non-hex
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b85;DROP',
    ];

    for (const badHash of maliciousHashes) {
      const res = await adapter.anchorEvidence({
        evidenceId: baseEvidence.evidenceId,
        assetId: baseEvidence.assetId,
        evidenceHash: badHash,
        timestamp: baseEvidence.timestamp,
        signerReference: 'auditor-01',
      });
      assert.strictEqual(res.status, 'FAILED');
      assert.strictEqual(res.transactionId, null);
    }
  });

  it('Security: Private keys are NEVER exposed in error messages or receipts', async () => {
    const keyPair = generateEcdsaKeyPair('secret-test');
    const adapter = new MockFabricAdapter();

    // Verify private key exists in memory
    assert.ok(keyPair.privateKeyPem.includes('PRIVATE KEY'));

    // Submit normal anchor
    const receipt = await adapter.anchorEvidence({
      evidenceId: baseEvidence.evidenceId,
      assetId: baseEvidence.assetId,
      evidenceHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      timestamp: baseEvidence.timestamp,
      signerReference: keyPair.keyId,
    });

    const receiptJson = JSON.stringify(receipt);
    assert.strictEqual(receiptJson.includes('PRIVATE KEY'), false);
    assert.strictEqual(receiptJson.includes(keyPair.privateKeyPem), false);

    // Cause a failure and verify error message does not leak private key
    adapter.setOptions({ simulateFabricUnavailable: true });
    const failReceipt = await adapter.anchorEvidence({
      evidenceId: '00000000-0000-4000-8000-000000000000',
      assetId: baseEvidence.assetId,
      evidenceHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      timestamp: baseEvidence.timestamp,
      signerReference: keyPair.keyId,
    });

    const failJson = JSON.stringify(failReceipt);
    assert.strictEqual(failJson.includes('PRIVATE KEY'), false);
  });

  it('Security: Never allows empty or blank signer reference', async () => {
    const adapter = new MockFabricAdapter();
    const result = await adapter.anchorEvidence({
      evidenceId: baseEvidence.evidenceId,
      assetId: baseEvidence.assetId,
      evidenceHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      timestamp: baseEvidence.timestamp,
      signerReference: '   ', // whitespace only
    });

    assert.strictEqual(result.status, 'FAILED');
    assert.strictEqual(result.transactionId, null);
    assert.ok(result.error?.includes('Signer reference'));
  });
});
