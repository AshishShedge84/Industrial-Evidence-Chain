using System.Text.Json;

namespace backend.DTOs.Evidence;

/// <summary>
/// Audit trail entry representation for evidence and asset lifecycle events.
/// </summary>
public class AuditTrailEntryDto
{
    public Guid Id { get; set; }
    public Guid EvidenceId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string PerformedBy { get; set; } = string.Empty;
    public DateTime PerformedAt { get; set; }
    public JsonElement? Details { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
}
