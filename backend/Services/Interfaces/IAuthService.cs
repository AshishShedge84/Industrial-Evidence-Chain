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
}
