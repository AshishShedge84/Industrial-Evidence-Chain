using backend.Models.Enums;

namespace backend.Models;

/// <summary>
/// Evidence record for an industrial event linked to an asset.
/// Matches the approved Evidence Contract schema.
/// Maps to PostgreSQL table: evidence_records
/// </summary>
public class EvidenceRecord
{
    public Guid EvidenceId { get; set; }
    public Guid AssetId { get; set; }
    public Guid UserId { get; set; }
    public ActivityType ActivityType { get; set; }

    /// <summary>Time the real-world event occurred (ISO-8601 / UTC).</summary>
    public DateTime Timestamp { get; set; }

    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public string Description { get; set; } = string.Empty;

    /// <summary>SHA-256 hash of the canonical evidence package. Null until computed.</summary>
    public string? EvidenceHash { get; set; }

    public AnchorStatus AnchorStatus { get; set; } = AnchorStatus.Pending;
    public DateTime CreatedAt { get; set; }

    public Guid? AssignedManagerId { get; set; }

    // Navigation properties
    public Asset Asset { get; set; } = null!;
    public User User { get; set; } = null!;
    public User? AssignedManager { get; set; }
    public ICollection<EvidenceMedia> MediaFiles { get; set; } = new List<EvidenceMedia>();
    public BlockchainProof? BlockchainProof { get; set; }
}
