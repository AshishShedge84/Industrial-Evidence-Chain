using System.Diagnostics;
using backend.DTOs.Admin;
using backend.DTOs.Common;
using backend.Models;
using backend.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

/// <summary>
/// Administrative controller for user management and account approvals.
/// Strictly protected with Admin role policy.
/// </summary>
[ApiController]
[Route("api/admin")]
[Authorize(Roles = AppRoles.Admin)]
public class AdminController : ControllerBase
{
    private readonly IAdminService _adminService;

    public AdminController(IAdminService adminService)
    {
        _adminService = adminService;
    }

    /// <summary>
    /// Retrieves all registered users in the system (Admin-only).
    /// </summary>
    /// <response code="200">Returns list of users with roles and active statuses.</response>
    /// <response code="401">Unauthorized: Missing or invalid token.</response>
    /// <response code="403">Forbidden: Caller is not an Administrator.</response>
    [HttpGet("users")]
    [ProducesResponseType(typeof(ApiResponse<IEnumerable<UserDto>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetAllUsers()
    {
        var users = await _adminService.GetAllUsersAsync();
        var reqId = Activity.Current?.Id ?? HttpContext.TraceIdentifier;
        return Ok(ApiResponse<IEnumerable<UserDto>>.SuccessResult(users, reqId));
    }

    /// <summary>
    /// Updates a user's account status, such as approving a pending user (IsActive = true) or deactivating an account.
    /// </summary>
    /// <response code="200">User status updated successfully.</response>
    /// <response code="400">Request body failed validation.</response>
    /// <response code="401">Unauthorized: Missing or invalid token.</response>
    /// <response code="403">Forbidden: Caller is not an Administrator.</response>
    /// <response code="404">Target user not found.</response>
    [HttpPatch("users/{id:guid}/status")]
    [ProducesResponseType(typeof(ApiResponse<UserDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateUserStatus(Guid id, [FromBody] UpdateUserStatusDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var result = await _adminService.UpdateUserStatusAsync(id, dto);
        var reqId = Activity.Current?.Id ?? HttpContext.TraceIdentifier;

        if (result is null)
        {
            return NotFound(ApiResponse<UserDto>.ErrorResult(new ErrorResponseDto
            {
                Code = "NOT_FOUND",
                Message = $"User with ID '{id}' was not found.",
                StatusCode = StatusCodes.Status404NotFound,
                TraceId = reqId
            }, reqId));
        }

        return Ok(ApiResponse<UserDto>.SuccessResult(result, reqId));
    }
}

