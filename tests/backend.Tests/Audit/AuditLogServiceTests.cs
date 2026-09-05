using backend.Data;
using backend.Models;
using backend.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace backend.Tests.Audit;

public class AuditLogServiceTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly AuditLogService _sut;

    public AuditLogServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _db = new AppDbContext(options);
        _sut = new AuditLogService(_db, NullLogger<AuditLogService>.Instance);
    }

    [Fact]
    public async Task LogAsync_ValidAuditEvent_PersistsWithAllSuppliedFields()
    {
        var userId = Guid.NewGuid();
        var entityId = Guid.NewGuid().ToString();

        var entry = await _sut.LogAsync(
            action: "EvidenceCreated",
            userId: userId,
            entityType: "EvidenceRecord",
            entityId: entityId,
            details: "{\"hash\":\"abc123\"}",
            ipAddress: "192.168.1.100");

        Assert.NotNull(entry);
        Assert.NotEqual(Guid.Empty, entry.AuditLogId);
        Assert.Equal("EvidenceCreated", entry.Action);
        Assert.Equal(userId, entry.UserId);
        Assert.Equal("EvidenceRecord", entry.EntityType);
        Assert.Equal(entityId, entry.EntityId);
        Assert.Equal("{\"hash\":\"abc123\"}", entry.Details);
        Assert.Equal("192.168.1.100", entry.IpAddress);
        Assert.True(entry.CreatedAt <= DateTime.UtcNow);

        // Verify actually persisted in DB
        var inDb = await _db.AuditLogs.SingleOrDefaultAsync(a => a.AuditLogId == entry.AuditLogId);
        Assert.NotNull(inDb);
        Assert.Equal("EvidenceCreated", inDb.Action);
        Assert.Equal(userId, inDb.UserId);
    }

    [Fact]
    public async Task LogAsync_WithNullOptionalFields_HandlesSafely()
    {
        var entry = await _sut.LogAsync(action: "SystemStartup");

        Assert.NotNull(entry);
        Assert.Equal("SystemStartup", entry.Action);
        Assert.Null(entry.UserId);
        Assert.Null(entry.EntityType);
        Assert.Null(entry.EntityId);
        Assert.Null(entry.Details);
        Assert.Null(entry.IpAddress);

        var inDb = await _db.AuditLogs.SingleOrDefaultAsync(a => a.AuditLogId == entry.AuditLogId);
        Assert.NotNull(inDb);
        Assert.Equal("SystemStartup", inDb.Action);
        Assert.Null(inDb.UserId);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task LogAsync_EmptyAction_ThrowsArgumentException(string invalidAction)
    {
        await Assert.ThrowsAsync<ArgumentException>(() => _sut.LogAsync(action: invalidAction));
    }

    [Fact]
    public async Task LogAsync_NullAction_ThrowsArgumentException()
    {
        await Assert.ThrowsAsync<ArgumentException>(() => _sut.LogAsync(action: null!));
    }

    [Fact]
    public async Task LogAsync_TrimsWhitespaceFields()
    {
        var entry = await _sut.LogAsync(
            action: "  UserLogin  ",
            entityType: "  User  ",
            entityId: "  usr-1  ",
            details: "  Success  ",
            ipAddress: "  10.0.0.1  ");

        Assert.Equal("UserLogin", entry.Action);
        Assert.Equal("User", entry.EntityType);
        Assert.Equal("usr-1", entry.EntityId);
        Assert.Equal("Success", entry.Details);
        Assert.Equal("10.0.0.1", entry.IpAddress);
    }

    public void Dispose() => _db.Dispose();
}
