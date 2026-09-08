namespace backend.Models;

/// <summary>
/// Junction table assigning roles to users.
/// Maps to PostgreSQL table: user_roles
/// </summary>
public class UserRole
{
    public Guid UserRoleId { get; set; }
    public Guid UserId { get; set; }
    public Guid RoleId { get; set; }
    public DateTime AssignedAt { get; set; }

    // Navigation properties
    public User User { get; set; } = null!;
    public Role Role { get; set; } = null!;
}
