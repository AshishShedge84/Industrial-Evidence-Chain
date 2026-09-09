import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateEcdsaKeyPair,
  signEvidenceHash,
  verifySignature,
  computeKeyFingerprint,
} from '../src/crypto/signer.js';
import { defaultDevKeyStore } from '../src/crypto/keystore.js';

describe('Digital Signature Scheme (ECDSA P-256)', () => {
  const testHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

  it('Generates a valid ECDSA P-256 keypair', () => {
    const keyPair = generateEcdsaKeyPair('technician-01');
    assert.ok(keyPair.publicKeyPem.includes('BEGIN PUBLIC KEY'));
    assert.ok(keyPair.privateKeyPem.includes('BEGIN PRIVATE KEY'));
    assert.strictEqual(keyPair.keyId, 'technician-01');
    assert.strictEqual(keyPair.algorithm, 'ECDSA-P256');
  });

  it('Signs an evidence hash and verifies successfully with corresponding public key', () => {
    const keyPair = generateEcdsaKeyPair();
    const signature = signEvidenceHash(testHash, keyPair.privateKeyPem, keyPair.keyId);

    assert.ok(signature.signatureHex.length > 0);
    assert.strictEqual(signature.payloadSigned, 'evidenceHash');

    const isValid = verifySignature(testHash, signature.signatureHex, keyPair.publicKeyPem);
    assert.strictEqual(isValid, true);
  });

  it('Rejects signature verification if the hash was altered (tamper detection)', () => {
    const keyPair = generateEcdsaKeyPair();
    const signature = signEvidenceHash(testHash, keyPair.privateKeyPem, keyPair.keyId);

    const tamperedHash = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const isValid = verifySignature(tamperedHash, signature.signatureHex, keyPair.publicKeyPem);
    assert.strictEqual(isValid, false);
  });

  it('Rejects signature verification with a different public key', () => {
    const alice = generateEcdsaKeyPair('alice');
    const bob = generateEcdsaKeyPair('bob');

    const signature = signEvidenceHash(testHash, alice.privateKeyPem, alice.keyId);
    const isValid = verifySignature(testHash, signature.signatureHex, bob.publicKeyPem);
    assert.strictEqual(isValid, false);
  });

  it('Rejects signing with an invalid length hash', () => {
    const keyPair = generateEcdsaKeyPair();
    assert.throws(
      () => signEvidenceHash('short-hash', keyPair.privateKeyPem, keyPair.keyId),
      /Invalid evidenceHash/
    );
  });

  it('Computes deterministic public key fingerprints', () => {
    const keyPair = generateEcdsaKeyPair('test-fp');
    const fp1 = computeKeyFingerprint(keyPair.publicKeyPem);
    const fp2 = computeKeyFingerprint(keyPair.publicKeyPem);
    assert.strictEqual(fp1, fp2);
    assert.strictEqual(fp1.length, 16);
  });

  it('Loads default development identities from keystore', () => {
    const identities = defaultDevKeyStore.listIdentities();
    assert.ok(identities.includes('technician-alice'));
    assert.ok(identities.includes('inspector-bob'));
    assert.ok(identities.includes('manager-carol'));

    const aliceKey = defaultDevKeyStore.getKeyPair('technician-alice');
    assert.ok(aliceKey);
    assert.ok(aliceKey.publicKeyPem.includes('BEGIN PUBLIC KEY'));
  });
});
