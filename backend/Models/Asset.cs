using backend.Models.Enums;

namespace backend.Models;

/// <summary>
/// Industrial asset registered in the system (identified via QR code).
/// Maps to PostgreSQL table: assets
/// </summary>
public class Asset
{
    public Guid AssetId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    /// <summary>Unique asset code / tag — used as QR code payload.</summary>
    public string AssetCode { get; set; } = string.Empty;

    public string Category { get; set; } = string.Empty;
    public string? Location { get; set; }
    public AssetStatus Status { get; set; } = AssetStatus.Active;
    public string Specifications { get; set; } = "{}";

    public Guid CreatedByUserId { get; set; }
    public Guid AssignedToUserId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public User CreatedBy { get; set; } = null!;
    public User AssignedTo { get; set; } = null!;
    public ICollection<EvidenceRecord> EvidenceRecords { get; set; } = new List<EvidenceRecord>();
    public ICollection<BlockchainProof> BlockchainProofs { get; set; } = new List<BlockchainProof>();
}

