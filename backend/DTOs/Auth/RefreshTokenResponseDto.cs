using System.Text.Json.Serialization;

namespace backend.DTOs.Auth;

/// <summary>
/// Response payload for successful POST /api/auth/refresh.
/// Matches the structure expected by frontend apiClient.ts and state handlers.
/// </summary>
public class RefreshTokenResponseDto
{
    [JsonPropertyName("accessToken")]
    public string AccessToken { get; set; } = string.Empty;

    [JsonPropertyName("refreshToken")]
    public string RefreshToken { get; set; } = string.Empty;

    [JsonPropertyName("expiresIn")]
    public int ExpiresIn { get; set; }

    [JsonPropertyName("user")]
    public AuthUserDto? User { get; set; }
}
