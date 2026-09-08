namespace backend.Models;

/// <summary>
/// Application audit log entry for important system actions.
/// Maps to PostgreSQL table: audit_logs
/// </summary>
public class AuditLog
{
    public Guid AuditLogId { get; set; }

    /// <summary>Null for system-generated events with no authenticated user.</summary>
    public Guid? UserId { get; set; }

    /// <summary>Description of the action performed (e.g. "EvidenceCreated", "UserLogin").</summary>
    public string Action { get; set; } = string.Empty;

    /// <summary>Entity type affected (e.g. "EvidenceRecord", "Asset"). Nullable.</summary>
    public string? EntityType { get; set; }

    /// <summary>String representation of the affected entity's PK. Nullable.</summary>
    public string? EntityId { get; set; }

    /// <summary>Additional context/details in free-text or JSON format. Nullable.</summary>
    public string? Details { get; set; }

    public string? IpAddress { get; set; }
    public DateTime CreatedAt { get; set; }

    // Navigation properties
    public User? User { get; set; }
}
