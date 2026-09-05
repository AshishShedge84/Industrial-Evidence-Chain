using System.Security.Claims;
using backend.Controllers;
using backend.Data;
using backend.DTOs.Assets;
using backend.DTOs.Common;
using backend.Models;
using backend.Models.Enums;
using backend.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace backend.Tests.Assets;

public class AssetControllerEndpointTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly AssetService _assetService;
    private readonly AssetController _controller;

    private readonly Guid _managerId;
    private readonly Guid _adminId;
    private readonly Guid _techId;
    private readonly Guid _assigneeId;

    public AssetControllerEndpointTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _db = new AppDbContext(options);
        var auditLogService = new AuditLogService(_db, NullLogger<AuditLogService>.Instance);
        _assetService = new AssetService(_db, auditLogService);
        _controller = new AssetController(_assetService);

        _managerId = SeedUser("manager_user", "manager@example.com", AppRoles.Manager);
        _adminId = SeedUser("admin_user", "admin@example.com", AppRoles.Admin);
        _techId = SeedUser("tech_user", "tech@example.com", AppRoles.Technician);
        _assigneeId = SeedUser("assignee_user", "assignee@example.com", AppRoles.Technician);
    }

    private Guid SeedUser(string username, string email, string roleName)
    {
        var role = _db.Roles.FirstOrDefault(r => r.Name == roleName);
        if (role == null)
        {
            role = new Role { RoleId = Guid.NewGuid(), Name = roleName };
            _db.Roles.Add(role);
        }

        var user = new User
        {
            UserId = Guid.NewGuid(),
            Username = username,
            Email = email,
            FullName = $"{username} Full",
            PasswordHash = "hash",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        _db.Users.Add(user);

        _db.UserRoles.Add(new UserRole
        {
            UserRoleId = Guid.NewGuid(),
            UserId = user.UserId,
            RoleId = role.RoleId,
            AssignedAt = DateTime.UtcNow
        });

        _db.SaveChanges();
        return user.UserId;
    }

    private void SetUserContext(Guid userId, string role)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Role, role)
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
        };
    }

    [Fact]
    public async Task GetAssets_ReturnsOkWithApiResponse()
    {
        SetUserContext(_techId, AppRoles.Technician);

        var actionResult = await _controller.GetAssets();

        var okResult = Assert.IsType<OkObjectResult>(actionResult);
        var response = Assert.IsType<ApiResponse<PagedResult<AssetDto>>>(okResult.Value);

        Assert.True(response.Success);
        Assert.NotNull(response.Data);
        Assert.Equal(0, response.Data.Total);
    }

    [Fact]
    public async Task CreateAsset_WhenValid_Returns201Created()
    {
        SetUserContext(_managerId, AppRoles.Manager);

        var request = new CreateAssetRequestDto
        {
            AssetTag = "TAG-CTRL-01",
            Name = "Conveyor Belt Motor",
            Category = "Machinery",
            AssignedTo = _assigneeId
        };

        var actionResult = await _controller.CreateAsset(request);

        var createdResult = Assert.IsType<ObjectResult>(actionResult);
        Assert.Equal(StatusCodes.Status201Created, createdResult.StatusCode);

        var response = Assert.IsType<ApiResponse<AssetDto>>(createdResult.Value);
        Assert.True(response.Success);
        Assert.Equal("TAG-CTRL-01", response.Data!.AssetTag);
    }

    [Fact]
    public async Task GetAssetById_WhenFound_Returns200Ok()
    {
        SetUserContext(_managerId, AppRoles.Manager);

        var created = await _assetService.CreateAssetAsync(new CreateAssetRequestDto
        {
            AssetTag = "TAG-GET-01",
            Name = "Transformer",
            Category = "Equipment",
            AssignedTo = _assigneeId
        }, _managerId);

        var actionResult = await _controller.GetAssetById(created.Id);

        var okResult = Assert.IsType<OkObjectResult>(actionResult);
        var response = Assert.IsType<ApiResponse<AssetDto>>(okResult.Value);

        Assert.True(response.Success);
        Assert.Equal(created.Id, response.Data!.Id);
    }

    [Fact]
    public async Task GetAssetById_WhenNotFound_Returns404NotFound()
    {
        SetUserContext(_techId, AppRoles.Technician);

        var actionResult = await _controller.GetAssetById(Guid.NewGuid());

        var notFoundResult = Assert.IsType<NotFoundObjectResult>(actionResult);
        var response = Assert.IsType<ApiResponse<AssetDto>>(notFoundResult.Value);

        Assert.False(response.Success);
        Assert.Equal("ASSET_NOT_FOUND", response.Error!.Code);
    }

    [Fact]
    public async Task UpdateAsset_WhenValid_Returns200Ok()
    {
        SetUserContext(_managerId, AppRoles.Manager);

        var created = await _assetService.CreateAssetAsync(new CreateAssetRequestDto
        {
            AssetTag = "TAG-UPD-01",
            Name = "Cooling Tower",
            Category = "Facility",
            AssignedTo = _assigneeId
        }, _managerId);

        var actionResult = await _controller.UpdateAsset(created.Id, new UpdateAssetRequestDto
        {
            Status = "Maintenance"
        });

        var okResult = Assert.IsType<OkObjectResult>(actionResult);
        var response = Assert.IsType<ApiResponse<AssetDto>>(okResult.Value);

        Assert.True(response.Success);
        Assert.Equal("Maintenance", response.Data!.Status);
    }

    [Fact]
    public async Task DeleteAsset_CallsSoftDecommission_Returns200OkWithDecommissionedStatus()
    {
        SetUserContext(_adminId, AppRoles.Admin);

        var created = await _assetService.CreateAssetAsync(new CreateAssetRequestDto
        {
            AssetTag = "TAG-DEL-01",
            Name = "Old Forklift",
            Category = "Vehicle",
            AssignedTo = _assigneeId
        }, _adminId);

        var actionResult = await _controller.DeleteAsset(created.Id);

        var okResult = Assert.IsType<OkObjectResult>(actionResult);
        var response = Assert.IsType<ApiResponse<AssetDto>>(okResult.Value);

        Assert.True(response.Success);
        Assert.Equal("Decommissioned", response.Data!.Status);

        // Verify still in database
        var inDb = await _db.Assets.SingleOrDefaultAsync(a => a.AssetId == created.Id);
        Assert.NotNull(inDb);
        Assert.Equal(AssetStatus.Decommissioned, inDb.Status);
    }

    [Fact]
    public async Task GetAssetHistory_ReturnsOkWithHistoryList()
    {
        SetUserContext(_techId, AppRoles.Technician);

        var created = await _assetService.CreateAssetAsync(new CreateAssetRequestDto
        {
            AssetTag = "TAG-HIST-01",
            Name = "Pressure Gauge",
            Category = "Instrument",
            AssignedTo = _assigneeId
        }, _managerId);

        var actionResult = await _controller.GetAssetHistory(created.Id);

        var okResult = Assert.IsType<OkObjectResult>(actionResult);
        var response = Assert.IsType<ApiResponse<IReadOnlyList<AssetHistoryDto>>>(okResult.Value);

        Assert.True(response.Success);
        Assert.NotEmpty(response.Data!);
    }

    public void Dispose() => _db.Dispose();
}
