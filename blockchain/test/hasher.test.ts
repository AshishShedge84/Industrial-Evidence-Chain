import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EvidencePackage } from '../src/canonicalizer/types.js';
import { canonicalizeEvidence } from '../src/canonicalizer/canonicalizer.js';
import { hashEvidencePackage, isValidSha256, hashCanonicalJson } from '../src/hashing/hasher.js';

describe('Evidence Canonicalization and SHA-256 Hashing Engine', () => {
  const sampleEvidence: EvidencePackage = {
    evidenceId: 'e82b7b51-4623-424a-9b4d-17849cb15d2a',
    assetId: 'a1111111-2222-3333-4444-555555555555',
    userId: 'b9999999-8888-7777-6666-555555555555',
    activityType: 'Maintenance',
    timestamp: '2026-09-02T14:30:00.000Z',
    location: {
      latitude: 18.52043,
      longitude: 73.856744,
    },
    description: 'Replaced high-pressure hydraulic filter unit #4 during scheduled quarterly overhaul.',
    mediaReferences: [
      'https://storage.industrialchain.internal/evidence/2026/img-01.jpg',
      'https://storage.industrialchain.internal/evidence/2026/inspection-report.pdf',
    ],
    createdAt: '2026-09-02T14:32:15.000Z',
  };

  it('Test 1: Same evidence produces identical SHA-256 hash', () => {
    const run1 = hashEvidencePackage(sampleEvidence);
    const run2 = hashEvidencePackage({ ...sampleEvidence });

    assert.strictEqual(run1.evidenceHash, run2.evidenceHash);
    assert.strictEqual(run1.evidenceHash.length, 64);
    assert.match(run1.evidenceHash, /^[0-9a-f]{64}$/);
    assert.ok(isValidSha256(run1.evidenceHash));
    assert.strictEqual(hashCanonicalJson(run1.canonicalResult.canonicalJson), run1.evidenceHash);
  });

  it('Test 2: Modifying description produces a different hash', () => {
    const original = hashEvidencePackage(sampleEvidence);
    const modified = hashEvidencePackage({
      ...sampleEvidence,
      description: 'Replaced low-pressure hydraulic filter unit #4 during scheduled quarterly overhaul.',
    });

    assert.notStrictEqual(original.evidenceHash, modified.evidenceHash);
  });

  it('Test 3: Modifying timestamp produces a different hash', () => {
    const original = hashEvidencePackage(sampleEvidence);
    const modified = hashEvidencePackage({
      ...sampleEvidence,
      timestamp: '2026-09-02T15:30:00.000Z',
    });

    assert.notStrictEqual(original.evidenceHash, modified.evidenceHash);
  });

  it('Test 4: Modifying assetId produces a different hash', () => {
    const original = hashEvidencePackage(sampleEvidence);
    const modified = hashEvidencePackage({
      ...sampleEvidence,
      assetId: 'a2222222-2222-3333-4444-555555555555',
    });

    assert.notStrictEqual(original.evidenceHash, modified.evidenceHash);
  });

  it('Test 5: Modifying location produces a different hash', () => {
    const original = hashEvidencePackage(sampleEvidence);
    const modified = hashEvidencePackage({
      ...sampleEvidence,
      location: {
        latitude: 18.52044, // 0.00001 deg shift
        longitude: 73.856744,
      },
    });

    assert.notStrictEqual(original.evidenceHash, modified.evidenceHash);
  });

  it('Test 6: Modifying media references produces a different hash', () => {
    const original = hashEvidencePackage(sampleEvidence);
    const modified = hashEvidencePackage({
      ...sampleEvidence,
      mediaReferences: [
        'https://storage.industrialchain.internal/evidence/2026/img-01.jpg',
        'https://storage.industrialchain.internal/evidence/2026/tampered-report.pdf',
      ],
    });

    assert.notStrictEqual(original.evidenceHash, modified.evidenceHash);
  });

  it('Test 7: Equivalent canonical representations produce the same hash', () => {
    // Reordered input object keys, uppercase UUIDs, coordinate as string vs number
    const reorderedAndFormattedInput: EvidencePackage = {
      createdAt: '2026-09-02T14:32:15.000Z',
      description: 'Replaced high-pressure hydraulic filter unit #4 during scheduled quarterly overhaul.',
      mediaReferences: [
        'https://storage.industrialchain.internal/evidence/2026/img-01.jpg',
        'https://storage.industrialchain.internal/evidence/2026/inspection-report.pdf',
      ],
      location: {
        longitude: '73.856744', // string format
        latitude: '18.520430',  // trailing zero string format
      },
      timestamp: '2026-09-02T14:30:00Z', // ISO without explicit .000 ms
      activityType: 'Maintenance',
      userId: 'B9999999-8888-7777-6666-555555555555', // uppercase UUID
      assetId: 'A1111111-2222-3333-4444-555555555555', // uppercase UUID
      evidenceId: 'E82B7B51-4623-424A-9B4D-17849CB15D2A', // uppercase UUID
    };

    const original = hashEvidencePackage(sampleEvidence);
    const equivalent = hashEvidencePackage(reorderedAndFormattedInput);

    assert.strictEqual(original.evidenceHash, equivalent.evidenceHash);
    assert.strictEqual(original.canonicalResult.canonicalJson, equivalent.canonicalResult.canonicalJson);
  });

  it('Test 8: Unicode text behaves deterministically across normalization forms', () => {
    // Unicode text with accented characters and symbols in NFC vs NFD forms
    // e.g. "überprüft" (U+00FC vs U+0075 U+0308)
    const nfcDesc = 'Sensorüberprüfung: Druckventil normal. \u00FC'; // NFC
    const nfdDesc = 'Sensoru\u0308berpru\u0308fung: Druckventil normal. \u0075\u0308'; // NFD

    const evidenceNfc: EvidencePackage = {
      ...sampleEvidence,
      description: nfcDesc,
    };

    const evidenceNfd: EvidencePackage = {
      ...sampleEvidence,
      description: nfdDesc,
    };

    const resultNfc = hashEvidencePackage(evidenceNfc);
    const resultNfd = hashEvidencePackage(evidenceNfd);

    assert.strictEqual(resultNfc.canonicalResult.canonicalJson, resultNfd.canonicalResult.canonicalJson);
    assert.strictEqual(resultNfc.evidenceHash, resultNfd.evidenceHash);
  });

  it('Verifies exact alphabetical key ordering in canonical JSON', () => {
    const { canonicalJson } = canonicalizeEvidence(sampleEvidence);
    const parsed = JSON.parse(canonicalJson);
    const keys = Object.keys(parsed);

    const expectedKeys = [
      'activityType',
      'assetId',
      'createdAt',
      'description',
      'evidenceId',
      'location',
      'mediaReferences',
      'timestamp',
      'userId',
    ];

    assert.deepStrictEqual(keys, expectedKeys);
    assert.deepStrictEqual(Object.keys(parsed.location), ['latitude', 'longitude']);
  });

  it('Rejects invalid UUIDs with validation error', () => {
    assert.throws(
      () =>
        canonicalizeEvidence({
          ...sampleEvidence,
          evidenceId: 'not-a-valid-uuid',
        }),
      {
        name: 'CanonicalizationValidationError',
        message: /Invalid UUID format/,
      }
    );
  });

  it('Rejects invalid activityType with validation error', () => {
    assert.throws(
      () =>
        canonicalizeEvidence({
          ...sampleEvidence,
          // @ts-expect-error testing invalid enum
          activityType: 'InvalidActivity',
        }),
      {
        name: 'CanonicalizationValidationError',
        message: /Invalid activityType/,
      }
    );
  });

  it('Accepts all 12 V1 activity types', () => {
    const types = [
      'Maintenance',
      'Inspection',
      'Repair',
      'Calibration',
      'Safety',
      'Quality',
      'Audit',
      'Incident',
      'SparePart',
      'Transfer',
      'Decommissioning',
      'Commissioning',
    ] as const;

    for (const t of types) {
      const res = hashEvidencePackage({
        ...sampleEvidence,
        activityType: t,
      });
      assert.ok(isValidSha256(res.evidenceHash));
    }
  });

  it('Deterministically hashes rich location with optional accuracy, address, and timestamp', () => {
    const richLocationEvidence: EvidencePackage = {
      ...sampleEvidence,
      location: {
        latitude: 18.52043,
        longitude: 73.856744,
        accuracy: 4.5,
        address: 'Bldg 3, Bay 7, Pune Plant',
        timestamp: '2026-09-02T14:29:50.000Z',
      },
    };

    const res1 = hashEvidencePackage(richLocationEvidence);
    const res2 = hashEvidencePackage({ ...richLocationEvidence });

    assert.strictEqual(res1.evidenceHash, res2.evidenceHash);
    const parsed = JSON.parse(res1.canonicalResult.canonicalJson);
    assert.strictEqual(parsed.location.accuracy, '4.50');
    assert.strictEqual(parsed.location.address, 'Bldg 3, Bay 7, Pune Plant');
    assert.strictEqual(parsed.location.latitude, '18.520430');
    assert.strictEqual(parsed.location.longitude, '73.856744');
    assert.strictEqual(parsed.location.timestamp, '2026-09-02T14:29:50.000Z');
  });

  it('Normalizes media metadata objects preserving array order', () => {
    const withObjects: EvidencePackage = {
      ...sampleEvidence,
      mediaReferences: [
        {
          id: 'med-01',
          url: 'https://storage/photo1.jpg',
          checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        },
        'https://storage/report.pdf',
      ],
    };

    const res = hashEvidencePackage(withObjects);
    const parsed = JSON.parse(res.canonicalResult.canonicalJson);

    assert.strictEqual(parsed.mediaReferences[0], 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    assert.strictEqual(parsed.mediaReferences[1], 'https://storage/report.pdf');
  });

  it('Changing media item order alters the canonical hash (order preservation)', () => {
    const runA = hashEvidencePackage({
      ...sampleEvidence,
      mediaReferences: ['https://storage/a.jpg', 'https://storage/b.jpg'],
    });
    const runB = hashEvidencePackage({
      ...sampleEvidence,
      mediaReferences: ['https://storage/b.jpg', 'https://storage/a.jpg'],
    });

    assert.notStrictEqual(runA.evidenceHash, runB.evidenceHash);
  });
});
