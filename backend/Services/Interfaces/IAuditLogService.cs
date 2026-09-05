using backend.Models;

namespace backend.Services.Interfaces;

/// <summary>
/// Service contract for recording system and security audit logs.
/// </summary>
public interface IAuditLogService
{
    /// <summary>
    /// Records an audit log event asynchronously.
    /// </summary>
    /// <param name="action">Mandatory action identifier (e.g. "UserLogin", "EvidenceCreated", "AssetRegistered").</param>
    /// <param name="userId">Optional ID of the actor performing the action (null for system actions).</param>
    /// <param name="entityType">Optional affected entity type (e.g. "User", "EvidenceRecord", "Asset").</param>
    /// <param name="entityId">Optional string representation of the target entity primary key.</param>
    /// <param name="details">Optional business context, change summary, or JSON details (never sensitive credentials).</param>
    /// <param name="ipAddress">Optional client IP address.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task<AuditLog> LogAsync(
        string action,
        Guid? userId = null,
        string? entityType = null,
        string? entityId = null,
        string? details = null,
        string? ipAddress = null,
        CancellationToken cancellationToken = default);
}
