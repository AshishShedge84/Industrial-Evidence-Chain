namespace backend.Models;

/// <summary>
/// Constant role names supported across the Industrial Evidence Chain platform.
/// Used for strongly-typed role-based authorization attributes and policies.
/// </summary>
public static class AppRoles
{
    public const string Technician = "Technician";
    public const string Manager = "Manager";
    public const string Auditor = "Auditor";
    public const string Admin = "Admin";
}
