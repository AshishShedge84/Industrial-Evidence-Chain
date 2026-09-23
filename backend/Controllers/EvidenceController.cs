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
        // Scope manager evidence queries by default to their assigned manager ID unless admin/auditor
        if (User.IsInRole("Manager") && !User.IsInRole("Admin") && !User.IsInRole("Auditor"))
        {
            if (!filterParams.AssignedManagerId.HasValue)
            {
                filterParams.AssignedManagerId = GetCurrentUserId();
            }
        }

        var result = await _evidenceService.GetEvidenceAsync(filterParams);
        var reqId = Activity.Current?.Id ?? HttpContext.TraceIdentifier;

        if (!CanViewFullHash())
        {
            foreach (var item in result.Items)
            {
                ApplyHashMasking(item);
            }
        }

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

        ApplyHashMasking(evidence);
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
    [HttpPost("api/evidence/{id:guid}/upload")]
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
            var verification = await _evidenceService.GetEvidenceVerificationAsync(id);
            ApplyHashMasking(verification);
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
    /// <response code="403">Forbidden.</response>
    /// <response code="404">Evidence not found.</response>
    [HttpPost("api/evidence/{id:guid}/verify")]
    [HttpPost("api/verification/{id:guid}")]
    [Authorize(Roles = "Manager,Auditor,Admin")]
    [ProducesResponseType(typeof(ApiResponse<EvidenceVerificationResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> VerifyEvidence(Guid id)
    {
        var reqId = Activity.Current?.Id ?? HttpContext.TraceIdentifier;
        var userId = GetCurrentUserId();

        try
        {
            var verification = await _evidenceService.VerifyEvidenceAsync(id, userId, recordAudit: true);
            ApplyHashMasking(verification);
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
    /// Records an operational decision action performed by a manager (Escalate, Request Re-capture, Acknowledge, Flag Storage).
    /// </summary>
    /// <param name="id">Evidence unique ID.</param>
    /// <param name="dto">Action details.</param>
    /// <response code="200">Action successfully recorded.</response>
    /// <response code="400">Invalid action request.</response>
    /// <response code="401">Unauthorized.</response>
    /// <response code="403">Forbidden.</response>
    [HttpPost("api/evidence/{id:guid}/action")]
    [Authorize(Roles = "Manager,Admin")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> RecordOperationalAction(Guid id, [FromBody] OperationalActionRequestDto dto)
    {
        var reqId = Activity.Current?.Id ?? HttpContext.TraceIdentifier;
        var userId = GetCurrentUserId();

        if (string.IsNullOrWhiteSpace(dto.Action))
        {
            return BadRequest(ApiResponse<bool>.ErrorResult(new ErrorResponseDto
            {
                Code = "VALIDATION_FAILED",
                Message = "Action cannot be empty.",
                StatusCode = StatusCodes.Status400BadRequest,
                TraceId = reqId
            }, reqId));
        }

        try
        {
            await _evidenceService.RecordOperationalActionAsync(id, dto.Action, dto.Reason, userId);
            return Ok(ApiResponse<bool>.SuccessResult(true, reqId));
        }
        catch (NotFoundException ex)
        {
            return NotFound(ApiResponse<bool>.ErrorResult(new ErrorResponseDto
            {
                Code = "EVIDENCE_NOT_FOUND",
                Message = ex.Message,
                StatusCode = StatusCodes.Status404NotFound,
                TraceId = reqId
            }, reqId));
        }
    }

    /// <summary>
    /// Retrieves audit trail records for a specific evidence record.
    /// </summary>
    /// <param name="id">Evidence unique ID.</param>
    /// <response code="200">Returns list of audit trail entries.</response>
    /// <response code="401">Unauthorized.</response>
    [HttpGet("api/evidence/{id:guid}/audit-trail")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<AuditTrailEntryDto>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetEvidenceAuditTrail(Guid id)
    {
        var reqId = Activity.Current?.Id ?? HttpContext.TraceIdentifier;
        var entries = await _evidenceService.GetEvidenceAuditTrailAsync(id);
        return Ok(ApiResponse<IReadOnlyList<AuditTrailEntryDto>>.SuccessResult(entries, reqId));
    }

    /// <summary>
    /// Retrieves all evidence records associated with a specific asset.
    /// </summary>
    /// <param name="assetId">Asset unique ID.</param>
    /// <param name="page">Page number (default 1).</param>
    /// <param name="pageSize">Page size (default 20, max 100).</param>
    /// <response code="200">Returns paginated evidence records for the asset.</response>
    /// <response code="401">Unauthorized.</response>
    [HttpGet("api/assets/{assetId:guid}/evidence")]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<EvidenceDto>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetEvidenceByAsset(
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
        var idClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (Guid.TryParse(idClaim, out var guid))
            return guid;

        throw new UnauthorizedAccessException("User identity could not be verified from token claims.");
    }

    private bool CanViewFullHash() =>
        User.IsInRole("Admin") || User.IsInRole("Auditor") || User.IsInRole("Manager");

    private static string MaskHash(string? hash)
    {
        if (string.IsNullOrEmpty(hash) || hash.Length < 12)
            return "**********************";
        return $"{hash[..6]}****************{hash[^4..]}";
    }

    private void ApplyHashMasking(EvidenceDto evidence)
    {
        if (!CanViewFullHash() && !string.IsNullOrEmpty(evidence.EvidenceHash))
        {
            evidence.EvidenceHash = MaskHash(evidence.EvidenceHash);
        }
    }

    private void ApplyHashMasking(EvidenceVerificationResponseDto verification)
    {
        if (!CanViewFullHash())
        {
            if (!string.IsNullOrEmpty(verification.CalculatedHash))
                verification.CalculatedHash = MaskHash(verification.CalculatedHash);
            if (!string.IsNullOrEmpty(verification.TrustedHash))
                verification.TrustedHash = MaskHash(verification.TrustedHash);
        }
    }
}
