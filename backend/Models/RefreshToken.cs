namespace backend.Models;

/// <summary>
/// Cryptographically secure refresh token for session extension and token rotation.
/// Maps to PostgreSQL table: refresh_tokens
/// </summary>
public class RefreshToken
{
    public Guid TokenId { get; set; }
    public Guid UserId { get; set; }

    /// <summary>SHA-256 hash of the plain-text refresh token string.</summary>
    public string TokenHash { get; set; } = string.Empty;

    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? RevokedAt { get; set; }
    public string? ReplacedByTokenHash { get; set; }

    public bool IsActive => RevokedAt == null && DateTime.UtcNow < ExpiresAt;

    // Navigation property
    public User User { get; set; } = null!;
}
