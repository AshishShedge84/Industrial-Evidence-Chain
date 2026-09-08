namespace backend.DTOs.Evidence;

/// <summary>
/// Canonical location payload model for geographic coordinates.
/// Coordinates are formatted to 6 decimal places (e.g. "18.520430").
/// </summary>
public class CanonicalLocationPayload
{
    public string Latitude { get; set; } = "0.000000";
    public string Longitude { get; set; } = "0.000000";
}

/// <summary>
/// Canonical evidence payload model for cryptographic SHA-256 hashing.
/// Conforms to RFC 8785 JSON Canonicalization Scheme (JCS) and Member 2's blockchain contract.
/// </summary>
public class CanonicalEvidencePayload
{
    public string EvidenceId { get; set; } = string.Empty;
    public string AssetId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string ActivityType { get; set; } = string.Empty;
    public string Timestamp { get; set; } = string.Empty;
    public string CreatedAt { get; set; } = string.Empty;
    public CanonicalLocationPayload Location { get; set; } = new();
    public string Description { get; set; } = string.Empty;
    public IList<string> MediaReferences { get; set; } = new List<string>();

    [Obsolete("Use Location.Latitude instead")]
    public string? Latitude
    {
        get => Location?.Latitude;
        set
        {
            Location ??= new CanonicalLocationPayload();
            if (value != null) Location.Latitude = value;
        }
    }

    [Obsolete("Use Location.Longitude instead")]
    public string? Longitude
    {
        get => Location?.Longitude;
        set
        {
            Location ??= new CanonicalLocationPayload();
            if (value != null) Location.Longitude = value;
        }
    }

    [Obsolete("Use MediaReferences instead")]
    public IList<string> MediaHashes
    {
        get => MediaReferences;
        set => MediaReferences = value;
    }
}
