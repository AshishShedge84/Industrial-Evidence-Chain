namespace backend.Models;

/// <summary>
/// Application role (Technician, Manager, Auditor, Admin).
/// Maps to PostgreSQL table: roles
/// </summary>
public class Role
{
    public Guid RoleId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    // Navigation properties
    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
}
