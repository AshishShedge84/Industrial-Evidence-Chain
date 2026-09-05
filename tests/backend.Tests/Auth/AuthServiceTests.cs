using System.IdentityModel.Tokens.Jwt;
using System.Text;
using backend.Data;
using backend.DTOs.Auth;
using backend.Helpers;
using backend.Models;
using backend.Services;
using backend.Settings;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace backend.Tests.Auth;

public class AuthServiceTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly AuthService _sut;

    private const string TestSecret = "TestSecretKeyForUnitTestsMustBe32CharsMin!!";
    private const string TestIssuer = "TestIssuer";
    private const string TestAudience = "TestAudience";

    public AuthServiceTests()
    {
        var dbOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _db = new AppDbContext(dbOptions);

        var jwtOptions = Options.Create(new JwtSettings
        {
            Secret        = TestSecret,
            Issuer        = TestIssuer,
            Audience      = TestAudience,
            ExpiryMinutes = 60
        });

        _sut = new AuthService(_db, jwtOptions);

        SeedTestUser();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void SeedTestUser()
    {
        var role = new Role { RoleId = Guid.NewGuid(), Name = "Technician" };
        _db.Roles.Add(role);

        var user = new User
        {
            UserId       = Guid.NewGuid(),
            Username     = "testuser",
            Email        = "test@example.com",
            FullName     = "Test User",
            PasswordHash = PasswordHasher.Hash("ValidPass123!"),
            IsActive     = true,
            CreatedAt    = DateTime.UtcNow
        };
        _db.Users.Add(user);

        _db.UserRoles.Add(new UserRole
        {
            UserRoleId = Guid.NewGuid(),
            UserId     = user.UserId,
            RoleId     = role.RoleId,
            AssignedAt = DateTime.UtcNow
        });

        _db.SaveChanges();
    }

    // ── Login: success ────────────────────────────────────────────────────────

    [Fact]
    public async Task Login_WithValidUsername_ReturnsToken()
    {
        var result = await _sut.LoginAsync(new LoginRequestDto
        {
            UsernameOrEmail = "testuser",
            Password        = "ValidPass123!"
        });

        Assert.NotNull(result);
        Assert.False(string.IsNullOrWhiteSpace(result.AccessToken));
    }

    [Fact]
    public async Task Login_WithValidEmail_ReturnsToken()
    {
        var result = await _sut.LoginAsync(new LoginRequestDto
        {
            UsernameOrEmail = "test@example.com",
            Password        = "ValidPass123!"
        });

        Assert.NotNull(result);
        Assert.False(string.IsNullOrWhiteSpace(result.AccessToken));
    }

    [Fact]
    public async Task Login_ResponseContainsExpectedFields()
    {
        var result = await _sut.LoginAsync(new LoginRequestDto
        {
            UsernameOrEmail = "testuser",
            Password        = "ValidPass123!"
        });

        Assert.NotNull(result);
        Assert.NotNull(result.User);
        Assert.Equal("testuser", result.User.Username);
        Assert.Equal("test@example.com", result.User.Email);
        Assert.Equal("Test User", result.User.FullName);
        Assert.Equal("Technician", result.User.Role);
        Assert.Equal("active", result.User.Status);
        Assert.True(result.ExpiresIn > 0);
        Assert.Null(result.RefreshToken);
    }

    // ── Login: failures ───────────────────────────────────────────────────────

    [Fact]
    public async Task Login_WithUnknownUsername_ReturnsNull()
    {
        var result = await _sut.LoginAsync(new LoginRequestDto
        {
            UsernameOrEmail = "nobody",
            Password        = "ValidPass123!"
        });

        Assert.Null(result);
    }

    [Fact]
    public async Task Login_WithWrongPassword_ReturnsNull()
    {
        var result = await _sut.LoginAsync(new LoginRequestDto
        {
            UsernameOrEmail = "testuser",
            Password        = "WrongPassword!"
        });

        Assert.Null(result);
    }

    [Fact]
    public async Task Login_InactiveUser_ReturnsNull()
    {
        // Add inactive user
        _db.Users.Add(new User
        {
            UserId       = Guid.NewGuid(),
            Username     = "inactive",
            Email        = "inactive@example.com",
            FullName     = "Inactive User",
            PasswordHash = PasswordHasher.Hash("ValidPass123!"),
            IsActive     = false,
            CreatedAt    = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();

        var result = await _sut.LoginAsync(new LoginRequestDto
        {
            UsernameOrEmail = "inactive",
            Password        = "ValidPass123!"
        });

        Assert.Null(result);
    }

    // ── JWT validation ────────────────────────────────────────────────────────

    [Fact]
    public async Task Login_GeneratedToken_IsValidJwt()
    {
        var result = await _sut.LoginAsync(new LoginRequestDto
        {
            UsernameOrEmail = "testuser",
            Password        = "ValidPass123!"
        });

        Assert.NotNull(result);

        var handler = new JwtSecurityTokenHandler();
        var key     = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(TestSecret));

        var principal = handler.ValidateToken(result.AccessToken, new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = TestIssuer,
            ValidAudience            = TestAudience,
            IssuerSigningKey         = key,
            ClockSkew                = TimeSpan.Zero
        }, out _);

        Assert.NotNull(principal);
    }

    [Fact]
    public async Task Login_GeneratedToken_ContainsSubClaim()
    {
        var result = await _sut.LoginAsync(new LoginRequestDto
        {
            UsernameOrEmail = "testuser",
            Password        = "ValidPass123!"
        });

        Assert.NotNull(result);

        var handler = new JwtSecurityTokenHandler();
        var jwt     = handler.ReadJwtToken(result.AccessToken);

        Assert.NotNull(jwt.Subject);
        Assert.True(Guid.TryParse(jwt.Subject, out _), "sub claim must be a valid UUID");
    }

    [Fact]
    public async Task Login_GeneratedToken_ContainsRoleClaim()
    {
        var result = await _sut.LoginAsync(new LoginRequestDto
        {
            UsernameOrEmail = "testuser",
            Password        = "ValidPass123!"
        });

        Assert.NotNull(result);

        var handler = new JwtSecurityTokenHandler();
        var jwt     = handler.ReadJwtToken(result.AccessToken);

        var roleClaims = jwt.Claims
            .Where(c => c.Type == "role" || c.Type.EndsWith("/role"))
            .Select(c => c.Value)
            .ToList();

        Assert.Contains("Technician", roleClaims);
    }

    public void Dispose() => _db.Dispose();
}
