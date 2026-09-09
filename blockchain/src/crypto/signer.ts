import {
  generateKeyPairSync,
  sign,
  verify,
  createHash,
} from 'node:crypto';
import { KeyPairPem, SignatureResult } from './types.js';

export const SIGNATURE_ALGORITHM = 'ECDSA-P256';
const EC_NAMED_CURVE = 'prime256v1'; // NIST P-256 / secp256r1

/**
 * Computes a standardized fingerprint (SHA-256 hex digest) of a public key.
 */
export function computeKeyFingerprint(publicKeyPem: string): string {
  return createHash('sha256').update(publicKeyPem.trim()).digest('hex').substring(0, 16);
}

/**
 * Generates an ECDSA NIST P-256 keypair in PKCS#8 / SPKI PEM format.
 */
export function generateEcdsaKeyPair(identityName?: string): KeyPairPem {
  const { publicKey, privateKey } = generateKeyPairSync('ec', {
    namedCurve: EC_NAMED_CURVE,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  const keyId = identityName || `signer-${computeKeyFingerprint(publicKey)}`;

  return {
    publicKeyPem: publicKey,
    privateKeyPem: privateKey,
    keyId,
    algorithm: SIGNATURE_ALGORITHM,
  };
}

/**
 * Digitally signs an evidence SHA-256 hash using the signer's ECDSA private key.
 * The signature is returned as a hex string (DER-encoded ASN.1).
 */
export function signEvidenceHash(
  evidenceHash: string,
  privateKeyPem: string,
  signerReference: string
): SignatureResult {
  if (!evidenceHash || evidenceHash.length !== 64) {
    throw new Error('Invalid evidenceHash: Must be a 64-character SHA-256 hex string.');
  }

  const payloadBuffer = Buffer.from(evidenceHash, 'utf8');
  const signature = sign('sha256', payloadBuffer, privateKeyPem);

  return {
    signatureHex: signature.toString('hex'),
    signerReference,
    algorithm: SIGNATURE_ALGORITHM,
    payloadSigned: 'evidenceHash',
  };
}

/**
 * Verifies an ECDSA digital signature against the signer's public key.
 */
export function verifySignature(
  evidenceHash: string,
  signatureHex: string,
  publicKeyPem: string
): boolean {
  try {
    const payloadBuffer = Buffer.from(evidenceHash, 'utf8');
    const signatureBuffer = Buffer.from(signatureHex, 'hex');
    return verify('sha256', payloadBuffer, publicKeyPem, signatureBuffer);
  } catch {
    return false;
  }
}
