using backend.Exceptions;

namespace backend.DTOs.Admin;

/// <summary>
/// Request body for PATCH /api/admin/users/{id}/status.
/// Supports both explicit status string ("active", "pending", "suspended", "rejected")
/// and backward-compatible IsActive boolean.
/// </summary>
public class UpdateUserStatusDto
{
    /// <summary>
    /// Status string: "active" | "pending" | "suspended" | "rejected".
    /// </summary>
    public string? Status { get; set; }

    /// <summary>
    /// Optional backward-compatible boolean property.
    /// </summary>
    public bool? IsActive { get; set; }

    /// <summary>
    /// Resolves target active status securely based on provided input.
    /// Returns true if "active" or IsActive == true; otherwise false.
    /// </summary>
    public bool ResolveIsActive()
    {
        if (!string.IsNullOrWhiteSpace(Status))
        {
            var normalized = Status.Trim().ToLowerInvariant();
            return normalized switch
            {
                "active" => true,
                "pending" => false,
                "suspended" => false,
                "rejected" => false,
                _ => throw new ValidationException($"Invalid status '{Status}'. Supported values: active, pending, suspended, rejected.")
            };
        }

        if (IsActive.HasValue)
        {
            return IsActive.Value;
        }

        throw new ValidationException("Either 'status' or 'isActive' must be provided.");
    }
}
