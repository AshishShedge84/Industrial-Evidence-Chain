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
        Assert.NotNull(result.RefreshToken);
        Assert.NotEmpty(result.RefreshToken);
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

    // ── GetCurrentUserAsync ───────────────────────────────────────────────────

    [Fact]
    public async Task GetCurrentUser_WithExistingUserId_ReturnsAuthUserDto()
    {
        var existingUser = await _db.Users.FirstAsync(u => u.Username == "testuser");

        var result = await _sut.GetCurrentUserAsync(existingUser.UserId);

        Assert.NotNull(result);
        Assert.Equal(existingUser.UserId, result.Id);
        Assert.Equal("testuser", result.Username);
        Assert.Equal("test@example.com", result.Email);
        Assert.Equal("Test User", result.FullName);
        Assert.Equal("Technician", result.Role);
        Assert.Equal("active", result.Status);
    }

    [Fact]
    public async Task GetCurrentUser_WithPendingInactiveUser_ReturnsPendingStatus()
    {
        var pendingUser = new User
        {
            UserId       = Guid.NewGuid(),
            Username     = "pendingtech",
            Email        = "pending@example.com",
            FullName     = "Pending Tech",
            PasswordHash = PasswordHasher.Hash("ValidPass123!"),
            IsActive     = false,
            CreatedAt    = DateTime.UtcNow
        };
        _db.Users.Add(pendingUser);
        var role = await _db.Roles.FirstAsync(r => r.Name == "Technician");
        _db.UserRoles.Add(new UserRole
        {
            UserRoleId = Guid.NewGuid(),
            UserId     = pendingUser.UserId,
            RoleId     = role.RoleId,
            AssignedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();

        var result = await _sut.GetCurrentUserAsync(pendingUser.UserId);

        Assert.NotNull(result);
        Assert.Equal(pendingUser.UserId, result.Id);
        Assert.Equal("pendingtech", result.Username);
        Assert.Equal("pending", result.Status);
        Assert.Equal("Technician", result.Role);
    }

    [Fact]
    public async Task GetCurrentUser_WithNonExistentUserId_ReturnsNull()
    {
        var result = await _sut.GetCurrentUserAsync(Guid.NewGuid());

        Assert.Null(result);
    }

    // ── Refresh Token Rotation ────────────────────────────────────────────────

    [Fact]
    public async Task Login_PersistsHashedRefreshTokenInDatabase()
    {
        var result = await _sut.LoginAsync(new LoginRequestDto
        {
            UsernameOrEmail = "testuser",
            Password = "ValidPass123!"
        });

        Assert.NotNull(result);
        Assert.NotNull(result.RefreshToken);

        var user = await _db.Users.FirstAsync(u => u.Username == "testuser");
        var savedTokens = await _db.RefreshTokens.Where(t => t.UserId == user.UserId).ToListAsync();

        Assert.Single(savedTokens);
        Assert.NotEqual(result.RefreshToken, savedTokens[0].TokenHash); // Token is hashed in DB, never plaintext
        Assert.True(savedTokens[0].IsActive);
    }

    [Fact]
    public async Task RefreshToken_WithValidToken_RotatesTokenSuccessfully()
    {
        var loginResult = await _sut.LoginAsync(new LoginRequestDto
        {
            UsernameOrEmail = "testuser",
            Password = "ValidPass123!"
        });

        var originalRefreshToken = loginResult!.RefreshToken!;

        var refreshResult = await _sut.RefreshTokenAsync(originalRefreshToken);

        Assert.NotNull(refreshResult);
        Assert.False(string.IsNullOrWhiteSpace(refreshResult.AccessToken));
        Assert.NotNull(refreshResult.RefreshToken);
        Assert.NotEqual(originalRefreshToken, refreshResult.RefreshToken);
        Assert.Equal("testuser", refreshResult.User!.Username);

        // Verify old token is marked revoked and links to new token
        var tokens = await _db.RefreshTokens.OrderBy(t => t.CreatedAt).ToListAsync();
        Assert.Equal(2, tokens.Count);

        var oldToken = tokens[0];
        var newToken = tokens[1];

        Assert.NotNull(oldToken.RevokedAt);
        Assert.Equal(newToken.TokenHash, oldToken.ReplacedByTokenHash);
        Assert.False(oldToken.IsActive);
        Assert.True(newToken.IsActive);
    }

    [Fact]
    public async Task RefreshToken_WithExpiredToken_ThrowsUnauthorizedAccessException()
    {
        var user = await _db.Users.FirstAsync(u => u.Username == "testuser");
        var rawToken = "expired_raw_token_value_sample";
        var hash = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(rawToken))).ToLowerInvariant();

        _db.RefreshTokens.Add(new RefreshToken
        {
            TokenId = Guid.NewGuid(),
            UserId = user.UserId,
            TokenHash = hash,
            ExpiresAt = DateTime.UtcNow.AddMinutes(-5), // Expired
            CreatedAt = DateTime.UtcNow.AddDays(-8)
        });
        await _db.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<UnauthorizedAccessException>(() => _sut.RefreshTokenAsync(rawToken));
        Assert.Contains("expired", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task RefreshToken_WithRevokedToken_ReplayAttackRevokesAllUserTokensAndThrows()
    {
        var loginResult = await _sut.LoginAsync(new LoginRequestDto
        {
            UsernameOrEmail = "testuser",
            Password = "ValidPass123!"
        });

        var firstToken = loginResult!.RefreshToken!;

        // Rotate once: firstToken is now revoked, secondToken is active
        var rotateResult = await _sut.RefreshTokenAsync(firstToken);
        var secondToken = rotateResult!.RefreshToken!;

        // Adversary re-submits the already-revoked firstToken
        var ex = await Assert.ThrowsAsync<UnauthorizedAccessException>(() => _sut.RefreshTokenAsync(firstToken));
        Assert.Contains("revoked", ex.Message, StringComparison.OrdinalIgnoreCase);

        // Verify that secondToken is now ALSO revoked as a security measure
        var user = await _db.Users.FirstAsync(u => u.Username == "testuser");
        var activeTokens = await _db.RefreshTokens
            .Where(t => t.UserId == user.UserId && t.RevokedAt == null)
            .ToListAsync();

        Assert.Empty(activeTokens);
    }

    [Fact]
    public async Task RefreshToken_WithNonExistentToken_ReturnsNull()
    {
        var result = await _sut.RefreshTokenAsync("completely_random_unknown_token");
        Assert.Null(result);
    }

    [Fact]
    public async Task RefreshToken_WithInactiveUser_ThrowsUnauthorizedAccessException()
    {
        var user = await _db.Users.FirstAsync(u => u.Username == "testuser");
        var loginResult = await _sut.LoginAsync(new LoginRequestDto
        {
            UsernameOrEmail = "testuser",
            Password = "ValidPass123!"
        });

        // Deactivate user
        user.IsActive = false;
        await _db.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<UnauthorizedAccessException>(() => _sut.RefreshTokenAsync(loginResult!.RefreshToken!));
        Assert.Contains("inactive", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    public void Dispose() => _db.Dispose();
}
