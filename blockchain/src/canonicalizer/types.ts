/**
 * Industrial Evidence Chain — Evidence Package Type Definitions
 * 
 * PROVISIONAL CONTRACT SPECIFICATION:
 * Matches Section 5 of the Member 2 Specification and Section 10 of the Team Blueprint.
 * Joint approval with Member 1 (.NET) and Member 3 (React) is required before final freeze.
 */

export type ActivityType =
  | 'Maintenance'
  | 'Inspection'
  | 'Repair'
  | 'Calibration'
  | 'Safety'
  | 'Quality'
  | 'Audit'
  | 'Incident'
  | 'SparePart'
  | 'Transfer'
  | 'Decommissioning'
  | 'Commissioning';

export const VALID_ACTIVITY_TYPES: readonly ActivityType[] = [
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

export interface EvidenceLocation {
  /**
   * Latitude represented as decimal number or normalized decimal string (e.g. 18.520430 or "18.520430")
   * Canonicalization normalizes this to a standard fixed 6-decimal-places string.
   */
  latitude: number | string;
  /**
   * Longitude represented as decimal number or normalized decimal string (e.g. 73.856744 or "73.856744")
   * Canonicalization normalizes this to a standard fixed 6-decimal-places string.
   */
  longitude: number | string;
  /**
   * Optional GPS accuracy in meters.
   * Normalized to fixed 2-decimal-places string if provided.
   */
  accuracy?: number | string | null;
  /**
   * Optional physical address or site description.
   * Normalized via Unicode NFC if provided.
   */
  address?: string | null;
  /**
   * Optional GPS fix timestamp in ISO-8601 UTC format.
   */
  timestamp?: string | null;
}

export interface MediaReferenceObject {
  id?: string;
  type?: string;
  url?: string;
  checksum?: string;
  size?: number;
  mimeType?: string;
  capturedAt?: string;
  uploadedAt?: string;
}

export type MediaReferenceItem = string | MediaReferenceObject;

export interface EvidencePackage {
  /** RFC 4122 UUID v4 linking this evidence record */
  evidenceId: string;
  /** RFC 4122 UUID v4 of the industrial asset */
  assetId: string;
  /** RFC 4122 UUID v4 of the technician or user */
  userId: string;
  /** Activity classification category */
  activityType: ActivityType;
  /** Event occurrence timestamp in ISO-8601 format */
  timestamp: string;
  /** Physical industrial location coordinates */
  location: EvidenceLocation;
  /** Descriptive textual summary of the event */
  description: string;
  /** List of URI / object-storage references or media metadata objects */
  mediaReferences: MediaReferenceItem[];
  /** Record creation timestamp in ISO-8601 format */
  createdAt: string;
}

export interface CanonicalLocation {
  accuracy?: string;
  address?: string;
  latitude: string;
  longitude: string;
  timestamp?: string;
}

export interface CanonicalEvidencePackage {
  activityType: ActivityType;
  assetId: string;
  createdAt: string;
  description: string;
  evidenceId: string;
  location: CanonicalLocation;
  mediaReferences: string[];
  timestamp: string;
  userId: string;
}

export interface CanonicalizationResult {
  /** Normalized canonical JavaScript object with lexicographically sorted keys */
  canonicalObject: CanonicalEvidencePackage;
  /** Deterministic JSON string representation (no extra whitespace) */
  canonicalJson: string;
  /** Raw UTF-8 bytes corresponding to the canonical JSON string */
  utf8Bytes: Uint8Array;
}

