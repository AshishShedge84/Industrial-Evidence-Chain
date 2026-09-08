namespace backend.DTOs.Admin;

/// <summary>User details DTO returned by admin endpoints.</summary>
public class UserDto
{
    public Guid UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public IEnumerable<string> Roles { get; set; } = Enumerable.Empty<string>();
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
