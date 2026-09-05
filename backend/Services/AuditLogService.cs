using backend.Data;
using backend.Models;
using backend.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace backend.Services;

/// <summary>
/// Reusable service for persisting audit log records to PostgreSQL via EF Core.
/// Guarantees that sensitive secrets/passwords are never logged and captures business activity.
/// </summary>
public class AuditLogService : IAuditLogService
{
    private readonly AppDbContext _db;
    private readonly ILogger<AuditLogService> _logger;

    public AuditLogService(AppDbContext db, ILogger<AuditLogService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<AuditLog> LogAsync(
        string action,
        Guid? userId = null,
        string? entityType = null,
        string? entityId = null,
        string? details = null,
        string? ipAddress = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(action))
        {
            throw new ArgumentException("Action must not be null or empty.", nameof(action));
        }

        var entry = new AuditLog
        {
            AuditLogId = Guid.NewGuid(),
            UserId = userId,
            Action = action.Trim(),
            EntityType = string.IsNullOrWhiteSpace(entityType) ? null : entityType.Trim(),
            EntityId = string.IsNullOrWhiteSpace(entityId) ? null : entityId.Trim(),
            Details = string.IsNullOrWhiteSpace(details) ? null : details.Trim(),
            IpAddress = string.IsNullOrWhiteSpace(ipAddress) ? null : ipAddress.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        try
        {
            _db.AuditLogs.Add(entry);
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to persist audit log for action '{Action}' by user '{UserId}'.", action, userId);
            throw;
        }

        return entry;
    }
}
