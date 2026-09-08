using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using backend.Data;
using backend.DTOs.Auth;
using backend.Helpers;
using backend.Models;
using backend.Services.Interfaces;
using backend.Settings;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace backend.Services;

/// <summary>
/// Implements JWT-based authentication against the PostgreSQL user store.
/// Password verification uses PBKDF2-SHA256 via PasswordHasher.
/// Refresh tokens use cryptographically random byte arrays stored as SHA-256 hashes with rotation.
/// </summary>
public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly JwtSettings _jwt;
    private const int RefreshTokenLifetimeDays = 7;

    public AuthService(AppDbContext db, IOptions<JwtSettings> jwtOptions)
    {
        _db = db;
        _jwt = jwtOptions.Value;
    }

    public async Task<LoginResponseDto?> LoginAsync(LoginRequestDto request)
    {
        var input = request.UsernameOrEmail.Trim();

        // Load user with roles in one query; match username OR email
        var user = await _db.Users
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .Where(u => u.IsActive &&
                       (u.Username == input || u.Email == input))
            .SingleOrDefaultAsync();

        if (user is null)
            return null;

        if (!PasswordHasher.Verify(request.Password, user.PasswordHash))
            return null;

        var roles = user.UserRoles
            .Select(ur => ur.Role.Name)
            .ToList();

        var primaryRole = roles.FirstOrDefault() ?? AppRoles.Technician;
        var (token, expiresAt) = BuildJwt(user.UserId, user.Username, user.Email, user.FullName, roles);
        var expiresInSeconds = (int)Math.Max(0, (expiresAt - DateTime.UtcNow).TotalSeconds);

        // Generate and persist refresh token
        var rawRefreshToken = GenerateSecureToken();
        var tokenHash = HashToken(rawRefreshToken);

        var refreshTokenEntity = new RefreshToken
        {
            TokenId = Guid.NewGuid(),
            UserId = user.UserId,
            TokenHash = tokenHash,
            ExpiresAt = DateTime.UtcNow.AddDays(RefreshTokenLifetimeDays),
            CreatedAt = DateTime.UtcNow
        };

        _db.RefreshTokens.Add(refreshTokenEntity);
        await _db.SaveChangesAsync();

        return new LoginResponseDto
        {
            AccessToken = token,
            RefreshToken = rawRefreshToken,
            ExpiresIn = expiresInSeconds,
            User = new AuthUserDto
            {
                Id = user.UserId,
                Username = user.Username,
                Email = user.Email,
                FullName = user.FullName,
                Role = primaryRole,
                Status = user.IsActive ? "active" : "pending"
            }
        };
    }

    public async Task<RegisterResponseDto> RegisterAsync(RegisterRequestDto request)
    {
        var username = request.Username.Trim();
        var email = request.Email.Trim().ToLowerInvariant();

        // 1. Check uniqueness of Username and Email
        var usernameExists = await _db.Users.AnyAsync(u => u.Username.ToLower() == username.ToLower());
        if (usernameExists)
            throw new InvalidOperationException("Username is already taken.");

        var emailExists = await _db.Users.AnyAsync(u => u.Email.ToLower() == email);
        if (emailExists)
            throw new InvalidOperationException("Email is already registered.");

        // 2. Assign default standard role (Technician). Public users cannot self-assign any other role.
        var targetRole = AppRoles.Technician;

        // 3. Find Role entity in DB, or create if not present
        var role = await _db.Roles.SingleOrDefaultAsync(r => r.Name.ToLower() == targetRole.ToLower());
        if (role is null)
        {
            role = new Role
            {
                RoleId = Guid.NewGuid(),
                Name = targetRole,
                Description = $"{targetRole} role"
            };
            _db.Roles.Add(role);
        }

        // 4. Create user in Pending / inactive state (IsActive = false)
        var user = new User
        {
            UserId = Guid.NewGuid(),
            Username = username,
            Email = email,
            FullName = request.FullName.Trim(),
            PasswordHash = PasswordHasher.Hash(request.Password),
            IsActive = false, // Pending admin approval
            CreatedAt = DateTime.UtcNow
        };

        var userRole = new UserRole
        {
            UserRoleId = Guid.NewGuid(),
            UserId = user.UserId,
            RoleId = role.RoleId,
            AssignedAt = DateTime.UtcNow,
            User = user,
            Role = role
        };

        _db.Users.Add(user);
        _db.UserRoles.Add(userRole);

        await _db.SaveChangesAsync();

        return new RegisterResponseDto
        {
            UserId = user.UserId,
            Username = user.Username,
            Email = user.Email,
            FullName = user.FullName,
            Roles = new[] { role.Name },
            IsActive = user.IsActive,
            Message = "Registration successful. Your account is pending administrator approval before you can log in.",
            CreatedAt = user.CreatedAt
        };
    }

    public async Task<AuthUserDto?> GetCurrentUserAsync(Guid userId)
    {
        var user = await _db.Users
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .SingleOrDefaultAsync(u => u.UserId == userId);

        if (user is null)
            return null;

        var roles = user.UserRoles
            .Select(ur => ur.Role.Name)
            .ToList();

        var primaryRole = roles.FirstOrDefault() ?? AppRoles.Technician;

        return new AuthUserDto
        {
            Id = user.UserId,
            Username = user.Username,
            Email = user.Email,
            FullName = user.FullName,
            Role = primaryRole,
            Status = user.IsActive ? "active" : "pending"
        };
    }

    public async Task<RefreshTokenResponseDto?> RefreshTokenAsync(string refreshToken)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
            return null;

        var tokenHash = HashToken(refreshToken.Trim());

        var existingToken = await _db.RefreshTokens
            .Include(t => t.User)
                .ThenInclude(u => u.UserRoles)
                    .ThenInclude(ur => ur.Role)
            .SingleOrDefaultAsync(t => t.TokenHash == tokenHash);

        if (existingToken is null)
            return null;

        // If a revoked token is used, suspect a compromised token / replay attack:
        // Revoke all remaining active tokens for this user as a safeguard
        if (existingToken.RevokedAt != null)
        {
            var activeTokens = await _db.RefreshTokens
                .Where(t => t.UserId == existingToken.UserId && t.RevokedAt == null)
                .ToListAsync();

            foreach (var t in activeTokens)
                t.RevokedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            throw new UnauthorizedAccessException("Refresh token has already been revoked. Possible token reuse detected.");
        }

        if (DateTime.UtcNow >= existingToken.ExpiresAt)
            throw new UnauthorizedAccessException("Refresh token has expired.");

        if (existingToken.User is null || !existingToken.User.IsActive)
            throw new UnauthorizedAccessException("User account is inactive or not found.");

        // Rotate token: revoke current token and link to replacement
        var newRawRefreshToken = GenerateSecureToken();
        var newTokenHash = HashToken(newRawRefreshToken);

        existingToken.RevokedAt = DateTime.UtcNow;
        existingToken.ReplacedByTokenHash = newTokenHash;

        var newRefreshTokenEntity = new RefreshToken
        {
            TokenId = Guid.NewGuid(),
            UserId = existingToken.UserId,
            TokenHash = newTokenHash,
            ExpiresAt = DateTime.UtcNow.AddDays(RefreshTokenLifetimeDays),
            CreatedAt = DateTime.UtcNow
        };

        _db.RefreshTokens.Add(newRefreshTokenEntity);
        await _db.SaveChangesAsync();

        var roles = existingToken.User.UserRoles
            .Select(ur => ur.Role.Name)
            .ToList();

        var primaryRole = roles.FirstOrDefault() ?? AppRoles.Technician;
        var (jwtToken, expiresAt) = BuildJwt(
            existingToken.User.UserId,
            existingToken.User.Username,
            existingToken.User.Email,
            existingToken.User.FullName,
            roles);

        var expiresInSeconds = (int)Math.Max(0, (expiresAt - DateTime.UtcNow).TotalSeconds);

        return new RefreshTokenResponseDto
        {
            AccessToken = jwtToken,
            RefreshToken = newRawRefreshToken,
            ExpiresIn = expiresInSeconds,
            User = new AuthUserDto
            {
                Id = existingToken.User.UserId,
                Username = existingToken.User.Username,
                Email = existingToken.User.Email,
                FullName = existingToken.User.FullName,
                Role = primaryRole,
                Status = existingToken.User.IsActive ? "active" : "pending"
            }
        };
    }

    private static string GenerateSecureToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        return Convert.ToBase64String(bytes)
            .Replace("+", "-")
            .Replace("/", "_")
            .TrimEnd('=');
    }

    private static string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    // ── JWT generation ────────────────────────────────────────────────────────

    private (string Token, DateTime ExpiresAt) BuildJwt(
        Guid userId, string username, string email, string fullName, IList<string> roles)
    {
        var key         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.Secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expiresAt   = DateTime.UtcNow.AddMinutes(_jwt.ExpiryMinutes);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub,        userId.ToString()),
            new(JwtRegisteredClaimNames.UniqueName, username),
            new(JwtRegisteredClaimNames.Email,      email),
            new(JwtRegisteredClaimNames.GivenName,  fullName),
            new(JwtRegisteredClaimNames.Jti,        Guid.NewGuid().ToString()),
        };

        // Add role claims — used later by RBAC policies
        foreach (var role in roles)
            claims.Add(new Claim(ClaimTypes.Role, role));

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject            = new ClaimsIdentity(claims),
            Expires            = expiresAt,
            Issuer             = _jwt.Issuer,
            Audience           = _jwt.Audience,
            SigningCredentials = credentials
        };

        var handler = new JwtSecurityTokenHandler();
        var token   = handler.CreateToken(tokenDescriptor);
        return (handler.WriteToken(token), expiresAt);
    }
}
