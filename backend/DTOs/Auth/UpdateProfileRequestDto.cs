namespace backend.DTOs.Auth;

/// <summary>
/// Request payload for updating the authenticated user's profile.
/// </summary>
public class UpdateProfileRequestDto
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? FullName { get; set; }
    public string? Email { get; set; }
    public string? ContactNumber { get; set; }
    public string? Bio { get; set; }
    public string? AvatarUrl { get; set; }
    public string? AvatarType { get; set; }
    public string? SelectedMemoji { get; set; }
}
