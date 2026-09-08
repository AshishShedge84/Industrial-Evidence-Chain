using System.Security.Claims;
using System.Text.Json;
using backend.Controllers;
using backend.Data;
using backend.DTOs.Assets;
using backend.DTOs.Auth;
using backend.DTOs.Common;
using backend.DTOs.Evidence;
using backend.Helpers;
using backend.Models;
using backend.Models.Enums;
using backend.Services;
using backend.Services.Interfaces;
using backend.Settings;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace backend.Tests.Auth;

public class RefreshTokenEndpointAndIdentityTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly AuthService _authService;
    private readonly AuthController _authController;
    private readonly AssetService _assetService;
    private readonly EvidenceService _evidenceService;
    private readonly Guid _userId;
    private readonly Guid _assetId;

    public RefreshTokenEndpointAndIdentityTests()
    {
        var dbOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _db = new AppDbContext(dbOptions);

        var jwtOptions = Options.Create(new JwtSettings
        {
            Secret = "TestSecretKeyForUnitTestsMustBe32CharsMin!!",
            Issuer = "TestIssuer",
            Audience = "TestAudience",
            ExpiryMinutes = 60
        });

        _authService = new AuthService(_db, jwtOptions);
        _authController = new AuthController(_authService);

        var auditLogService = new AuditLogService(_db, NullLogger<AuditLogService>.Instance);
        _assetService = new AssetService(_db, auditLogService);

        var hasher = new EvidenceHasher();
        var blockchainAdapter = new MockBlockchainAdapter(NullLogger<MockBlockchainAdapter>.Instance);
        var storagePath = Path.Combine(Path.GetTempPath(), "iec_ref_tests_" + Guid.NewGuid().ToString("N"));
        var storageOptions = Options.Create(new backend.Settings.FileStorageSettings { BasePath = storagePath });
        var storageService = new LocalFileStorageService(storageOptions, NullLogger<LocalFileStorageService>.Instance);

        var services = new ServiceCollection();
        services.AddSingleton<IBlockchainAdapter>(blockchainAdapter);
        var serviceProvider = services.BuildServiceProvider();

        _evidenceService = new EvidenceService(_db, hasher, auditLogService, storageService, serviceProvider);

        _userId = SeedUser();
        _assetId = SeedAsset();
    }

    private Guid SeedUser()
    {
        var role = new Role { RoleId = Guid.NewGuid(), Name = AppRoles.Technician };
        _db.Roles.Add(role);

        var user = new User
        {
            UserId = Guid.NewGuid(),
            Username = "tech_refresh",
            Email = "tech_refresh@example.com",
            FullName = "Tech Refresh",
            PasswordHash = PasswordHasher.Hash("SecurePass123!"),
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

    private Guid SeedAsset()
    {
        var asset = new Asset
        {
            AssetId = Guid.NewGuid(),
            AssetCode = "ASSET-REFRESH-01",
            Name = "Refresh Test Asset",
            Category = "Equipment",
            Status = backend.Models.Enums.AssetStatus.Active,
            CreatedByUserId = _userId,
            AssignedToUserId = _userId,
            CreatedAt = DateTime.UtcNow
        };
        _db.Assets.Add(asset);
        _db.SaveChanges();
        return asset.AssetId;
    }

    // ── AuthController.RefreshToken Endpoint Tests ──────────────────────────

    [Fact]
    public async Task RefreshToken_WithValidToken_Returns200OkWithRotatedTokens()
    {
        var loginResult = await _authService.LoginAsync(new LoginRequestDto
        {
            UsernameOrEmail = "tech_refresh",
            Password = "SecurePass123!"
        });

        var request = new RefreshTokenRequestDto
        {
            RefreshToken = loginResult!.RefreshToken!
        };

        var actionResult = await _authController.RefreshToken(request);

        var okResult = Assert.IsType<OkObjectResult>(actionResult);
        var response = Assert.IsType<ApiResponse<RefreshTokenResponseDto>>(okResult.Value);

        Assert.True(response.Success);
        Assert.NotNull(response.Data);
        Assert.False(string.IsNullOrWhiteSpace(response.Data.AccessToken));
        Assert.False(string.IsNullOrWhiteSpace(response.Data.RefreshToken));
        Assert.NotEqual(request.RefreshToken, response.Data.RefreshToken);
        Assert.Equal("tech_refresh", response.Data.User?.Username);
    }

    [Fact]
    public async Task RefreshToken_WithInvalidToken_Returns401Unauthorized()
    {
        var request = new RefreshTokenRequestDto
        {
            RefreshToken = "non_existent_token_value"
        };

        var actionResult = await _authController.RefreshToken(request);

        var unauthorizedResult = Assert.IsType<UnauthorizedObjectResult>(actionResult);
        var response = Assert.IsType<ApiResponse<RefreshTokenResponseDto>>(unauthorizedResult.Value);

        Assert.False(response.Success);
        Assert.NotNull(response.Error);
        Assert.Equal("UNAUTHORIZED", response.Error.Code);
        Assert.Equal(StatusCodes.Status401Unauthorized, response.Error.StatusCode);
    }

    // ── SEC-06 Identity Extraction Failure Path Tests ───────────────────────

    [Fact]
    public async Task AssetController_CreateAsset_WhenUserClaimMissing_ThrowsUnauthorizedAccessException()
    {
        var assetController = new AssetController(_assetService)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity()) }
            }
        };

        var request = new CreateAssetRequestDto
        {
            AssetTag = "TAG-001",
            Name = "Test Asset",
            Category = "Equipment"
        };

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => assetController.CreateAsset(request));
    }

    [Fact]
    public async Task AssetController_CreateAsset_WhenClaimIsNotValidGuid_ThrowsUnauthorizedAccessException()
    {
        var claims = new[] { new Claim(ClaimTypes.NameIdentifier, "invalid-guid-value") };
        var identity = new ClaimsIdentity(claims, "TestAuth");

        var assetController = new AssetController(_assetService)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
            }
        };

        var request = new CreateAssetRequestDto
        {
            AssetTag = "TAG-001",
            Name = "Test Asset",
            Category = "Equipment"
        };

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => assetController.CreateAsset(request));
    }

    [Fact]
    public async Task EvidenceController_CreateEvidence_WhenUserClaimMissing_ThrowsUnauthorizedAccessException()
    {
        var evidenceController = new EvidenceController(_evidenceService)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity()) }
            }
        };

        var request = new CreateEvidenceRequestDto
        {
            AssetId = _assetId,
            ActivityType = ActivityType.Inspection,
            Description = "Test Evidence"
        };

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => evidenceController.CreateEvidence(request));
    }

    [Fact]
    public async Task EvidenceController_CreateEvidence_WhenClaimIsNotValidGuid_ThrowsUnauthorizedAccessException()
    {
        var claims = new[] { new Claim("sub", "not-a-valid-uuid") };
        var identity = new ClaimsIdentity(claims, "TestAuth");

        var evidenceController = new EvidenceController(_evidenceService)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
            }
        };

        var request = new CreateEvidenceRequestDto
        {
            AssetId = _assetId,
            ActivityType = ActivityType.Inspection,
            Description = "Test Evidence"
        };

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => evidenceController.CreateEvidence(request));
    }

    // ── SEC-07 DTO Compatibility / Serialization Tests ──────────────────────

    [Fact]
    public void LoginRequestDto_DeserializesFromEmailField()
    {
        var json = "{\"email\":\"user@example.com\",\"password\":\"Pass123!\"}";
        var dto = JsonSerializer.Deserialize<LoginRequestDto>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        Assert.NotNull(dto);
        Assert.Equal("user@example.com", dto.UsernameOrEmail);
        Assert.Equal("Pass123!", dto.Password);
    }

    [Fact]
    public void LoginRequestDto_DeserializesFromUsernameOrEmailField()
    {
        var json = "{\"usernameOrEmail\":\"custom_user\",\"password\":\"Pass123!\"}";
        var dto = JsonSerializer.Deserialize<LoginRequestDto>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        Assert.NotNull(dto);
        Assert.Equal("custom_user", dto.UsernameOrEmail);
    }

    [Fact]
    public void RegisterRequestDto_SynthesizesFullNameFromFirstAndLastName()
    {
        var json = "{\"username\":\"alice\",\"email\":\"alice@example.com\",\"password\":\"Secret123!\",\"firstName\":\"Alice\",\"lastName\":\"Smith\"}";
        var dto = JsonSerializer.Deserialize<RegisterRequestDto>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        Assert.NotNull(dto);
        Assert.Equal("Alice Smith", dto.FullName);
    }

    [Fact]
    public void RegisterRequestDto_DeserializesDirectFullName()
    {
        var json = "{\"username\":\"bob\",\"email\":\"bob@example.com\",\"password\":\"Secret123!\",\"fullName\":\"Bob Builder\"}";
        var dto = JsonSerializer.Deserialize<RegisterRequestDto>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        Assert.NotNull(dto);
        Assert.Equal("Bob Builder", dto.FullName);
    }

    public void Dispose() => _db.Dispose();
}
