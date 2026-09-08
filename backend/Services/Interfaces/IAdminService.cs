using backend.DTOs.Admin;
using backend.Services.Interfaces;

namespace backend.Services.Interfaces;

/// <summary>Admin user management service contract.</summary>
public interface IAdminService
{
    /// <summary>Retrieves all registered users along with their assigned roles.</summary>
    Task<IEnumerable<UserDto>> GetAllUsersAsync();

    /// <summary>Updates the active/pending status of a specific user (approval or deactivation).</summary>
    Task<UserDto?> UpdateUserStatusAsync(Guid userId, UpdateUserStatusDto dto);
}
