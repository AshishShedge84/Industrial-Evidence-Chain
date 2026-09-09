import { createHash } from 'node:crypto';
import { canonicalizeEvidence } from '../canonicalizer/canonicalizer.js';
import { CanonicalizationResult, EvidencePackage } from '../canonicalizer/types.js';

export const SHA256_HEX_REGEX = /^[0-9a-f]{64}$/;

/**
 * Validates whether a given string is a valid 64-character lowercase SHA-256 hexadecimal hash.
 */
export function isValidSha256(hash: unknown): boolean {
  if (typeof hash !== 'string') {
    return false;
  }
  return SHA256_HEX_REGEX.test(hash);
}

/**
 * Computes SHA-256 over raw UTF-8 bytes and returns a 64-character lowercase hexadecimal string.
 */
export function hashUtf8Bytes(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex').toLowerCase();
}

/**
 * Computes SHA-256 over a canonical JSON string (encoded as UTF-8) and returns a 64-character lowercase hexadecimal string.
 */
export function hashCanonicalJson(canonicalJson: string): string {
  const bytes = new TextEncoder().encode(canonicalJson);
  return hashUtf8Bytes(bytes);
}

export interface EvidenceHashResult {
  /** 64-character lowercase hexadecimal SHA-256 digest */
  evidenceHash: string;
  /** Complete canonicalization output details */
  canonicalResult: CanonicalizationResult;
}

/**
 * Deterministic pipeline: EvidencePackage -> Canonicalization -> UTF-8 bytes -> SHA-256 digest.
 */
export function hashEvidencePackage(input: EvidencePackage): EvidenceHashResult {
  const canonicalResult = canonicalizeEvidence(input);
  const evidenceHash = hashUtf8Bytes(canonicalResult.utf8Bytes);
  return {
    evidenceHash,
    canonicalResult,
  };
}
