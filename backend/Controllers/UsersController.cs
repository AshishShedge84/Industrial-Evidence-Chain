using System.Diagnostics;
using backend.DTOs.Auth;
using backend.DTOs.Common;
using backend.Exceptions;
using backend.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

/// <summary>
/// Handles user-level operations: profile updates.
/// The authenticated user may only update their own profile.
/// </summary>
[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IAuthService _auth;

    public UsersController(IAuthService auth) => _auth = auth;

    /// <summary>
    /// Updates the profile of the authenticated user.
    /// The {id} in the URL must match the JWT subject claim.
    /// </summary>
    [HttpPatch("{id:guid}")]
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<AuthUserDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> UpdateUserProfile(
        Guid id,
        [FromBody] UpdateProfileRequestDto request)
    {
        var traceId = Activity.Current?.Id ?? HttpContext.TraceIdentifier;

        var subClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                       ?? User.FindFirst("sub")?.Value;

        if (string.IsNullOrWhiteSpace(subClaim) || !Guid.TryParse(subClaim, out var callerId))
        {
            return Unauthorized(ApiResponse<AuthUserDto>.ErrorResult(new ErrorResponseDto
            {
                Code = "UNAUTHORIZED",
                Message = "Invalid or missing user identity in token.",
                StatusCode = StatusCodes.Status401Unauthorized,
                TraceId = traceId
            }, traceId));
        }

        // Users may only update their own profile (unless Admin role is checked later)
        if (callerId != id)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<AuthUserDto>.ErrorResult(new ErrorResponseDto
            {
                Code = "FORBIDDEN",
                Message = "You are not authorised to update another user's profile.",
                StatusCode = StatusCodes.Status403Forbidden,
                TraceId = traceId
            }, traceId));
        }

        try
        {
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
            var updated = await _auth.UpdateProfileAsync(id, request, ipAddress);
            return Ok(ApiResponse<AuthUserDto>.SuccessResult(updated, traceId));
        }
        catch (NotFoundException ex)
        {
            return NotFound(ApiResponse<AuthUserDto>.ErrorResult(new ErrorResponseDto
            {
                Code = "NOT_FOUND",
                Message = ex.Message,
                StatusCode = StatusCodes.Status404NotFound,
                TraceId = traceId
            }, traceId));
        }
        catch (ConflictException ex)
        {
            return Conflict(ApiResponse<AuthUserDto>.ErrorResult(new ErrorResponseDto
            {
                Code = "CONFLICT",
                Message = ex.Message,
                StatusCode = StatusCodes.Status409Conflict,
                TraceId = traceId
            }, traceId));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<AuthUserDto>.ErrorResult(new ErrorResponseDto
            {
                Code = "INTERNAL_ERROR",
                Message = ex.Message,
                StatusCode = 500,
                TraceId = traceId
            }, traceId));
        }
    }
}
