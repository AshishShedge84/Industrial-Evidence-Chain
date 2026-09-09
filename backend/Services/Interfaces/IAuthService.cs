using backend.DTOs.Auth;

namespace backend.Services.Interfaces;

/// <summary>Authentication service contract.</summary>
public interface IAuthService
{
    /// <summary>
    /// Authenticates a user by username/email + password.
    /// Returns LoginResponseDto with JWT on success; null on failure.
    /// </summary>
    Task<LoginResponseDto?> LoginAsync(LoginRequestDto request);

    /// <summary>
    /// Registers a new user. User is created in pending (IsActive = false) state.
    /// Returns the created user DTO, or throws/returns error when validation fails.
    /// </summary>
    Task<RegisterResponseDto> RegisterAsync(RegisterRequestDto request);

    /// <summary>
    /// Retrieves current user profile by userId.
    /// Returns AuthUserDto on success; null if user is not found.
    /// </summary>
    Task<AuthUserDto?> GetCurrentUserAsync(Guid userId);

    /// <summary>
    /// Validates and rotates a refresh token, issuing a new JWT access token and new refresh token.
    /// Detects replay attacks if a revoked token is used, invalidating all associated tokens.
    /// </summary>
    Task<RefreshTokenResponseDto?> RefreshTokenAsync(string refreshToken);

    /// <summary>
    /// Updates the authenticated user's profile and persists changes to PostgreSQL.
    /// Returns updated AuthUserDto on success.
    /// </summary>
    Task<AuthUserDto> UpdateProfileAsync(Guid userId, UpdateProfileRequestDto request, string? ipAddress = null, CancellationToken cancellationToken = default);
}
