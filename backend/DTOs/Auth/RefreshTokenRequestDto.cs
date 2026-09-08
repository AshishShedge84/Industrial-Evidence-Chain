using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace backend.DTOs.Auth;

/// <summary>
/// Request payload for POST /api/auth/refresh.
/// </summary>
public class RefreshTokenRequestDto
{
    [Required(ErrorMessage = "Refresh token is required.")]
    [JsonPropertyName("refreshToken")]
    public string RefreshToken { get; set; } = string.Empty;
}
