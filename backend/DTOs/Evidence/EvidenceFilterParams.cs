using backend.Models.Enums;

namespace backend.DTOs.Evidence;

/// <summary>
/// Query parameters for filtering and paginating evidence records.
/// </summary>
public class EvidenceFilterParams
{
    /// <summary>Optional filter by specific Asset unique ID.</summary>
    public Guid? AssetId { get; set; }

    /// <summary>Optional filter by submitting User unique ID.</summary>
    public Guid? UserId { get; set; }

    /// <summary>Optional filter by ActivityType.</summary>
    public ActivityType? ActivityType { get; set; }

    /// <summary>Optional filter by AnchorStatus (Pending, Anchored, Failed).</summary>
    public AnchorStatus? AnchorStatus { get; set; }

    /// <summary>Optional start date filter (UTC).</summary>
    public DateTime? FromDate { get; set; }

    /// <summary>Optional end date filter (UTC).</summary>
    public DateTime? ToDate { get; set; }

    /// <summary>Optional search term matching Description or EvidenceHash.</summary>
    public string? Query { get; set; }

    /// <summary>Optional filter by VerificationStatus (PENDING_VERIFICATION, VERIFIED, INTEGRITY_MISMATCH, DRAFT).</summary>
    public string? VerificationStatus { get; set; }

    /// <summary>Optional filter by assigned Manager unique ID.</summary>
    public Guid? AssignedManagerId { get; set; }

    /// <summary>Page number (1-based, default 1).</summary>
    public int Page { get; set; } = 1;

    /// <summary>Page size (default 20, max 100).</summary>
    public int PageSize { get; set; } = 20;
}
