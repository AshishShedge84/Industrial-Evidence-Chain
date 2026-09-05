using System.Diagnostics;
using System.Security.Claims;
using backend.DTOs.Assets;
using backend.DTOs.Common;
using backend.Exceptions;
using backend.Models;
using backend.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

/// <summary>
/// Controller for managing industrial assets, soft decommissioning, and lifecycle history.
/// Follows the confirmed Member 3 frontend contract wrapped in ApiResponse envelope.
/// </summary>
[ApiController]
[Route("api/assets")]
[Authorize]
public class AssetController : ControllerBase
{
    private readonly IAssetService _assetService;

    public AssetController(IAssetService assetService)
    {
        _assetService = assetService;
    }

    /// <summary>
    /// Retrieves a paginated and filtered list of assets.
    /// </summary>
    /// <param name="query">Optional search term for asset tag, name, or description.</param>
    /// <param name="category">Optional category filter.</param>
    /// <param name="status">Optional status filter (Active, Inactive, Maintenance, Retired, Lost, Decommissioned).</param>
    /// <param name="assignedTo">Optional assignee User ID filter.</param>
    /// <param name="page">Page number (default 1).</param>
    /// <param name="pageSize">Page size (default 20).</param>
    /// <response code="200">Returns paginated assets.</response>
    /// <response code="401">Unauthorized: Missing or invalid token.</response>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<AssetDto>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetAssets(
        [FromQuery] string? query = null,
        [FromQuery] string? category = null,
        [FromQuery] string? status = null,
        [FromQuery] Guid? assignedTo = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await _assetService.GetAssetsAsync(query, category, status, assignedTo, page, pageSize);
        var reqId = Activity.Current?.Id ?? HttpContext.TraceIdentifier;
        return Ok(ApiResponse<PagedResult<AssetDto>>.SuccessResult(result, reqId));
    }

    /// <summary>
    /// Retrieves details for a specific asset by its ID.
    /// </summary>
    /// <param name="id">Asset unique ID.</param>
    /// <response code="200">Returns asset details.</response>
    /// <response code="401">Unauthorized.</response>
    /// <response code="404">Asset not found.</response>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<AssetDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetAssetById(Guid id)
    {
        var reqId = Activity.Current?.Id ?? HttpContext.TraceIdentifier;
        var asset = await _assetService.GetAssetByIdAsync(id);

        if (asset == null)
        {
            return NotFound(ApiResponse<AssetDto>.ErrorResult(new ErrorResponseDto
            {
                Code = "ASSET_NOT_FOUND",
                Message = $"Asset with ID '{id}' was not found.",
                StatusCode = StatusCodes.Status404NotFound,
                TraceId = reqId
            }, reqId));
        }

        return Ok(ApiResponse<AssetDto>.SuccessResult(asset, reqId));
    }

    /// <summary>
    /// Creates a new industrial asset (Manager or Admin only).
    /// </summary>
    /// <param name="request">Asset creation request payload.</param>
    /// <response code="201">Asset created successfully.</response>
    /// <response code="400">Request validation failed or invalid assignee.</response>
    /// <response code="401">Unauthorized.</response>
    /// <response code="403">Forbidden: Caller is not a Manager or Admin.</response>
    /// <response code="409">Asset tag already registered.</response>
    [HttpPost]
    [Authorize(Policy = "RequireManager")]
    [ProducesResponseType(typeof(ApiResponse<AssetDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateAsset([FromBody] CreateAssetRequestDto request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var userId = GetCurrentUserId();
        var reqId = Activity.Current?.Id ?? HttpContext.TraceIdentifier;

        try
        {
            var created = await _assetService.CreateAssetAsync(request, userId);
            return StatusCode(StatusCodes.Status201Created, ApiResponse<AssetDto>.SuccessResult(created, reqId));
        }
        catch (ConflictException ex)
        {
            return Conflict(ApiResponse<AssetDto>.ErrorResult(new ErrorResponseDto
            {
                Code = "CONFLICT",
                Message = ex.Message,
                StatusCode = StatusCodes.Status409Conflict,
                TraceId = reqId
            }, reqId));
        }
        catch (ValidationException ex)
        {
            return BadRequest(ApiResponse<AssetDto>.ErrorResult(new ErrorResponseDto
            {
                Code = "BAD_REQUEST",
                Message = ex.Message,
                StatusCode = StatusCodes.Status400BadRequest,
                TraceId = reqId
            }, reqId));
        }
    }

    /// <summary>
    /// Updates an existing industrial asset (Manager or Admin only).
    /// </summary>
    /// <param name="id">Asset unique ID.</param>
    /// <param name="request">Asset update request payload.</param>
    /// <response code="200">Asset updated successfully.</response>
    /// <response code="400">Request validation failed or invalid status.</response>
    /// <response code="401">Unauthorized.</response>
    /// <response code="403">Forbidden: Caller is not a Manager or Admin.</response>
    /// <response code="404">Asset not found.</response>
    [HttpPut("{id:guid}")]
    [Authorize(Policy = "RequireManager")]
    [ProducesResponseType(typeof(ApiResponse<AssetDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateAsset(Guid id, [FromBody] UpdateAssetRequestDto request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var userId = GetCurrentUserId();
        var reqId = Activity.Current?.Id ?? HttpContext.TraceIdentifier;

        try
        {
            var updated = await _assetService.UpdateAssetAsync(id, request, userId);
            if (updated == null)
            {
                return NotFound(ApiResponse<AssetDto>.ErrorResult(new ErrorResponseDto
                {
                    Code = "ASSET_NOT_FOUND",
                    Message = $"Asset with ID '{id}' was not found.",
                    StatusCode = StatusCodes.Status404NotFound,
                    TraceId = reqId
                }, reqId));
            }

            return Ok(ApiResponse<AssetDto>.SuccessResult(updated, reqId));
        }
        catch (ValidationException ex)
        {
            return BadRequest(ApiResponse<AssetDto>.ErrorResult(new ErrorResponseDto
            {
                Code = "BAD_REQUEST",
                Message = ex.Message,
                StatusCode = StatusCodes.Status400BadRequest,
                TraceId = reqId
            }, reqId));
        }
    }

    /// <summary>
    /// Soft-decommissions an asset (Admin only).
    /// Sets status to 'Decommissioned' and preserves all historical records.
    /// </summary>
    /// <param name="id">Asset unique ID.</param>
    /// <response code="200">Asset decommissioned successfully.</response>
    /// <response code="401">Unauthorized.</response>
    /// <response code="403">Forbidden: Caller is not an Administrator.</response>
    /// <response code="404">Asset not found.</response>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = AppRoles.Admin)]
    [ProducesResponseType(typeof(ApiResponse<AssetDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteAsset(Guid id)
    {
        var userId = GetCurrentUserId();
        var reqId = Activity.Current?.Id ?? HttpContext.TraceIdentifier;

        var result = await _assetService.DecommissionAssetAsync(id, userId);
        if (result == null)
        {
            return NotFound(ApiResponse<AssetDto>.ErrorResult(new ErrorResponseDto
            {
                Code = "ASSET_NOT_FOUND",
                Message = $"Asset with ID '{id}' was not found.",
                StatusCode = StatusCodes.Status404NotFound,
                TraceId = reqId
            }, reqId));
        }

        return Ok(ApiResponse<AssetDto>.SuccessResult(result, reqId));
    }

    /// <summary>
    /// Retrieves the audit trail and lifecycle history of a specific asset.
    /// </summary>
    /// <param name="id">Asset unique ID.</param>
    /// <response code="200">Returns list of historical audit trail entries.</response>
    /// <response code="401">Unauthorized.</response>
    [HttpGet("{id:guid}/history")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<AssetHistoryDto>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetAssetHistory(Guid id)
    {
        var history = await _assetService.GetAssetHistoryAsync(id);
        var reqId = Activity.Current?.Id ?? HttpContext.TraceIdentifier;
        return Ok(ApiResponse<IReadOnlyList<AssetHistoryDto>>.SuccessResult(history, reqId));
    }

    private Guid GetCurrentUserId()
    {
        var subClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                       ?? User.FindFirst("sub")?.Value;

        if (Guid.TryParse(subClaim, out var userId))
            return userId;

        return Guid.Empty;
    }
}
