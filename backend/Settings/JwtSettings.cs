namespace backend.Settings;

/// <summary>
/// Strongly-typed JWT configuration bound from appsettings "JwtSettings" section.
/// Never populate Secret from source control — use environment variables or user-secrets.
/// </summary>
public class JwtSettings
{
    public const string SectionName = "JwtSettings";

    public string Secret { get; set; } = string.Empty;
    public string Issuer { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;
    public int ExpiryMinutes { get; set; } = 60;
}
