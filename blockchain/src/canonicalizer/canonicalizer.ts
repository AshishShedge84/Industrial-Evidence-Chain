import {
  ActivityType,
  CanonicalEvidencePackage,
  CanonicalizationResult,
  EvidencePackage,
  VALID_ACTIVITY_TYPES,
} from './types.js';

export class CanonicalizationValidationError extends Error {
  constructor(public readonly field: string, message: string) {
    super(`Canonicalization Validation Error on field '${field}': ${message}`);
    this.name = 'CanonicalizationValidationError';
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates and normalizes an RFC 4122 UUID to lowercase canonical form.
 */
export function normalizeUuid(value: unknown, fieldName: string): string {
  if (typeof value !== 'string') {
    throw new CanonicalizationValidationError(fieldName, 'Must be a string.');
  }
  const trimmed = value.trim();
  if (!UUID_REGEX.test(trimmed)) {
    throw new CanonicalizationValidationError(
      fieldName,
      `Invalid UUID format: '${value}'. Expected 36-character hyphenated UUID.`
    );
  }
  return trimmed.toLowerCase();
}

/**
 * Validates and normalizes an ISO-8601 timestamp to canonical UTC (YYYY-MM-DDTHH:mm:ss.sssZ).
 */
export function normalizeIsoTimestamp(value: unknown, fieldName: string): string {
  if (typeof value !== 'string') {
    throw new CanonicalizationValidationError(fieldName, 'Must be a string.');
  }
  const trimmed = value.trim();
  const date = new Date(trimmed);
  if (isNaN(date.getTime())) {
    throw new CanonicalizationValidationError(
      fieldName,
      `Invalid ISO-8601 timestamp: '${value}'.`
    );
  }
  return date.toISOString();
}

/**
 * Validates and normalizes geographic coordinate to fixed 6-decimal-places string.
 * Standardizes latitude range [-90, 90] and longitude range [-180, 180].
 */
export function normalizeCoordinate(
  value: unknown,
  fieldName: string,
  min: number,
  max: number
): string {
  if (value === null || value === undefined) {
    throw new CanonicalizationValidationError(fieldName, 'Coordinate value cannot be null or undefined.');
  }
  const num = typeof value === 'number' ? value : parseFloat(String(value).trim());
  if (isNaN(num)) {
    throw new CanonicalizationValidationError(fieldName, `Invalid coordinate number: '${value}'.`);
  }
  if (num < min || num > max) {
    throw new CanonicalizationValidationError(
      fieldName,
      `Coordinate out of range [${min}, ${max}]: ${num}`
    );
  }
  // 6 decimal places = ~10cm accuracy, eliminating platform float precision variance
  return num.toFixed(6);
}

/**
 * Normalizes text to Unicode Normalization Form C (NFC).
 */
export function normalizeUnicodeString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string') {
    throw new CanonicalizationValidationError(fieldName, 'Must be a string.');
  }
  return value.normalize('NFC');
}

/**
 * Deterministic JSON stringifier following RFC 8785 (JSON Canonicalization Scheme - JCS).
 * - Sorts object keys lexicographically by UTF-16 code unit values.
 * - Omits all superfluous whitespace.
 * - Standard JSON escaping for quotes, backslashes, and control characters.
 */
export function canonicalJsonStringify(obj: unknown): string {
  if (obj === null) {
    return 'null';
  }
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return JSON.stringify(obj);
  }
  if (typeof obj === 'string') {
    return JSON.stringify(obj.normalize('NFC'));
  }
  if (Array.isArray(obj)) {
    const elements = obj.map((item) => canonicalJsonStringify(item));
    return `[${elements.join(',')}]`;
  }
  if (typeof obj === 'object') {
    const record = obj as Record<string, unknown>;
    const sortedKeys = Object.keys(record)
      .filter((k) => record[k] !== undefined)
      .sort();
    const keyValues = sortedKeys.map((key) => {
      const canonicalKey = JSON.stringify(key.normalize('NFC'));
      const canonicalVal = canonicalJsonStringify(record[key]);
      return `${canonicalKey}:${canonicalVal}`;
    });
    return `{${keyValues.join(',')}}`;
  }
  throw new Error(`Unsupported type for canonical JSON: ${typeof obj}`);
}

/**
 * Normalizes optional accuracy field. Returns undefined if omitted.
 */
export function normalizeAccuracy(value: unknown, fieldName: string): string | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  const num = typeof value === 'number' ? value : parseFloat(String(value).trim());
  if (isNaN(num) || num < 0) {
    throw new CanonicalizationValidationError(fieldName, `Invalid accuracy number: '${value}'. Must be >= 0.`);
  }
  return num.toFixed(2);
}

/**
 * Normalizes optional address field. Returns undefined if omitted.
 */
export function normalizeOptionalAddress(value: unknown, fieldName: string): string | undefined {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim().length === 0)) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new CanonicalizationValidationError(fieldName, 'Address must be a string.');
  }
  return value.trim().normalize('NFC');
}

/**
 * Normalizes optional timestamp field. Returns undefined if omitted.
 */
export function normalizeOptionalTimestamp(value: unknown, fieldName: string): string | undefined {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim().length === 0)) {
    return undefined;
  }
  return normalizeIsoTimestamp(value, fieldName);
}

/**
 * Normalizes a single media reference item (string URI or media metadata object).
 */
export function normalizeMediaItem(item: unknown, idx: number): string {
  if (typeof item === 'string') {
    return normalizeUnicodeString(item.trim(), `mediaReferences[${idx}]`);
  }
  if (item && typeof item === 'object') {
    const obj = item as Record<string, unknown>;
    // Prefer authoritative cryptographic checksum if present, else URL, else ID
    if (typeof obj.checksum === 'string' && obj.checksum.trim().length > 0) {
      return normalizeUnicodeString(obj.checksum.trim(), `mediaReferences[${idx}].checksum`);
    }
    if (typeof obj.url === 'string' && obj.url.trim().length > 0) {
      return normalizeUnicodeString(obj.url.trim(), `mediaReferences[${idx}].url`);
    }
    if (typeof obj.id === 'string' && obj.id.trim().length > 0) {
      return normalizeUnicodeString(obj.id.trim(), `mediaReferences[${idx}].id`);
    }
    return canonicalJsonStringify(obj);
  }
  throw new CanonicalizationValidationError(`mediaReferences[${idx}]`, 'Must be a string or media object.');
}

/**
 * Validates, normalizes, and canonically serializes an EvidencePackage.
 */
export function canonicalizeEvidence(input: EvidencePackage): CanonicalizationResult {
  if (!input || typeof input !== 'object') {
    throw new CanonicalizationValidationError('root', 'Evidence package must be a non-null object.');
  }

  // 1. Normalize and validate UUIDs
  const evidenceId = normalizeUuid(input.evidenceId, 'evidenceId');
  const assetId = normalizeUuid(input.assetId, 'assetId');
  const userId = normalizeUuid(input.userId, 'userId');

  // 2. Validate activity type
  if (!input.activityType || !VALID_ACTIVITY_TYPES.includes(input.activityType as ActivityType)) {
    throw new CanonicalizationValidationError(
      'activityType',
      `Invalid activityType: '${input.activityType}'. Allowed: ${VALID_ACTIVITY_TYPES.join(', ')}.`
    );
  }
  const activityType = input.activityType as ActivityType;

  // 3. Normalize timestamps
  const timestamp = normalizeIsoTimestamp(input.timestamp, 'timestamp');
  const createdAt = normalizeIsoTimestamp(input.createdAt, 'createdAt');

  // 4. Validate and normalize location
  if (!input.location || typeof input.location !== 'object') {
    throw new CanonicalizationValidationError('location', 'Location must be an object with latitude and longitude.');
  }
  const latitude = normalizeCoordinate(input.location.latitude, 'location.latitude', -90, 90);
  const longitude = normalizeCoordinate(input.location.longitude, 'location.longitude', -180, 180);
  const accuracy = normalizeAccuracy(input.location.accuracy, 'location.accuracy');
  const address = normalizeOptionalAddress(input.location.address, 'location.address');
  const locationTimestamp = normalizeOptionalTimestamp(input.location.timestamp, 'location.timestamp');

  // 5. Normalize description (NFC Unicode, preserve content)
  if (typeof input.description !== 'string') {
    throw new CanonicalizationValidationError('description', 'Description must be a string.');
  }
  const description = normalizeUnicodeString(input.description, 'description');

  // 6. Normalize media references array (preserve item order, normalize identifiers)
  if (!Array.isArray(input.mediaReferences)) {
    throw new CanonicalizationValidationError('mediaReferences', 'MediaReferences must be an array.');
  }
  const mediaReferences = input.mediaReferences.map((ref, idx) => normalizeMediaItem(ref, idx));

  // Construct canonical object with sorted keys
  const canonicalObject: CanonicalEvidencePackage = {
    activityType,
    assetId,
    createdAt,
    description,
    evidenceId,
    location: {
      ...(accuracy !== undefined ? { accuracy } : {}),
      ...(address !== undefined ? { address } : {}),
      latitude,
      longitude,
      ...(locationTimestamp !== undefined ? { timestamp: locationTimestamp } : {}),
    },
    mediaReferences,
    timestamp,
    userId,
  };

  // Generate canonical JSON string
  const canonicalJson = canonicalJsonStringify(canonicalObject);

  // UTF-8 bytes encoding
  const utf8Bytes = new TextEncoder().encode(canonicalJson);

  return {
    canonicalObject,
    canonicalJson,
    utf8Bytes,
  };
}
