using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace backend.DTOs.Auth;

/// <summary>
/// Request body for POST /api/auth/register.
/// Accepts fullName or firstName + lastName for flexible frontend compatibility.
/// </summary>
public class RegisterRequestDto
{
    private string? _fullName;

    [Required(ErrorMessage = "Username is required.")]
    [StringLength(50, MinimumLength = 3)]
    [JsonPropertyName("username")]
    public string Username { get; set; } = string.Empty;

    [Required(ErrorMessage = "Email is required.")]
    [EmailAddress]
    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Password is required.")]
    [StringLength(100, MinimumLength = 6)]
    [JsonPropertyName("password")]
    public string Password { get; set; } = string.Empty;

    [Required(ErrorMessage = "Full name is required.")]
    [StringLength(100, MinimumLength = 1)]
    [JsonPropertyName("fullName")]
    public string FullName
    {
        get
        {
            if (!string.IsNullOrWhiteSpace(_fullName))
                return _fullName;

            return $"{FirstName} {LastName}".Trim();
        }
        set => _fullName = value;
    }

    [JsonPropertyName("firstName")]
    public string? FirstName { get; set; }

    [JsonPropertyName("lastName")]
    public string? LastName { get; set; }
}
