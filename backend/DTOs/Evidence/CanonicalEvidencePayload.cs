using backend.Models.Enums;

namespace backend.DTOs.Evidence;

/// <summary>
/// Canonical evidence payload model for cryptographic SHA-256 hashing.
/// Conforms to RFC 8785 JSON Canonicalization Scheme (JCS).
/// </summary>
public class CanonicalEvidencePayload
{
    public string EvidenceId { get; set; } = string.Empty;
    public string AssetId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string ActivityType { get; set; } = string.Empty;
    public string Timestamp { get; set; } = string.Empty;
    public string? Latitude { get; set; }
    public string? Longitude { get; set; }
    public string Description { get; set; } = string.Empty;
    public IList<string> MediaHashes { get; set; } = new List<string>();
}
