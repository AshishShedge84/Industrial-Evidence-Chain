using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace backend.DTOs.Auth;

/// <summary>
/// Request body for POST /api/auth/login.
/// Accepts usernameOrEmail, email, or username for flexible frontend compatibility.
/// </summary>
public class LoginRequestDto
{
    private string _usernameOrEmail = string.Empty;

    /// <summary>Accepts either the Username or the Email from the User entity.</summary>
    [Required(ErrorMessage = "Username or email is required.")]
    [JsonPropertyName("usernameOrEmail")]
    public string UsernameOrEmail
    {
        get => _usernameOrEmail;
        set => _usernameOrEmail = value;
    }

    [JsonPropertyName("email")]
    public string? Email
    {
        get => _usernameOrEmail;
        set
        {
            if (!string.IsNullOrWhiteSpace(value) && string.IsNullOrWhiteSpace(_usernameOrEmail))
                _usernameOrEmail = value;
        }
    }

    [JsonPropertyName("username")]
    public string? Username
    {
        get => _usernameOrEmail;
        set
        {
            if (!string.IsNullOrWhiteSpace(value) && string.IsNullOrWhiteSpace(_usernameOrEmail))
                _usernameOrEmail = value;
        }
    }

    [Required(ErrorMessage = "Password is required.")]
    [JsonPropertyName("password")]
    public string Password { get; set; } = string.Empty;
}
