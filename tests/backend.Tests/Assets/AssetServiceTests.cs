using System.Text.Json;
using backend.Data;
using backend.DTOs.Assets;
using backend.Exceptions;
using backend.Models;
using backend.Models.Enums;
using backend.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace backend.Tests.Assets;

public class AssetServiceTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly AuditLogService _auditLogService;
    private readonly AssetService _sut;

    private readonly Guid _creatorId;
    private readonly Guid _assigneeId;

    public AssetServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _db = new AppDbContext(options);
        _auditLogService = new AuditLogService(_db, NullLogger<AuditLogService>.Instance);
        _sut = new AssetService(_db, _auditLogService);

        var creator = new User
        {
            UserId = Guid.NewGuid(),
            Username = "creator_user",
            Email = "creator@example.com",
            FullName = "Creator User",
            PasswordHash = "hash",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        var assignee = new User
        {
            UserId = Guid.NewGuid(),
            Username = "assignee_user",
            Email = "assignee@example.com",
            FullName = "Assignee User",
            PasswordHash = "hash",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _db.Users.AddRange(creator, assignee);
        _db.SaveChanges();

        _creatorId = creator.UserId;
        _assigneeId = assignee.UserId;
    }

    [Fact]
    public async Task CreateAsset_WithValidRequest_CreatesAssetAndAuditLog()
    {
        var request = new CreateAssetRequestDto
        {
            AssetTag = "TAG-100",
            Name = "Air Compressor 01",
            Description = "Primary shop compressor",
            Category = "Equipment",
            Location = new AssetLocationDto { Site = "Facility A", Building = "B2" },
            Specifications = JsonDocument.Parse("{\"maxPsi\":150}").RootElement,
            AssignedTo = _assigneeId
        };

        var result = await _sut.CreateAssetAsync(request, _creatorId);

        Assert.NotNull(result);
        Assert.Equal("TAG-100", result.AssetTag);
        Assert.Equal("Air Compressor 01", result.Name);
        Assert.Equal("Equipment", result.Category);
        Assert.Equal("Active", result.Status);
        Assert.Equal(_creatorId, result.CreatedBy);
        Assert.Equal(_assigneeId, result.AssignedTo);
        Assert.NotNull(result.Location);
        Assert.Equal("Facility A", result.Location.Site);

        // Verify audit log
        var logs = await _db.AuditLogs.Where(l => l.EntityId == result.Id.ToString()).ToListAsync();
        Assert.Single(logs);
        Assert.Equal("Created", logs[0].Action);
        Assert.Equal("Asset", logs[0].EntityType);
        Assert.Equal(_creatorId, logs[0].UserId);
    }

    [Fact]
    public async Task CreateAsset_DuplicateAssetTag_ThrowsConflictException()
    {
        var req1 = new CreateAssetRequestDto
        {
            AssetTag = "TAG-DUPLICATE",
            Name = "Unit 1",
            Category = "Tool",
            AssignedTo = _assigneeId
        };
        await _sut.CreateAssetAsync(req1, _creatorId);

        var req2 = new CreateAssetRequestDto
        {
            AssetTag = "TAG-DUPLICATE",
            Name = "Unit 2",
            Category = "Tool",
            AssignedTo = _assigneeId
        };

        await Assert.ThrowsAsync<ConflictException>(() => _sut.CreateAssetAsync(req2, _creatorId));
    }

    [Fact]
    public async Task CreateAsset_NonExistentAssignee_ThrowsValidationException()
    {
        var request = new CreateAssetRequestDto
        {
            AssetTag = "TAG-BAD-USER",
            Name = "Unit",
            Category = "Tool",
            AssignedTo = Guid.NewGuid()
        };

        await Assert.ThrowsAsync<ValidationException>(() => _sut.CreateAssetAsync(request, _creatorId));
    }

    [Fact]
    public async Task GetAssetsAsync_PaginationAndFiltering_ReturnsExpectedResult()
    {
        for (int i = 1; i <= 5; i++)
        {
            await _sut.CreateAssetAsync(new CreateAssetRequestDto
            {
                AssetTag = $"PAG-TAG-{i}",
                Name = $"Pump #{i}",
                Category = i % 2 == 0 ? "Machinery" : "Equipment",
                AssignedTo = _assigneeId
            }, _creatorId);
        }

        var pagedAll = await _sut.GetAssetsAsync(page: 1, pageSize: 2);
        Assert.Equal(5, pagedAll.Total);
        Assert.Equal(2, pagedAll.Items.Count);
        Assert.Equal(3, pagedAll.TotalPages);

        var filteredCat = await _sut.GetAssetsAsync(category: "Machinery");
        Assert.Equal(2, filteredCat.Total);

        var searchName = await _sut.GetAssetsAsync(query: "Pump #3");
        Assert.Single(searchName.Items);
        Assert.Equal("PAG-TAG-3", searchName.Items[0].AssetTag);
    }

    [Theory]
    [InlineData("Active")]
    [InlineData("Inactive")]
    [InlineData("Maintenance")]
    [InlineData("Retired")]
    [InlineData("Lost")]
    [InlineData("Decommissioned")]
    public async Task UpdateAsset_SupportsAllSixDistinctStatuses(string status)
    {
        var created = await _sut.CreateAssetAsync(new CreateAssetRequestDto
        {
            AssetTag = $"STATUS-TAG-{status}",
            Name = "Status Test Asset",
            Category = "Tool",
            AssignedTo = _assigneeId
        }, _creatorId);

        var updated = await _sut.UpdateAssetAsync(created.Id, new UpdateAssetRequestDto
        {
            Status = status
        }, _creatorId);

        Assert.NotNull(updated);
        Assert.Equal(status, updated.Status);
    }

    [Fact]
    public async Task UpdateAsset_InvalidStatus_ThrowsValidationException()
    {
        var created = await _sut.CreateAssetAsync(new CreateAssetRequestDto
        {
            AssetTag = "STATUS-BAD-TAG",
            Name = "Bad Status Asset",
            Category = "Tool",
            AssignedTo = _assigneeId
        }, _creatorId);

        await Assert.ThrowsAsync<ValidationException>(() => _sut.UpdateAssetAsync(created.Id, new UpdateAssetRequestDto
        {
            Status = "NonExistentStatus"
        }, _creatorId));
    }

    [Fact]
    public async Task DecommissionAsset_PerformsSoftDecommission_NeverDeletesRow()
    {
        var created = await _sut.CreateAssetAsync(new CreateAssetRequestDto
        {
            AssetTag = "DECOM-TAG-01",
            Name = "Asset To Decommission",
            Category = "Vehicle",
            AssignedTo = _assigneeId
        }, _creatorId);

        var decommissioned = await _sut.DecommissionAssetAsync(created.Id, _creatorId);

        Assert.NotNull(decommissioned);
        Assert.Equal("Decommissioned", decommissioned.Status);

        // Verify record still exists in DB
        var assetInDb = await _db.Assets.SingleOrDefaultAsync(a => a.AssetId == created.Id);
        Assert.NotNull(assetInDb);
        Assert.Equal(AssetStatus.Decommissioned, assetInDb.Status);

        // Verify audit log recorded
        var history = await _sut.GetAssetHistoryAsync(created.Id);
        Assert.True(history.Count >= 2); // Created + Decommissioned
        Assert.Contains(history, h => h.Action == "StatusChanged" || h.Action == "Decommissioned");
    }

    [Fact]
    public async Task GetAssetHistory_ReturnsCompleteAuditTrail()
    {
        var created = await _sut.CreateAssetAsync(new CreateAssetRequestDto
        {
            AssetTag = "HIST-TAG-01",
            Name = "History Asset",
            Category = "Instrument",
            AssignedTo = _assigneeId
        }, _creatorId);

        await _sut.UpdateAssetAsync(created.Id, new UpdateAssetRequestDto
        {
            Status = "Maintenance"
        }, _creatorId);

        var history = await _sut.GetAssetHistoryAsync(created.Id);

        Assert.Equal(2, history.Count);
        Assert.Equal(created.Id, history[0].AssetId);
    }

    public void Dispose() => _db.Dispose();
}
