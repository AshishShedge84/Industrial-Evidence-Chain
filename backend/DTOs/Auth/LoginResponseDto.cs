namespace backend.DTOs.Auth;

/// <summary>
/// User identity representation returned within the Login response data.
/// </summary>
public class AuthUserDto
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string FirstName => FullName.Contains(' ') ? FullName.Split(' ')[0] : (!string.IsNullOrWhiteSpace(FullName) ? FullName : Username);
    public string LastName => FullName.Contains(' ') ? string.Join(' ', FullName.Split(' ').Skip(1)) : string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Status { get; set; } = "active";
}

/// <summary>
/// Response payload for a successful POST /api/auth/login.
/// Aligns with the confirmed Member 3 frontend contract.
/// </summary>
public class LoginResponseDto
{
    public AuthUserDto User { get; set; } = new();
    public string AccessToken { get; set; } = string.Empty;
    public string? RefreshToken { get; set; }
    public int ExpiresIn { get; set; }
}
