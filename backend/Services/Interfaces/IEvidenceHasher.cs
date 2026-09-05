using backend.DTOs.Evidence;
using backend.Models;

namespace backend.Services.Interfaces;

/// <summary>
/// Evidence hashing service contract.
/// Enforces deterministic RFC 8785 canonicalization and SHA-256 evidence hashing.
/// </summary>
public interface IEvidenceHasher
{
    /// <summary>
    /// Builds deterministic RFC 8785 canonical JSON bytes for an evidence record.
    /// </summary>
    byte[] Canonicalize(CanonicalEvidencePayload payload);

    /// <summary>
    /// Computes lowercase 64-character hexadecimal SHA-256 hash of the canonical evidence payload.
    /// </summary>
    string ComputeHash(CanonicalEvidencePayload payload);

    /// <summary>
    /// Convenience method to compute SHA-256 hash directly from EvidenceRecord entity and optional media hashes.
    /// </summary>
    string ComputeHash(EvidenceRecord record, IEnumerable<string>? mediaHashes = null);
}
