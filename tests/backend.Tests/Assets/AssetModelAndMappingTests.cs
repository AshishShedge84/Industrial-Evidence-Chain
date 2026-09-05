using backend.Data;
using backend.Models;
using backend.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace backend.Tests.Assets;

public class AssetModelAndMappingTests : IDisposable
{
    private readonly AppDbContext _db;

    public AssetModelAndMappingTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _db = new AppDbContext(options);
    }

    [Fact]
    public void AssetStatusEnum_ContainsAllSixApprovedDistinctValues()
    {
        var names = Enum.GetNames<AssetStatus>();

        Assert.Equal(6, names.Length);
        Assert.Contains("Active", names);
        Assert.Contains("Inactive", names);
        Assert.Contains("Maintenance", names);
        Assert.Contains("Retired", names);
        Assert.Contains("Lost", names);
        Assert.Contains("Decommissioned", names);
    }

    [Fact]
    public async Task AssetModel_CanBeCreatedAndRetrievedWithAllRequiredFields()
    {
        var creator = new User
        {
            UserId = Guid.NewGuid(),
            Username = "creator",
            Email = "creator@example.com",
            FullName = "Creator User",
            PasswordHash = "hash"
        };
        var assignee = new User
        {
            UserId = Guid.NewGuid(),
            Username = "assignee",
            Email = "assignee@example.com",
            FullName = "Assignee User",
            PasswordHash = "hash"
        };

        _db.Users.AddRange(creator, assignee);

        var asset = new Asset
        {
            AssetId = Guid.NewGuid(),
            Name = "Turbine Generator 1",
            Description = "Main unit",
            AssetCode = "EQ-TURBINE-001",
            Category = "Machinery",
            Location = "Sector 4",
            Status = AssetStatus.Active,
            Specifications = "{\"power\":\"500kW\",\"voltage\":\"400V\"}",
            CreatedByUserId = creator.UserId,
            AssignedToUserId = assignee.UserId,
            CreatedAt = DateTime.UtcNow
        };

        _db.Assets.Add(asset);
        await _db.SaveChangesAsync();

        var retrieved = await _db.Assets
            .Include(a => a.CreatedBy)
            .Include(a => a.AssignedTo)
            .SingleAsync(a => a.AssetId == asset.AssetId);

        Assert.NotNull(retrieved);
        Assert.Equal("Turbine Generator 1", retrieved.Name);
        Assert.Equal("Machinery", retrieved.Category);
        Assert.Equal("EQ-TURBINE-001", retrieved.AssetCode);
        Assert.Equal(AssetStatus.Active, retrieved.Status);
        Assert.Equal("{\"power\":\"500kW\",\"voltage\":\"400V\"}", retrieved.Specifications);
        Assert.Equal(creator.UserId, retrieved.CreatedBy.UserId);
        Assert.Equal(assignee.UserId, retrieved.AssignedTo.UserId);
    }

    [Fact]
    public async Task User_AssignedAssets_NavigationPopulatesCorrectly()
    {
        var user = new User
        {
            UserId = Guid.NewGuid(),
            Username = "techlead",
            Email = "lead@example.com",
            FullName = "Tech Lead",
            PasswordHash = "hash"
        };
        _db.Users.Add(user);

        var asset1 = new Asset
        {
            AssetId = Guid.NewGuid(),
            Name = "Pump A",
            AssetCode = "EQ-PUMP-A",
            Category = "Equipment",
            Specifications = "{}",
            CreatedByUserId = user.UserId,
            AssignedToUserId = user.UserId,
            CreatedAt = DateTime.UtcNow
        };
        var asset2 = new Asset
        {
            AssetId = Guid.NewGuid(),
            Name = "Pump B",
            AssetCode = "EQ-PUMP-B",
            Category = "Equipment",
            Specifications = "{}",
            CreatedByUserId = user.UserId,
            AssignedToUserId = user.UserId,
            CreatedAt = DateTime.UtcNow
        };

        _db.Assets.AddRange(asset1, asset2);
        await _db.SaveChangesAsync();

        var retrievedUser = await _db.Users
            .Include(u => u.AssignedAssets)
            .Include(u => u.CreatedAssets)
            .SingleAsync(u => u.UserId == user.UserId);

        Assert.Equal(2, retrievedUser.AssignedAssets.Count);
        Assert.Equal(2, retrievedUser.CreatedAssets.Count);
    }

    [Fact]
    public void AppDbContext_AssetEntityMapping_ConfiguresExpectedForeignKeysAndRestrictDelete()
    {
        var entityType = _db.Model.FindEntityType(typeof(Asset));
        Assert.NotNull(entityType);

        var createdByFk = entityType.FindForeignKeys(
            entityType.FindProperty(nameof(Asset.CreatedByUserId))!).Single();
        Assert.Equal(DeleteBehavior.Restrict, createdByFk.DeleteBehavior);

        var assignedToFk = entityType.FindForeignKeys(
            entityType.FindProperty(nameof(Asset.AssignedToUserId))!).Single();
        Assert.Equal(DeleteBehavior.Restrict, assignedToFk.DeleteBehavior);
    }

    [Fact]
    public void AppDbContext_AssetEntityMapping_ConfiguresRequiredProperties()
    {
        var entityType = _db.Model.FindEntityType(typeof(Asset));
        Assert.NotNull(entityType);

        var categoryProp = entityType.FindProperty(nameof(Asset.Category));
        Assert.NotNull(categoryProp);
        Assert.False(categoryProp.IsNullable);

        var specsProp = entityType.FindProperty(nameof(Asset.Specifications));
        Assert.NotNull(specsProp);
        Assert.False(specsProp.IsNullable);

        var statusProp = entityType.FindProperty(nameof(Asset.Status));
        Assert.NotNull(statusProp);
        Assert.False(statusProp.IsNullable);
    }

    public void Dispose() => _db.Dispose();
}
