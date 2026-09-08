using backend.Models.Enums;

namespace backend.Models;

/// <summary>
/// Registered application user (Technician, Manager, Auditor, Admin).
/// Maps to PostgreSQL table: users
/// </summary>
public class User
{
    public Guid UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
    public ICollection<Asset> CreatedAssets { get; set; } = new List<Asset>();
    public ICollection<Asset> AssignedAssets { get; set; } = new List<Asset>();
    public ICollection<EvidenceRecord> EvidenceRecords { get; set; } = new List<EvidenceRecord>();
    public ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
}

