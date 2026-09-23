using backend.DTOs.Common;
using backend.DTOs.Evidence;

namespace backend.Services.Interfaces;

/// <summary>
/// Service contract for managing evidence records, media attachments, cryptographic hashing, and blockchain anchoring.
/// </summary>
public interface IEvidenceService
{
    /// <summary>
    /// Creates a new draft evidence record associated with an asset.
    /// </summary>
    Task<EvidenceDto> CreateEvidenceAsync(
        CreateEvidenceRequestDto request,
        Guid userId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves a single evidence record by its unique identifier.
    /// </summary>
    Task<EvidenceDto?> GetEvidenceByIdAsync(
        Guid evidenceId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves a paginated and filtered list of evidence records.
    /// </summary>
    Task<PagedResult<EvidenceDto>> GetEvidenceAsync(
        EvidenceFilterParams filterParams,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves all evidence records associated with a specific asset.
    /// </summary>
    Task<PagedResult<EvidenceDto>> GetEvidenceByAssetIdAsync(
        Guid assetId,
        int page = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Uploads a media file stream via IFileStorageService and attaches its metadata to an existing draft evidence record.
    /// </summary>
    Task<EvidenceMediaDto> UploadMediaAsync(
        Guid evidenceId,
        Stream fileStream,
        string fileName,
        string contentType,
        long fileSize,
        Guid userId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Attaches media file metadata to an existing draft evidence record.
    /// </summary>
    Task<EvidenceMediaDto> AttachMediaAsync(
        Guid evidenceId,
        string fileName,
        string contentType,
        string storageUrl,
        long? fileSizeBytes,
        string? fileHash,
        Guid userId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves all media files attached to a specific evidence record.
    /// </summary>
    Task<IReadOnlyList<EvidenceMediaDto>> GetEvidenceMediaAsync(
        Guid evidenceId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Submits an evidence record for cryptographic hashing and blockchain proof anchoring.
    /// Calculates the deterministic SHA-256 hash using RFC 8785 canonicalization and anchors it via IBlockchainAdapter.
    /// </summary>
    Task<EvidenceDto> SubmitEvidenceAsync(
        Guid evidenceId,
        Guid userId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves or triggers cryptographic verification information for an evidence record against the blockchain ledger.
    /// When recordAudit is true, records an EvidenceVerified audit event.
    /// </summary>
    Task<EvidenceVerificationResponseDto> VerifyEvidenceAsync(
        Guid evidenceId,
        Guid? userId = null,
        bool recordAudit = false,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves the audit trail entries recorded for a specific evidence record.
    /// </summary>
    Task<IReadOnlyList<AuditTrailEntryDto>> GetEvidenceAuditTrailAsync(
        Guid evidenceId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves the latest verification state and proof for an evidence record without re-running hashing.
    /// </summary>
    Task<EvidenceVerificationResponseDto> GetEvidenceVerificationAsync(
        Guid evidenceId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Records a manager operational action (e.g. Escalate, Request Re-capture, Acknowledge) with an audit entry.
    /// </summary>
    Task<bool> RecordOperationalActionAsync(
        Guid evidenceId,
        string action,
        string? reason,
        Guid userId,
        CancellationToken cancellationToken = default);
}
