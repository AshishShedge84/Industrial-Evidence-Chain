using System.Text.Json;
using backend.Data;
using backend.DTOs.Assets;
using backend.DTOs.Common;
using backend.Exceptions;
using backend.Models;
using backend.Models.Enums;
using backend.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace backend.Services;

/// <summary>
/// Service implementation for managing industrial assets, soft decommissioning, and lifecycle history.
/// </summary>
public class AssetService : IAssetService
{
    private readonly AppDbContext _db;
    private readonly IAuditLogService _auditLogs;
    private readonly INotificationService _notificationService;

    public AssetService(AppDbContext db, IAuditLogService auditLogs, INotificationService notificationService)
    {
        _db = db;
        _auditLogs = auditLogs;
        _notificationService = notificationService;
    }

    public async Task<PagedResult<AssetDto>> GetAssetsAsync(
        string? query = null,
        string? category = null,
        string? status = null,
        Guid? assignedTo = null,
        int page = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;
        if (pageSize > 100) pageSize = 100;

        IQueryable<Asset> q = _db.Assets.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(query))
        {
            var term = query.Trim().ToLower();
            q = q.Where(a => a.AssetCode.ToLower().Contains(term) ||
                             a.QrIdentifier.ToLower().Contains(term) ||
                             a.Name.ToLower().Contains(term) ||
                             (a.Description != null && a.Description.ToLower().Contains(term)));
        }

        if (!string.IsNullOrWhiteSpace(category))
        {
            var cat = category.Trim().ToLower();
            q = q.Where(a => a.Category.ToLower() == cat);
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            if (Enum.TryParse<AssetStatus>(status.Trim(), true, out var parsedStatus))
            {
                q = q.Where(a => a.Status == parsedStatus);
            }
            else
            {
                // Unrecognized status filter returns 0 results
                return new PagedResult<AssetDto>
                {
                    Items = Array.Empty<AssetDto>(),
                    Total = 0,
                    Page = page,
                    PageSize = pageSize
                };
            }
        }

        if (assignedTo.HasValue && assignedTo.Value != Guid.Empty)
        {
            q = q.Where(a => a.AssignedToUserId == assignedTo.Value);
        }

        var total = await q.CountAsync(cancellationToken);

        var items = await q
            .OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var dtos = items.Select(MapToDto).ToList();

        return new PagedResult<AssetDto>
        {
            Items = dtos,
            Total = total,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<AssetDto?> GetAssetByIdAsync(Guid assetId, CancellationToken cancellationToken = default)
    {
        var assetIdString = assetId.ToString();
        var asset = await _db.Assets
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.AssetId == assetId || a.QrIdentifier == assetIdString, cancellationToken);

        return asset == null ? null : MapToDto(asset);
    }

    public async Task<AssetDto> CreateAssetAsync(
        CreateAssetRequestDto request,
        Guid createdByUserId,
        CancellationToken cancellationToken = default)
    {
        var assetTag = request.AssetTag.Trim();
        var name = request.Name.Trim();
        var category = request.Category.Trim();

        // 1. Verify uniqueness of AssetTag / AssetCode
        var exists = await _db.Assets.AnyAsync(a => a.AssetCode.ToLower() == assetTag.ToLower(), cancellationToken);
        if (exists)
        {
            throw new ConflictException($"Asset tag '{assetTag}' is already registered.");
        }

        // 2. Verify assigned user exists
        var assigneeExists = await _db.Users.AnyAsync(u => u.UserId == request.AssignedTo, cancellationToken);
        if (!assigneeExists)
        {
            throw new ValidationException($"Assigned user with ID '{request.AssignedTo}' does not exist.");
        }

        // 3. Serialize structured Location and Specifications
        string? locationJson = request.Location != null
            ? JsonSerializer.Serialize(request.Location)
            : null;

        string specsJson = request.Specifications.HasValue
            ? request.Specifications.Value.GetRawText()
            : "{}";

        var asset = new Asset
        {
            AssetId = Guid.NewGuid(),
            AssetCode = assetTag,
            Name = name,
            Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            Category = category,
            Location = locationJson,
            Status = AssetStatus.Active,
            Specifications = specsJson,
            CreatedByUserId = createdByUserId,
            AssignedToUserId = request.AssignedTo,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = null,
            QrIdentifier = Guid.NewGuid().ToString()
        };

        _db.Assets.Add(asset);
        await _db.SaveChangesAsync(cancellationToken);

        if (asset.AssignedToUserId != Guid.Empty)
        {
            await _notificationService.CreateNotificationAsync(
                asset.AssignedToUserId,
                "Asset Assigned",
                $"You have been assigned to a new asset: {asset.Name} ({asset.AssetCode})",
                "AssetAssigned",
                asset.AssetId,
                cancellationToken
            );
        }

        // 4. Record audit log
        await _auditLogs.LogAsync(
            action: "Created",
            userId: createdByUserId,
            entityType: "Asset",
            entityId: asset.AssetId.ToString(),
            details: JsonSerializer.Serialize(new
            {
                assetTag = asset.AssetCode,
                name = asset.Name,
                category = asset.Category,
                status = asset.Status.ToString(),
                assignedTo = asset.AssignedToUserId
            }),
            cancellationToken: cancellationToken);

        return MapToDto(asset);
    }

    public async Task<AssetDto?> UpdateAssetAsync(
        Guid assetId,
        UpdateAssetRequestDto request,
        Guid updatedByUserId,
        CancellationToken cancellationToken = default)
    {
        var asset = await _db.Assets.SingleOrDefaultAsync(a => a.AssetId == assetId, cancellationToken);
        if (asset == null)
            return null;

        var previousStatus = asset.Status;
        bool statusChanged = false;

        if (!string.IsNullOrWhiteSpace(request.Name))
            asset.Name = request.Name.Trim();

        if (request.Description != null)
            asset.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();

        if (!string.IsNullOrWhiteSpace(request.Category))
            asset.Category = request.Category.Trim();

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            if (Enum.TryParse<AssetStatus>(request.Status.Trim(), true, out var newStatus))
            {
                if (asset.Status != newStatus)
                {
                    asset.Status = newStatus;
                    statusChanged = true;
                }
            }
            else
            {
                throw new ValidationException($"Invalid asset status '{request.Status}'. Allowed: Active, Inactive, Maintenance, Retired, Lost, Decommissioned.");
            }
        }

        if (request.Location != null)
        {
            asset.Location = JsonSerializer.Serialize(request.Location);
        }

        if (request.Specifications.HasValue)
        {
            asset.Specifications = request.Specifications.Value.GetRawText();
        }

        if (request.AssignedTo.HasValue && request.AssignedTo.Value != Guid.Empty)
        {
            var assigneeExists = await _db.Users.AnyAsync(u => u.UserId == request.AssignedTo.Value, cancellationToken);
            if (!assigneeExists)
            {
                throw new ValidationException($"Assigned user with ID '{request.AssignedTo.Value}' does not exist.");
            }
            if (asset.AssignedToUserId != request.AssignedTo.Value) {
                asset.AssignedToUserId = request.AssignedTo.Value;
                // Send notification to the assignee
                await _notificationService.CreateNotificationAsync(
                    request.AssignedTo.Value,
                    "Asset Assigned",
                    $"You have been assigned to asset: {asset.Name} ({asset.AssetCode})",
                    "AssetAssigned",
                    asset.AssetId,
                    cancellationToken
                );
            }
        }

        asset.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);

        // Record audit log
        var actionName = statusChanged ? "StatusChanged" : "Updated";
        await _auditLogs.LogAsync(
            action: actionName,
            userId: updatedByUserId,
            entityType: "Asset",
            entityId: asset.AssetId.ToString(),
            details: JsonSerializer.Serialize(new
            {
                previousStatus = previousStatus.ToString(),
                newStatus = asset.Status.ToString(),
                updatedAt = asset.UpdatedAt
            }),
            cancellationToken: cancellationToken);

        return MapToDto(asset);
    }

    public async Task<AssetDto?> DecommissionAssetAsync(
        Guid assetId,
        Guid performedByUserId,
        CancellationToken cancellationToken = default)
    {
        var asset = await _db.Assets.SingleOrDefaultAsync(a => a.AssetId == assetId, cancellationToken);
        if (asset == null)
            return null;

        var previousStatus = asset.Status;
        asset.Status = AssetStatus.Decommissioned;
        asset.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);

        // Record audit log for soft decommission
        await _auditLogs.LogAsync(
            action: "StatusChanged",
            userId: performedByUserId,
            entityType: "Asset",
            entityId: asset.AssetId.ToString(),
            details: JsonSerializer.Serialize(new
            {
                action = "Decommissioned",
                previousStatus = previousStatus.ToString(),
                newStatus = AssetStatus.Decommissioned.ToString()
            }),
            cancellationToken: cancellationToken);

        return MapToDto(asset);
    }

    public async Task<IReadOnlyList<AssetHistoryDto>> GetAssetHistoryAsync(Guid assetId, CancellationToken cancellationToken = default)
    {
        var entityIdStr = assetId.ToString();

        var logs = await _db.AuditLogs
            .AsNoTracking()
            .Where(l => l.EntityType == "Asset" && l.EntityId == entityIdStr)
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync(cancellationToken);

        var history = new List<AssetHistoryDto>();

        foreach (var log in logs)
        {
            JsonElement? detailsElement = null;
            string? prevStatus = null;
            string? newStatus = null;

            if (!string.IsNullOrWhiteSpace(log.Details))
            {
                try
                {
                    using var doc = JsonDocument.Parse(log.Details);
                    detailsElement = doc.RootElement.Clone();

                    if (detailsElement.Value.TryGetProperty("previousStatus", out var psProp))
                        prevStatus = psProp.GetString();

                    if (detailsElement.Value.TryGetProperty("newStatus", out var nsProp))
                        newStatus = nsProp.GetString();
                }
                catch
                {
                    // Fallback if details is non-JSON text
                }
            }

            history.Add(new AssetHistoryDto
            {
                Id = log.AuditLogId,
                AssetId = assetId,
                Action = log.Action,
                PerformedBy = log.UserId?.ToString() ?? "System",
                PerformedAt = log.CreatedAt,
                Details = detailsElement,
                PreviousStatus = prevStatus,
                NewStatus = newStatus
            });
        }

        return history;
    }

    private static AssetDto MapToDto(Asset asset)
    {
        AssetLocationDto? locationDto = null;
        if (!string.IsNullOrWhiteSpace(asset.Location))
        {
            try
            {
                locationDto = JsonSerializer.Deserialize<AssetLocationDto>(asset.Location, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });
            }
            catch
            {
                // Fallback for simple string locations
                locationDto = new AssetLocationDto { Site = asset.Location };
            }
        }

        JsonElement? specsElement = null;
        if (!string.IsNullOrWhiteSpace(asset.Specifications))
        {
            try
            {
                using var doc = JsonDocument.Parse(asset.Specifications);
                specsElement = doc.RootElement.Clone();
            }
            catch
            {
                // If not valid JSON, leave null
            }
        }

        return new AssetDto
        {
            Id = asset.AssetId,
            AssetTag = asset.AssetCode,
            Name = asset.Name,
            Description = asset.Description,
            Category = asset.Category,
            Status = asset.Status.ToString(),
            Location = locationDto,
            Specifications = specsElement,
            QrCode = asset.QrIdentifier,
            CreatedAt = asset.CreatedAt,
            UpdatedAt = asset.UpdatedAt,
            CreatedBy = asset.CreatedByUserId,
            AssignedTo = asset.AssignedToUserId
        };
    }
}
