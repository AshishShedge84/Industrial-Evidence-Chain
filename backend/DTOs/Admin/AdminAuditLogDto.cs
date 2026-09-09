namespace backend.DTOs.Admin;

/// <summary>
/// Audit log entry DTO for administrative system-wide auditing.
/// </summary>
public class AdminAuditLogDto
{
    public Guid Id { get; set; }
    public string Action { get; set; } = string.Empty;
    public string? EntityType { get; set; }
    public string? EntityId { get; set; }
    public string PerformedBy { get; set; } = "System";
    public Guid? UserId { get; set; }
    public DateTime PerformedAt { get; set; }
    public string? Details { get; set; }
    public string? IpAddress { get; set; }
}
