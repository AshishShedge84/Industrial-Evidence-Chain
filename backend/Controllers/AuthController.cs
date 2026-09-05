using System.Diagnostics;
using backend.DTOs.Auth;
using backend.DTOs.Common;
using backend.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _auth;

    public AuthController(IAuthService auth) => _auth = auth;

    /// <summary>
    /// Authenticates a user and returns a JWT.
    /// </summary>
    /// <remarks>
    /// UsernameOrEmail accepts either the user's Username or Email.
    /// Returns 401 for any invalid credential (username not found OR wrong password).
    /// Error details are intentionally vague to prevent user enumeration.
    /// </remarks>
    /// <response code="200">Login succeeded. Returns JWT and user information in ApiResponse envelope.</response>
    /// <response code="400">Request body failed validation.</response>
    /// <response code="401">Credentials are invalid.</response>
    [HttpPost("login")]
    [ProducesResponseType(typeof(ApiResponse<LoginResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var result = await _auth.LoginAsync(request);

        if (result is null)
        {
            var traceId = Activity.Current?.Id ?? HttpContext.TraceIdentifier;
            return Unauthorized(ApiResponse<LoginResponseDto>.ErrorResult(new ErrorResponseDto
            {
                Code = "UNAUTHORIZED",
                Message = "Invalid credentials.",
                StatusCode = StatusCodes.Status401Unauthorized,
                TraceId = traceId
            }, traceId));
        }

        var reqId = Activity.Current?.Id ?? HttpContext.TraceIdentifier;
        return Ok(ApiResponse<LoginResponseDto>.SuccessResult(result, reqId));
    }

    /// <summary>
    /// Registers a new user account. The account starts in a pending/inactive state awaiting Admin approval.
    /// </summary>
    /// <response code="201">User registered successfully and is pending approval.</response>
    /// <response code="400">Request validation failed or invalid role requested.</response>
    /// <response code="409">Username or Email already registered.</response>
    [HttpPost("register")]
    [ProducesResponseType(typeof(ApiResponse<RegisterResponseDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Register([FromBody] RegisterRequestDto request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        try
        {
            var result = await _auth.RegisterAsync(request);
            var reqId = Activity.Current?.Id ?? HttpContext.TraceIdentifier;
            return StatusCode(StatusCodes.Status201Created, ApiResponse<RegisterResponseDto>.SuccessResult(result, reqId));
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("already taken") || ex.Message.Contains("already registered"))
        {
            var traceId = Activity.Current?.Id ?? HttpContext.TraceIdentifier;
            return Conflict(ApiResponse<RegisterResponseDto>.ErrorResult(new ErrorResponseDto
            {
                Code = "CONFLICT",
                Message = ex.Message,
                StatusCode = StatusCodes.Status409Conflict,
                TraceId = traceId
            }, traceId));
        }
        catch (InvalidOperationException ex)
        {
            var traceId = Activity.Current?.Id ?? HttpContext.TraceIdentifier;
            return BadRequest(ApiResponse<RegisterResponseDto>.ErrorResult(new ErrorResponseDto
            {
                Code = "BAD_REQUEST",
                Message = ex.Message,
                StatusCode = StatusCodes.Status400BadRequest,
                TraceId = traceId
            }, traceId));
        }
    }

    /// <summary>
    /// Retrieves the profile of the currently authenticated user based on the JWT subject claim.
    /// </summary>
    /// <response code="200">Returns current user profile.</response>
    /// <response code="401">Unauthorized: Missing, invalid, or expired token, or invalid user identity claim.</response>
    /// <response code="404">User profile not found.</response>
    [Microsoft.AspNetCore.Authorization.Authorize]
    [HttpGet("me")]
    [ProducesResponseType(typeof(ApiResponse<AuthUserDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetCurrentUser()
    {
        var traceId = Activity.Current?.Id ?? HttpContext.TraceIdentifier;

        var subClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                       ?? User.FindFirst("sub")?.Value;

        if (string.IsNullOrWhiteSpace(subClaim) || !Guid.TryParse(subClaim, out var userId))
        {
            return Unauthorized(ApiResponse<AuthUserDto>.ErrorResult(new ErrorResponseDto
            {
                Code = "UNAUTHORIZED",
                Message = "Invalid or missing user identity in token.",
                StatusCode = StatusCodes.Status401Unauthorized,
                TraceId = traceId
            }, traceId));
        }

        var profile = await _auth.GetCurrentUserAsync(userId);
        if (profile is null)
        {
            return NotFound(ApiResponse<AuthUserDto>.ErrorResult(new ErrorResponseDto
            {
                Code = "NOT_FOUND",
                Message = "User profile not found.",
                StatusCode = StatusCodes.Status404NotFound,
                TraceId = traceId
            }, traceId));
        }

        return Ok(ApiResponse<AuthUserDto>.SuccessResult(profile, traceId));
    }
}


