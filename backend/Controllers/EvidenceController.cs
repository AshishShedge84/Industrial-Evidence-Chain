using System.Diagnostics;
using System.Security.Claims;
using backend.DTOs.Common;
using backend.DTOs.Evidence;
using backend.Exceptions;
using backend.Models;
using backend.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

/// <summary>
/// REST API controller for managing the industrial evidence lifecycle, media queries,
/// cryptographic submission/anchoring, and verification against the blockchain ledger.
/// Conforms to the Member 1 specification and Member 3 frontend integration contract.
/// </summary>
[ApiController]
[Authorize]
public class EvidenceController : ControllerBase
{
    private readonly IEvidenceService _evidenceService;

    public EvidenceController(IEvidenceService evidenceService)
    {
        _evidenceService = evidenceService;
    }

    /// <summary>
    /// Creates a new draft evidence record associated with an industrial asset.
    /// Accessible by Technicians, Managers, and Admins.
    /// </summary>
    /// <param name="request">Evidence creation payload.</param>
    /// <response code="201">Evidence created successfully in draft/pending status.</response>
    /// <response code="400">Request validation failed or asset does not exist.</response>
    /// <response code="401">Unauthorized: Missing or invalid token.</response>
    /// <response code="403">Forbidden: Insufficient role permissions.</response>
    [HttpPost("api/evidence")]
    [Authorize(Policy = "RequireEvidenceCreator")]
    [ProducesResponseType(typeof(ApiResponse<EvidenceDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> CreateEvidence([FromBody] CreateEvidenceRequestDto request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var userId = GetCurrentUserId();
        var reqId = Activity.Current?.Id ?? HttpContext.TraceIdentifier;

        try
        {
            var created = await _evidenceService.CreateEvidenceAsync(request, userId);
            return StatusCode(StatusCodes.Status201Created, ApiResponse<EvidenceDto>.SuccessResult(created, reqId));
        }
        catch (ValidationException ex)
        {
            return BadRequest(ApiResponse<EvidenceDto>.ErrorResult(new ErrorResponseDto
            {
                Code = "BAD_REQUEST",
                Message = ex.Message,
                StatusCode = StatusCodes.Status400BadRequest,
                TraceId = reqId
            }, reqId));
        }
    }

    /// <summary>
    /// Retrieves a paginated and filtered list of evidence records.
    /// </summary>
    /// <param name="filterParams">Filter parameters (assetId, userId, activityType, status, dates, search query).</param>
    /// <response code="200">Returns paginated evidence records.</response>
    /// <response code="401">Unauthorized.</response>
    [HttpGet("api/evidence")]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<EvidenceDto>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetEvidence([FromQuery] EvidenceFilterParams filterParams)
    {
        var result = await _evidenceService.GetEvidenceAsync(filterParams);
        var reqId = Activity.Current?.Id ?? HttpContext.TraceIdentifier;
        return Ok(ApiResponse<PagedResult<EvidenceDto>>.SuccessResult(result, reqId));
    }

    /// <summary>
    /// Retrieves details for a specific evidence record by its ID.
    /// </summary>
    /// <param name="id">Evidence unique ID.</param>
    /// <response code="200">Returns evidence details.</response>
    /// <response code="401">Unauthorized.</response>
    /// <response code="404">Evidence not found.</response>
    [HttpGet("api/evidence/{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<EvidenceDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetEvidenceById(Guid id)
    {
        var reqId = Activity.Current?.Id ?? HttpContext.TraceIdentifier;
        var evidence = await _evidenceService.GetEvidenceByIdAsync(id);

        if (evidence == null)
        {
            return NotFound(ApiResponse<EvidenceDto>.ErrorResult(new ErrorResponseDto
            {
                Code = "EVIDENCE_NOT_FOUND",
                Message = $"Evidence with ID '{id}' was not found.",
                StatusCode = StatusCodes.Status404NotFound,
                TraceId = reqId
            }, reqId));
        }

        return Ok(ApiResponse<EvidenceDto>.SuccessResult(evidence, reqId));
    }

    /// <summary>
    /// Retrieves all media files attached to a specific evidence record.
    /// </summary>
    /// <param name="id">Evidence unique ID.</param>
    /// <response code="200">Returns list of attached media metadata.</response>
    /// <response code="401">Unauthorized.</response>
    /// <response code="404">Evidence not found.</response>
    [HttpGet("api/evidence/{id:guid}/media")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<EvidenceMediaDto>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetEvidenceMedia(Guid id)
    {
        var reqId = Activity.Current?.Id ?? HttpContext.TraceIdentifier;
        var evidence = await _evidenceService.GetEvidenceByIdAsync(id);

        if (evidence == null)
        {
            return NotFound(ApiResponse<IReadOnlyList<EvidenceMediaDto>>.ErrorResult(new ErrorResponseDto
            {
                Code = "EVIDENCE_NOT_FOUND",
                Message = $"Evidence with ID '{id}' was not found.",
                StatusCode = StatusCodes.Status404NotFound,
                TraceId = reqId
            }, reqId));
        }

        var media = await _evidenceService.GetEvidenceMediaAsync(id);
        return Ok(ApiResponse<IReadOnlyList<EvidenceMediaDto>>.SuccessResult(media, reqId));
    }

    /// <summary>
    /// Uploads and attaches a media file (image, video, document) to a draft evidence record.
    /// Accessible by Technicians, Managers, and Admins.
    /// </summary>
    /// <param name="id">Evidence unique ID.</param>
    /// <param name="file">Form file payload.</param>
    /// <response code="201">Media uploaded and attached successfully.</response>
    /// <response code="400">Invalid file, unsupported type, or exceeds size limit.</response>
    /// <response code="401">Unauthorized.</response>
    /// <response code="403">Forbidden.</response>
    /// <response code="404">Evidence not found.</response>
    /// <response code="409">Evidence is already anchored/immutable.</response>
    [HttpPost("api/evidence/{id:guid}/media")]
    [Authorize(Policy = "RequireEvidenceCreator")]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(ApiResponse<EvidenceMediaDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> UploadEvidenceMedia(Guid id, IFormFile file)
    {
        var reqId = Activity.Current?.Id ?? HttpContext.TraceIdentifier;

        if (file == null || file.Length == 0)
        {
            return BadRequest(ApiResponse<EvidenceMediaDto>.ErrorResult(new ErrorResponseDto
            {
                Code = "BAD_REQUEST",
                Message = "A valid file must be uploaded.",
                StatusCode = StatusCodes.Status400BadRequest,
                TraceId = reqId
            }, reqId));
        }

        var userId = GetCurrentUserId();

        try
        {
            using var stream = file.OpenReadStream();
            var result = await _evidenceService.UploadMediaAsync(
                evidenceId: id,
                fileStream: stream,
                fileName: file.FileName,
                contentType: file.ContentType,
                fileSize: file.Length,
                userId: userId);

            return StatusCode(StatusCodes.Status201Created, ApiResponse<EvidenceMediaDto>.SuccessResult(result, reqId));
        }
        catch (NotFoundException ex)
        {
            return NotFound(ApiResponse<EvidenceMediaDto>.ErrorResult(new ErrorResponseDto
            {
                Code = "EVIDENCE_NOT_FOUND",
                Message = ex.Message,
                StatusCode = StatusCodes.Status404NotFound,
                TraceId = reqId
            }, reqId));
        }
        catch (ConflictException ex)
        {
            return Conflict(ApiResponse<EvidenceMediaDto>.ErrorResult(new ErrorResponseDto
            {
                Code = "CONFLICT",
                Message = ex.Message,
                StatusCode = StatusCodes.Status409Conflict,
                TraceId = reqId
            }, reqId));
        }
        catch (ValidationException ex)
        {
            return BadRequest(ApiResponse<EvidenceMediaDto>.ErrorResult(new ErrorResponseDto
            {
                Code = "BAD_REQUEST",
                Message = ex.Message,
                StatusCode = StatusCodes.Status400BadRequest,
                TraceId = reqId
            }, reqId));
        }
    }

    /// <summary>
    /// Submits an evidence record for cryptographic canonicalization (RFC 8785), SHA-256 hashing,
    /// and anchoring to the Hyperledger Fabric blockchain ledger.
    /// Accessible by Technicians, Managers, and Admins.
    /// </summary>
    /// <param name="id">Evidence unique ID.</param>
    /// <response code="200">Evidence successfully hashed and anchored on the blockchain.</response>
    /// <response code="401">Unauthorized.</response>
    /// <response code="403">Forbidden.</response>
    /// <response code="404">Evidence not found.</response>
    /// <response code="409">Conflict or blockchain submission error.</response>
    [HttpPost("api/evidence/{id:guid}/submit")]
    [Authorize(Policy = "RequireEvidenceCreator")]
    [ProducesResponseType(typeof(ApiResponse<EvidenceDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> SubmitEvidence(Guid id)
    {
        var userId = GetCurrentUserId();
        var reqId = Activity.Current?.Id ?? HttpContext.TraceIdentifier;

        try
        {
            var result = await _evidenceService.SubmitEvidenceAsync(id, userId);
            return Ok(ApiResponse<EvidenceDto>.SuccessResult(result, reqId));
        }
        catch (NotFoundException ex)
        {
            return NotFound(ApiResponse<EvidenceDto>.ErrorResult(new ErrorResponseDto
            {
                Code = "EVIDENCE_NOT_FOUND",
                Message = ex.Message,
                StatusCode = StatusCodes.Status404NotFound,
                TraceId = reqId
            }, reqId));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse<EvidenceDto>.ErrorResult(new ErrorResponseDto
            {
                Code = "SUBMISSION_FAILED",
                Message = ex.Message,
                StatusCode = StatusCodes.Status409Conflict,
                TraceId = reqId
            }, reqId));
        }
    }

    /// <summary>
    /// Retrieves current cryptographic verification information for an evidence record against the blockchain ledger.
    /// </summary>
    /// <param name="id">Evidence unique ID.</param>
    /// <response code="200">Returns verification status and proof transaction details.</response>
    /// <response code="401">Unauthorized.</response>
    /// <response code="404">Evidence not found.</response>
    [HttpGet("api/evidence/{id:guid}/verification")]
    [ProducesResponseType(typeof(ApiResponse<EvidenceVerificationResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetEvidenceVerification(Guid id)
    {
        var reqId = Activity.Current?.Id ?? HttpContext.TraceIdentifier;

        try
        {
            var verification = await _evidenceService.VerifyEvidenceAsync(id);
            return Ok(ApiResponse<EvidenceVerificationResponseDto>.SuccessResult(verification, reqId));
        }
        catch (NotFoundException ex)
        {
            return NotFound(ApiResponse<EvidenceVerificationResponseDto>.ErrorResult(new ErrorResponseDto
            {
                Code = "EVIDENCE_NOT_FOUND",
                Message = ex.Message,
                StatusCode = StatusCodes.Status404NotFound,
                TraceId = reqId
            }, reqId));
        }
    }

    /// <summary>
    /// Triggers cryptographic recalculation and verifies the evidence hash against the anchored blockchain proof.
    /// Supports standard route 'api/evidence/{id}/verify' and alias 'api/verification/{id}'.
    /// </summary>
    /// <param name="id">Evidence unique ID.</param>
    /// <response code="200">Returns verification result.</response>
    /// <response code="401">Unauthorized.</response>
    /// <response code="404">Evidence not found.</response>
    [HttpPost("api/evidence/{id:guid}/verify")]
    [HttpPost("api/verification/{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<EvidenceVerificationResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> VerifyEvidence(Guid id)
    {
        var reqId = Activity.Current?.Id ?? HttpContext.TraceIdentifier;

        try
        {
            var verification = await _evidenceService.VerifyEvidenceAsync(id);
            return Ok(ApiResponse<EvidenceVerificationResponseDto>.SuccessResult(verification, reqId));
        }
        catch (NotFoundException ex)
        {
            return NotFound(ApiResponse<EvidenceVerificationResponseDto>.ErrorResult(new ErrorResponseDto
            {
                Code = "EVIDENCE_NOT_FOUND",
                Message = ex.Message,
                StatusCode = StatusCodes.Status404NotFound,
                TraceId = reqId
            }, reqId));
        }
    }

    /// <summary>
    /// Retrieves all evidence records associated with a specific asset.
    /// Conforms to the frontend Asset Detail screen contract.
    /// </summary>
    /// <param name="assetId">Asset unique ID.</param>
    /// <param name="page">Page number (default 1).</param>
    /// <param name="pageSize">Page size (default 20).</param>
    /// <response code="200">Returns paginated evidence for the asset.</response>
    /// <response code="401">Unauthorized.</response>
    [HttpGet("api/assets/{assetId:guid}/evidence")]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<EvidenceDto>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetEvidenceByAssetId(
        Guid assetId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await _evidenceService.GetEvidenceByAssetIdAsync(assetId, page, pageSize);
        var reqId = Activity.Current?.Id ?? HttpContext.TraceIdentifier;
        return Ok(ApiResponse<PagedResult<EvidenceDto>>.SuccessResult(result, reqId));
    }

    private Guid GetCurrentUserId()
    {
        var subClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                       ?? User.FindFirst("sub")?.Value;

        if (!string.IsNullOrWhiteSpace(subClaim) && Guid.TryParse(subClaim, out var userId) && userId != Guid.Empty)
            return userId;

        throw new UnauthorizedAccessException("Invalid or missing user identity in token.");
    }
}
