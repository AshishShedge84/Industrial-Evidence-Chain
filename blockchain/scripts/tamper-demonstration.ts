/**
 * Industrial Evidence Chain — Mandatory Tamper Demonstration
 * 
 * Demonstrates the end-to-end cryptographic and blockchain integrity workflow:
 * 1. Evidence Creation
 * 2. Canonicalization
 * 3. SHA-256 Generation
 * 4. Blockchain Proof Anchoring
 * 5. Blockchain Proof Retrieval
 * 6. Verification of Authentic Record -> VERIFIED
 * 7. Evidence Field Tampering (Unauthorized Modification)
 * 8. Re-Canonicalization of Tampered Record
 * 9. Re-Generation of SHA-256 Digest
 * 10. Ledger Comparison -> INTEGRITY MISMATCH
 */

import { EvidencePackage } from '../src/canonicalizer/types.js';
import { canonicalizeEvidence } from '../src/canonicalizer/canonicalizer.js';
import { hashEvidencePackage } from '../src/hashing/hasher.js';
import { MockFabricAdapter } from '../src/adapter/mockAdapter.js';
import { verifyEvidenceIntegrity } from '../src/verification/verifier.js';

function banner(title: string): void {
  console.log('\n' + '='.repeat(80));
  console.log(`  ${title}`);
  console.log('='.repeat(80));
}

function stepHeader(num: number, title: string): void {
  console.log(`\n[STEP ${num}] >>> ${title}`);
}

async function runTamperDemonstration(): Promise<void> {
  banner('INDUSTRIAL EVIDENCE CHAIN — 10-STEP INTEGRITY & TAMPER DEMO');
  console.log('Role: Member 2 (Blockchain & Evidence Integrity)');
  console.log('Evaluation Target: Tamper Detection via Hyperledger Fabric & Deterministic Hashing\n');

  const adapter = new MockFabricAdapter();

  // STEP 1: Create Evidence
  stepHeader(1, 'Create Industrial Evidence Record (Technician Submission)');
  const evidence: EvidencePackage = {
    evidenceId: 'c73a8840-3b95-46b7-8798-1e43b1234567',
    assetId: 'fa50341a-e555-4d22-b52e-999999999999',
    userId: 'b1029384-7654-4321-bba9-111122223333',
    activityType: 'Maintenance',
    timestamp: '2026-09-02T14:30:00.000Z',
    location: {
      latitude: 18.52043,
      longitude: 73.856744,
    },
    description: 'Emergency bearing replacement on primary cooling pump #1. Replaced with OEM SKF-6205.',
    mediaReferences: [
      'https://storage.industrialchain.internal/assets/fa50341a/bearing-replaced.jpg',
      'https://storage.industrialchain.internal/assets/fa50341a/job-card-signed.pdf',
    ],
    createdAt: '2026-09-02T14:45:00.000Z',
  };
  console.log('Original Evidence Object:');
  console.log(JSON.stringify(evidence, null, 2));

  // STEP 2: Canonicalize Evidence
  stepHeader(2, 'Deterministic Canonicalization (RFC 8785 Scheme)');
  const canonicalResult = canonicalizeEvidence(evidence);
  console.log('Canonical JSON String (lexicographical key sort, normalized UTF-8, zero extraneous whitespace):');
  console.log(canonicalResult.canonicalJson);
  console.log(`Canonical Byte Length: ${canonicalResult.utf8Bytes.length} bytes`);

  // STEP 3: Generate SHA-256 Hash
  stepHeader(3, 'Authoritative SHA-256 Hash Generation');
  const { evidenceHash } = hashEvidencePackage(evidence);
  console.log(`Original SHA-256 Digest: ${evidenceHash}`);

  // STEP 4: Anchor Hash to Fabric Blockchain
  stepHeader(4, 'Anchor Evidence Proof to Hyperledger Fabric');
  const anchorResult = await adapter.anchorEvidence({
    evidenceId: evidence.evidenceId,
    assetId: evidence.assetId,
    evidenceHash,
    timestamp: evidence.timestamp,
    signerReference: 'technician-b1029384',
  });
  console.log('Blockchain Transaction Receipt:');
  console.log(JSON.stringify(anchorResult, null, 2));

  if (anchorResult.status !== 'ANCHORED') {
    throw new Error(`Anchoring failed: ${anchorResult.error}`);
  }

  // STEP 5: Retrieve Blockchain Proof
  stepHeader(5, 'Query Immutable Proof from Hyperledger Fabric Ledger');
  const onChainProof = await adapter.getEvidenceProof(evidence.evidenceId);
  console.log('On-Ledger Immutable Proof:');
  console.log(JSON.stringify(onChainProof, null, 2));

  // STEP 6: Verify Original Evidence
  stepHeader(6, 'Execute Verification on Original Evidence State');
  const originalReport = await verifyEvidenceIntegrity(evidence, adapter);
  console.log('Verification Outcome:');
  console.log(`  Status         : [ ${originalReport.status} ]`);
  console.log(`  Is Valid       : ${originalReport.isValid}`);
  console.log(`  Trusted Hash   : ${originalReport.trustedHash}`);
  console.log(`  Calculated Hash: ${originalReport.calculatedHash}`);
  console.log(`  Report Detail  : ${originalReport.explanation}`);

  if (originalReport.status !== 'VERIFIED') {
    throw new Error('Verification failed unexpectedly for authentic evidence!');
  }

  // STEP 7: Modify One Evidence Field (Tamper Event)
  stepHeader(7, 'Tampering Event: Maliciously Modify Evidence Field (description)');
  const tamperedEvidence: EvidencePackage = {
    ...evidence,
    description: 'Routine visual inspection only on primary cooling pump #1. No parts replaced.',
  };
  console.log('Tampered Evidence Description changed to:');
  console.log(`  "${tamperedEvidence.description}"`);

  // STEP 8: Canonicalize Modified Evidence
  stepHeader(8, 'Canonicalize Tampered Evidence Object');
  const tamperedCanonical = canonicalizeEvidence(tamperedEvidence);
  console.log('Tampered Canonical JSON:');
  console.log(tamperedCanonical.canonicalJson);

  // STEP 9: Generate New SHA-256 Hash
  stepHeader(9, 'Compute SHA-256 of Tampered Evidence');
  const tamperedHashResult = hashEvidencePackage(tamperedEvidence);
  const tamperedHash = tamperedHashResult.evidenceHash;
  console.log(`Tampered SHA-256 Digest : ${tamperedHash}`);
  console.log(`Original On-Chain Digest: ${evidenceHash}`);

  // STEP 10: Compare Against Blockchain Proof
  stepHeader(10, 'Re-Verify Against Hyperledger Fabric Ledger');
  const tamperedReport = await verifyEvidenceIntegrity(tamperedEvidence, adapter);
  console.log('Tamper Verification Outcome:');
  console.log(`  Status         : [ ${tamperedReport.status} ]`);
  console.log(`  Is Valid       : ${tamperedReport.isValid}`);
  console.log(`  Trusted Hash   : ${tamperedReport.trustedHash}`);
  console.log(`  Calculated Hash: ${tamperedReport.calculatedHash}`);
  console.log(`  Audit Alert    : ${tamperedReport.explanation}`);

  banner('DEMONSTRATION CONCLUSION');
  if (tamperedReport.status === 'INTEGRITY_MISMATCH' && !tamperedReport.isValid) {
    console.log('SUCCESS: Cryptographic evidence tampering was positively detected.');
    console.log('Hyperledger Fabric proof successfully preserved the authoritative original state.');
  } else {
    throw new Error('FAIL: Tampering was not detected as expected!');
  }
}

runTamperDemonstration().catch((err) => {
  console.error('Demonstration Error:', err);
  process.exit(1);
});
