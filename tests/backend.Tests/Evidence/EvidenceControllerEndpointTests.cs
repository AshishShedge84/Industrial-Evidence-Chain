using System.Security.Claims;
using backend.Controllers;
using backend.Data;
using backend.DTOs.Common;
using backend.DTOs.Evidence;
using backend.Models;
using backend.Models.Enums;
using backend.Services;
using backend.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace backend.Tests.Evidence;

public class EvidenceControllerEndpointTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly EvidenceService _evidenceService;
    private readonly EvidenceController _controller;
    private readonly MockBlockchainAdapter _blockchainAdapter;

    private readonly Guid _techUserId;
    private readonly Guid _auditorUserId;
    private readonly Guid _assetId;

    public EvidenceControllerEndpointTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _db = new AppDbContext(options);
        var auditLogService = new AuditLogService(_db, NullLogger<AuditLogService>.Instance);
        var hasher = new EvidenceHasher();
        _blockchainAdapter = new MockBlockchainAdapter(NullLogger<MockBlockchainAdapter>.Instance);

        var storagePath = Path.Combine(Path.GetTempPath(), "iec_ctrl_tests_" + Guid.NewGuid().ToString("N"));
        var storageOptions = Microsoft.Extensions.Options.Options.Create(new backend.Settings.FileStorageSettings { BasePath = storagePath });
        var storageService = new LocalFileStorageService(storageOptions, NullLogger<LocalFileStorageService>.Instance);

        var services = new ServiceCollection();
        services.AddSingleton<IBlockchainAdapter>(_blockchainAdapter);
        var serviceProvider = services.BuildServiceProvider();

        _evidenceService = new EvidenceService(_db, hasher, auditLogService, storageService, serviceProvider);
        _controller = new EvidenceController(_evidenceService);

        _techUserId = SeedUser("tech_user", "tech@example.com", AppRoles.Technician);
        _auditorUserId = SeedUser("auditor_user", "auditor@example.com", AppRoles.Auditor);

        var asset = new Asset
        {
            AssetId = Guid.NewGuid(),
            AssetCode = "ASSET-CTRL-01",
            Name = "Centrifugal Pump Unit 1",
            Category = "Machinery",
            Status = AssetStatus.Active,
            Specifications = "{}",
            CreatedByUserId = _techUserId,
            AssignedToUserId = _techUserId,
            CreatedAt = DateTime.UtcNow
        };
        _db.Assets.Add(asset);
        _db.SaveChanges();
        _assetId = asset.AssetId;
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
    public async Task CreateEvidence_WhenAuthenticatedAndValid_Returns201Created()
    {
        SetUserContext(_techUserId, AppRoles.Technician);

        var request = new CreateEvidenceRequestDto
        {
            AssetId = _assetId,
            ActivityType = ActivityType.Inspection,
            Timestamp = DateTime.UtcNow,
            Latitude = 12.345678m,
            Longitude = 77.123456m,
            Description = "Initial visual inspection passed"
        };

        var actionResult = await _controller.CreateEvidence(request);

        var createdResult = Assert.IsType<ObjectResult>(actionResult);
        Assert.Equal(StatusCodes.Status201Created, createdResult.StatusCode);

        var response = Assert.IsType<ApiResponse<EvidenceDto>>(createdResult.Value);
        Assert.True(response.Success);
        Assert.Equal(_assetId, response.Data!.AssetId);
        Assert.Equal(_techUserId, response.Data.UserId);
        Assert.Equal(AnchorStatus.Pending, response.Data.AnchorStatus);
    }

    [Fact]
    public async Task GetEvidence_ReturnsOkWithPagedResult()
    {
        SetUserContext(_techUserId, AppRoles.Technician);

        await _evidenceService.CreateEvidenceAsync(new CreateEvidenceRequestDto
        {
            AssetId = _assetId,
            ActivityType = ActivityType.Maintenance,
            Timestamp = DateTime.UtcNow,
            Description = "Lubricated bearings"
        }, _techUserId);

        var actionResult = await _controller.GetEvidence(new EvidenceFilterParams());

        var okResult = Assert.IsType<OkObjectResult>(actionResult);
        var response = Assert.IsType<ApiResponse<PagedResult<EvidenceDto>>>(okResult.Value);

        Assert.True(response.Success);
        Assert.Single(response.Data!.Items);
        Assert.Equal(1, response.Data.Total);
    }

    [Fact]
    public async Task GetEvidenceById_WhenExists_Returns200Ok()
    {
        SetUserContext(_techUserId, AppRoles.Technician);

        var created = await _evidenceService.CreateEvidenceAsync(new CreateEvidenceRequestDto
        {
            AssetId = _assetId,
            ActivityType = ActivityType.Inspection,
            Timestamp = DateTime.UtcNow,
            Description = "Detail test"
        }, _techUserId);

        var actionResult = await _controller.GetEvidenceById(created.EvidenceId);

        var okResult = Assert.IsType<OkObjectResult>(actionResult);
        var response = Assert.IsType<ApiResponse<EvidenceDto>>(okResult.Value);

        Assert.True(response.Success);
        Assert.Equal(created.EvidenceId, response.Data!.EvidenceId);
    }

    [Fact]
    public async Task GetEvidenceById_WhenNotFound_Returns404NotFound()
    {
        SetUserContext(_techUserId, AppRoles.Technician);

        var actionResult = await _controller.GetEvidenceById(Guid.NewGuid());

        var notFoundResult = Assert.IsType<NotFoundObjectResult>(actionResult);
        var response = Assert.IsType<ApiResponse<EvidenceDto>>(notFoundResult.Value);

        Assert.False(response.Success);
        Assert.Equal("EVIDENCE_NOT_FOUND", response.Error!.Code);
    }

    [Fact]
    public async Task SubmitEvidence_WhenValid_Returns200OkWithAnchoredProof()
    {
        SetUserContext(_techUserId, AppRoles.Technician);

        var created = await _evidenceService.CreateEvidenceAsync(new CreateEvidenceRequestDto
        {
            AssetId = _assetId,
            ActivityType = ActivityType.Safety,
            Timestamp = DateTime.UtcNow,
            Latitude = 12.345678m,
            Longitude = 77.123456m,
            Description = "Safety seal attached"
        }, _techUserId);

        var actionResult = await _controller.SubmitEvidence(created.EvidenceId);

        var okResult = Assert.IsType<OkObjectResult>(actionResult);
        var response = Assert.IsType<ApiResponse<EvidenceDto>>(okResult.Value);

        Assert.True(response.Success);
        Assert.Equal(AnchorStatus.Anchored, response.Data!.AnchorStatus);
        Assert.NotNull(response.Data.EvidenceHash);
        Assert.Equal(64, response.Data.EvidenceHash.Length);
    }

    [Fact]
    public async Task VerifyEvidence_BothRoutes_ReturnVerifiedStatus()
    {
        SetUserContext(_auditorUserId, AppRoles.Auditor);

        var created = await _evidenceService.CreateEvidenceAsync(new CreateEvidenceRequestDto
        {
            AssetId = _assetId,
            ActivityType = ActivityType.Audit,
            Timestamp = DateTime.UtcNow,
            Description = "Audit evidence verification"
        }, _techUserId);

        await _evidenceService.SubmitEvidenceAsync(created.EvidenceId, _techUserId);

        // Test standard verify route
        var actionResult = await _controller.VerifyEvidence(created.EvidenceId);

        var okResult = Assert.IsType<OkObjectResult>(actionResult);
        var response = Assert.IsType<ApiResponse<EvidenceVerificationResponseDto>>(okResult.Value);

        Assert.True(response.Success);
        Assert.True(response.Data!.IsValid);
        Assert.Equal("VERIFIED", response.Data.Status);
        Assert.NotNull(response.Data.TransactionId);

        // Test verification status get route
        var statusResult = await _controller.GetEvidenceVerification(created.EvidenceId);
        var okStatusResult = Assert.IsType<OkObjectResult>(statusResult);
        var statusResponse = Assert.IsType<ApiResponse<EvidenceVerificationResponseDto>>(okStatusResult.Value);

        Assert.True(statusResponse.Success);
        Assert.True(statusResponse.Data!.IsValid);
        Assert.Equal("VERIFIED", statusResponse.Data.Status);
    }

    [Fact]
    public async Task GetEvidenceByAssetId_ReturnsAssetEvidenceList()
    {
        SetUserContext(_techUserId, AppRoles.Technician);

        await _evidenceService.CreateEvidenceAsync(new CreateEvidenceRequestDto
        {
            AssetId = _assetId,
            ActivityType = ActivityType.Maintenance,
            Timestamp = DateTime.UtcNow,
            Description = "Asset specific record"
        }, _techUserId);

        var actionResult = await _controller.GetEvidenceByAssetId(_assetId);

        var okResult = Assert.IsType<OkObjectResult>(actionResult);
        var response = Assert.IsType<ApiResponse<PagedResult<EvidenceDto>>>(okResult.Value);

        Assert.True(response.Success);
        Assert.Single(response.Data!.Items);
        Assert.Equal(_assetId, response.Data.Items[0].AssetId);
    }

    [Fact]
    public async Task GetEvidenceMedia_WhenMediaAttached_ReturnsMediaList()
    {
        SetUserContext(_techUserId, AppRoles.Technician);

        var created = await _evidenceService.CreateEvidenceAsync(new CreateEvidenceRequestDto
        {
            AssetId = _assetId,
            ActivityType = ActivityType.Inspection,
            Timestamp = DateTime.UtcNow,
            Description = "Inspection with media"
        }, _techUserId);

        await _evidenceService.AttachMediaAsync(
            created.EvidenceId,
            "pump_photo.jpg",
            "image/jpeg",
            "/uploads/2026/09/pump_photo.jpg",
            4096,
            null,
            _techUserId);

        var actionResult = await _controller.GetEvidenceMedia(created.EvidenceId);

        var okResult = Assert.IsType<OkObjectResult>(actionResult);
        var response = Assert.IsType<ApiResponse<IReadOnlyList<EvidenceMediaDto>>>(okResult.Value);

        Assert.True(response.Success);
        Assert.Single(response.Data!);
        Assert.Equal("pump_photo.jpg", response.Data![0].FileName);
    }

    [Fact]
    public async Task UploadEvidenceMedia_WhenValidFile_Returns201Created()
    {
        SetUserContext(_techUserId, AppRoles.Technician);

        var created = await _evidenceService.CreateEvidenceAsync(new CreateEvidenceRequestDto
        {
            AssetId = _assetId,
            ActivityType = ActivityType.Inspection,
            Timestamp = DateTime.UtcNow,
            Description = "Upload test evidence"
        }, _techUserId);

        var fileContent = "Fake image content"u8.ToArray();
        var formFile = new FormFile(new MemoryStream(fileContent), 0, fileContent.Length, "file", "valve_check.png")
        {
            Headers = new HeaderDictionary(),
            ContentType = "image/png"
        };

        var actionResult = await _controller.UploadEvidenceMedia(created.EvidenceId, formFile);

        var createdResult = Assert.IsType<ObjectResult>(actionResult);
        Assert.Equal(StatusCodes.Status201Created, createdResult.StatusCode);

        var response = Assert.IsType<ApiResponse<EvidenceMediaDto>>(createdResult.Value);
        Assert.True(response.Success);
        Assert.Equal("valve_check.png", response.Data!.FileName);
        Assert.Equal(MediaFileType.Image, response.Data.FileType);
        Assert.StartsWith("/uploads/", response.Data.StorageUrl);
    }

    [Fact]
    public async Task UploadEvidenceMedia_WhenEvidenceNotFound_Returns404NotFound()
    {
        SetUserContext(_techUserId, AppRoles.Technician);

        var fileContent = "test"u8.ToArray();
        var formFile = new FormFile(new MemoryStream(fileContent), 0, fileContent.Length, "file", "test.png")
        {
            Headers = new HeaderDictionary(),
            ContentType = "image/png"
        };

        var actionResult = await _controller.UploadEvidenceMedia(Guid.NewGuid(), formFile);

        var notFoundResult = Assert.IsType<NotFoundObjectResult>(actionResult);
        var response = Assert.IsType<ApiResponse<EvidenceMediaDto>>(notFoundResult.Value);

        Assert.False(response.Success);
        Assert.Equal("EVIDENCE_NOT_FOUND", response.Error!.Code);
    }

    [Fact]
    public async Task UploadEvidenceMedia_WhenEvidenceAlreadyAnchored_Returns409Conflict()
    {
        SetUserContext(_techUserId, AppRoles.Technician);

        var created = await _evidenceService.CreateEvidenceAsync(new CreateEvidenceRequestDto
        {
            AssetId = _assetId,
            ActivityType = ActivityType.Inspection,
            Timestamp = DateTime.UtcNow,
            Description = "Anchored upload test"
        }, _techUserId);

        await _evidenceService.SubmitEvidenceAsync(created.EvidenceId, _techUserId);

        var fileContent = "photo data"u8.ToArray();
        var formFile = new FormFile(new MemoryStream(fileContent), 0, fileContent.Length, "file", "late_photo.jpg")
        {
            Headers = new HeaderDictionary(),
            ContentType = "image/jpeg"
        };

        var actionResult = await _controller.UploadEvidenceMedia(created.EvidenceId, formFile);

        var conflictResult = Assert.IsType<ConflictObjectResult>(actionResult);
        var response = Assert.IsType<ApiResponse<EvidenceMediaDto>>(conflictResult.Value);

        Assert.False(response.Success);
        Assert.Equal("CONFLICT", response.Error!.Code);
    }

    [Fact]
    public async Task VerifyEvidence_AliasRoute_ReturnsVerifiedStatus()
    {
        SetUserContext(_auditorUserId, AppRoles.Auditor);

        var created = await _evidenceService.CreateEvidenceAsync(new CreateEvidenceRequestDto
        {
            AssetId = _assetId,
            ActivityType = ActivityType.Safety,
            Timestamp = DateTime.UtcNow,
            Description = "Route alias contract test"
        }, _techUserId);

        await _evidenceService.SubmitEvidenceAsync(created.EvidenceId, _techUserId);

        // Verify that VerifyEvidence handles the verification ID and returns valid structure
        var actionResult = await _controller.VerifyEvidence(created.EvidenceId);

        var okResult = Assert.IsType<OkObjectResult>(actionResult);
        var response = Assert.IsType<ApiResponse<EvidenceVerificationResponseDto>>(okResult.Value);

        Assert.True(response.Success);
        Assert.True(response.Data!.IsValid);
        Assert.Equal("VERIFIED", response.Data.Status);
        Assert.Equal(created.EvidenceId, response.Data.EvidenceId);
        Assert.NotNull(response.Data.CalculatedHash);
        Assert.NotNull(response.Data.TrustedHash);
        Assert.NotNull(response.Data.TransactionId);
    }

    [Fact]
    public async Task VerifyEvidence_WhenNotFound_Returns404NotFound()
    {
        SetUserContext(_auditorUserId, AppRoles.Auditor);

        var nonExistentId = Guid.NewGuid();
        var actionResult = await _controller.VerifyEvidence(nonExistentId);

        var notFoundResult = Assert.IsType<NotFoundObjectResult>(actionResult);
        var response = Assert.IsType<ApiResponse<EvidenceVerificationResponseDto>>(notFoundResult.Value);

        Assert.False(response.Success);
        Assert.Equal("EVIDENCE_NOT_FOUND", response.Error!.Code);
    }

    [Fact]
    public async Task GetEvidenceVerification_WhenNotFound_Returns404NotFound()
    {
        SetUserContext(_auditorUserId, AppRoles.Auditor);

        var nonExistentId = Guid.NewGuid();
        var actionResult = await _controller.GetEvidenceVerification(nonExistentId);

        var notFoundResult = Assert.IsType<NotFoundObjectResult>(actionResult);
        var response = Assert.IsType<ApiResponse<EvidenceVerificationResponseDto>>(notFoundResult.Value);

        Assert.False(response.Success);
        Assert.Equal("EVIDENCE_NOT_FOUND", response.Error!.Code);
    }

    [Fact]
    public async Task GetEvidenceMedia_WhenNotFound_Returns404NotFound()
    {
        SetUserContext(_auditorUserId, AppRoles.Auditor);

        var nonExistentId = Guid.NewGuid();
        var actionResult = await _controller.GetEvidenceMedia(nonExistentId);

        var notFoundResult = Assert.IsType<NotFoundObjectResult>(actionResult);
        var response = Assert.IsType<ApiResponse<IReadOnlyList<EvidenceMediaDto>>>(notFoundResult.Value);

        Assert.False(response.Success);
        Assert.Equal("EVIDENCE_NOT_FOUND", response.Error!.Code);
    }

    [Fact]
    public async Task SubmitEvidence_WhenNotFound_Returns404NotFound()
    {
        SetUserContext(_techUserId, AppRoles.Technician);

        var nonExistentId = Guid.NewGuid();
        var actionResult = await _controller.SubmitEvidence(nonExistentId);

        var notFoundResult = Assert.IsType<NotFoundObjectResult>(actionResult);
        var response = Assert.IsType<ApiResponse<EvidenceDto>>(notFoundResult.Value);

        Assert.False(response.Success);
        Assert.Equal("EVIDENCE_NOT_FOUND", response.Error!.Code);
    }

    public void Dispose() => _db.Dispose();
}
