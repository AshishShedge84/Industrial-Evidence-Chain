using System.Security.Claims;
using backend.Controllers;
using backend.Data;
using backend.DTOs.Auth;
using backend.DTOs.Common;
using backend.Helpers;
using backend.Models;
using backend.Services;
using backend.Settings;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace backend.Tests.Auth;

public class AuthControllerMeEndpointTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly AuthService _authService;
    private readonly AuthController _controller;
    private readonly Guid _userId;

    public AuthControllerMeEndpointTests()
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
        _controller = new AuthController(_authService);

        _userId = SeedUser();
    }

    private Guid SeedUser()
    {
        var role = new Role { RoleId = Guid.NewGuid(), Name = AppRoles.Technician };
        _db.Roles.Add(role);

        var user = new User
        {
            UserId = Guid.NewGuid(),
            Username = "technician1",
            Email = "tech1@example.com",
            FullName = "Technician One",
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

    private void SetControllerUser(ClaimsPrincipal principal)
    {
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = principal }
        };
    }

    [Fact]
    public async Task GetCurrentUser_WhenAuthenticatedWithNameIdentifierClaim_ReturnsOkWithAuthUserDto()
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, _userId.ToString()),
            new Claim(ClaimTypes.Role, AppRoles.Technician)
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        SetControllerUser(new ClaimsPrincipal(identity));

        var actionResult = await _controller.GetCurrentUser();

        var okResult = Assert.IsType<OkObjectResult>(actionResult);
        var response = Assert.IsType<ApiResponse<AuthUserDto>>(okResult.Value);

        Assert.True(response.Success);
        Assert.NotNull(response.Data);
        Assert.Equal(_userId, response.Data.Id);
        Assert.Equal("tech1@example.com", response.Data.Email);
        Assert.Equal("technician1", response.Data.Username);
        Assert.Equal("Technician One", response.Data.FullName);
        Assert.Equal(AppRoles.Technician, response.Data.Role);
        Assert.Equal("active", response.Data.Status);
        Assert.Null(response.Error);
    }

    [Fact]
    public async Task GetCurrentUser_WhenAuthenticatedWithJwtSubClaim_ReturnsOkWithAuthUserDto()
    {
        var claims = new[]
        {
            new Claim("sub", _userId.ToString()),
            new Claim(ClaimTypes.Role, AppRoles.Technician)
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        SetControllerUser(new ClaimsPrincipal(identity));

        var actionResult = await _controller.GetCurrentUser();

        var okResult = Assert.IsType<OkObjectResult>(actionResult);
        var response = Assert.IsType<ApiResponse<AuthUserDto>>(okResult.Value);

        Assert.True(response.Success);
        Assert.Equal(_userId, response.Data!.Id);
        Assert.Equal(AppRoles.Technician, response.Data.Role);
    }

    [Fact]
    public async Task GetCurrentUser_WhenUnauthenticatedOrEmptyIdentity_Returns401Unauthorized()
    {
        SetControllerUser(new ClaimsPrincipal(new ClaimsIdentity()));

        var actionResult = await _controller.GetCurrentUser();

        var unauthorizedResult = Assert.IsType<UnauthorizedObjectResult>(actionResult);
        var response = Assert.IsType<ApiResponse<AuthUserDto>>(unauthorizedResult.Value);

        Assert.False(response.Success);
        Assert.NotNull(response.Error);
        Assert.Equal("UNAUTHORIZED", response.Error.Code);
        Assert.Equal(StatusCodes.Status401Unauthorized, response.Error.StatusCode);
    }

    [Fact]
    public async Task GetCurrentUser_WhenClaimIsNotValidGuid_Returns401Unauthorized()
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "invalid-not-a-guid")
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        SetControllerUser(new ClaimsPrincipal(identity));

        var actionResult = await _controller.GetCurrentUser();

        var unauthorizedResult = Assert.IsType<UnauthorizedObjectResult>(actionResult);
        var response = Assert.IsType<ApiResponse<AuthUserDto>>(unauthorizedResult.Value);

        Assert.False(response.Success);
        Assert.NotNull(response.Error);
        Assert.Equal("UNAUTHORIZED", response.Error.Code);
    }

    [Fact]
    public async Task GetCurrentUser_WhenUserNotFoundInDatabase_Returns404NotFound()
    {
        var nonExistentId = Guid.NewGuid();
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, nonExistentId.ToString())
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        SetControllerUser(new ClaimsPrincipal(identity));

        var actionResult = await _controller.GetCurrentUser();

        var notFoundResult = Assert.IsType<NotFoundObjectResult>(actionResult);
        var response = Assert.IsType<ApiResponse<AuthUserDto>>(notFoundResult.Value);

        Assert.False(response.Success);
        Assert.NotNull(response.Error);
        Assert.Equal("NOT_FOUND", response.Error.Code);
        Assert.Equal(StatusCodes.Status404NotFound, response.Error.StatusCode);
    }

    public void Dispose() => _db.Dispose();
}
