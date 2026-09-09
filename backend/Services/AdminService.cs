using backend.Data;
using backend.DTOs.Admin;
using backend.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace backend.Services;

/// <summary>
/// Implements administrative user operations: user listing and status approval/deactivation.
/// Sensitive fields (passwords, hashes) are strictly excluded from returned DTOs.
/// </summary>
public class AdminService : IAdminService
{
    private readonly AppDbContext _db;

    public AdminService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<IEnumerable<UserDto>> GetAllUsersAsync()
    {
        var users = await _db.Users
            .AsNoTracking()
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .OrderByDescending(u => u.CreatedAt)
            .ToListAsync();

        return users.Select(u => new UserDto
        {
            UserId = u.UserId,
            Username = u.Username,
            Email = u.Email,
            FullName = u.FullName,
            IsActive = u.IsActive,
            Roles = u.UserRoles.Select(ur => ur.Role.Name).ToList(),
            CreatedAt = u.CreatedAt,
            UpdatedAt = u.UpdatedAt
        });
    }

    public async Task<UserDto?> UpdateUserStatusAsync(Guid userId, UpdateUserStatusDto dto)
    {
        var user = await _db.Users
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .SingleOrDefaultAsync(u => u.UserId == userId);

        if (user is null)
            return null;

        user.IsActive = dto.ResolveIsActive();
        user.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return new UserDto
        {
            UserId = user.UserId,
            Username = user.Username,
            Email = user.Email,
            FullName = user.FullName,
            IsActive = user.IsActive,
            Roles = user.UserRoles.Select(ur => ur.Role.Name).ToList(),
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt
        };
    }

    public async Task<IEnumerable<AdminAuditLogDto>> GetAuditLogsAsync(int limit = 100)
    {
        var logs = await _db.AuditLogs
            .AsNoTracking()
            .Include(a => a.User)
            .OrderByDescending(a => a.CreatedAt)
            .Take(limit)
            .ToListAsync();

        return logs.Select(a => new AdminAuditLogDto
        {
            Id = a.AuditLogId,
            Action = a.Action,
            EntityType = a.EntityType,
            EntityId = a.EntityId,
            PerformedBy = a.User?.FullName ?? a.User?.Username ?? "System",
            UserId = a.UserId,
            PerformedAt = a.CreatedAt,
            Details = a.Details,
            IpAddress = a.IpAddress
        });
    }
}

