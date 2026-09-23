using backend.Models.Enums;

namespace backend.DTOs.Evidence;

/// <summary>
/// Full evidence record representation returned in Evidence API responses.
/// </summary>
public class EvidenceDto
{
    public Guid EvidenceId { get; set; }
    public Guid AssetId { get; set; }
    public Guid UserId { get; set; }
    public ActivityType ActivityType { get; set; }
    public DateTime Timestamp { get; set; }
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public string Description { get; set; } = string.Empty;
    public IList<string> MediaHashes { get; set; } = new List<string>();
    public AnchorStatus AnchorStatus { get; set; } = AnchorStatus.Pending;
    public string? EvidenceHash { get; set; }
    public string? AssetName { get; set; }
    public string? AssetCode { get; set; }
    public string? UserName { get; set; }
    public string? UserRole { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string VerificationStatus { get; set; } = "PENDING_VERIFICATION";
    public DateTime? VerifiedAt { get; set; }
    public string? VerifiedBy { get; set; }
    public Guid? AssignedManagerId { get; set; }
    public string? AssignedManagerName { get; set; }
    public string? TransactionId { get; set; }
    public DateTime? AnchoredAt { get; set; }
}
