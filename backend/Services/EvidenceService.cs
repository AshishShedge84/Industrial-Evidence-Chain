using System.Text.Json;
using backend.Data;
using backend.DTOs.Blockchain;
using backend.DTOs.Common;
using backend.DTOs.Evidence;
using backend.Exceptions;
using backend.Models;
using backend.Models.Enums;
using backend.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace backend.Services;

/// <summary>
/// Service implementation for managing the industrial evidence lifecycle, RFC 8785 cryptographic hashing,
/// media attachments, blockchain anchoring via IBlockchainAdapter, and audit logging.
/// </summary>
public class EvidenceService : IEvidenceService
{
    private const long MaxFileSizeBytes = 50 * 1024 * 1024; // 50 MB limit
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".svg",
        ".mp4", ".mov", ".avi", ".webm", ".mkv",
        ".pdf", ".txt", ".csv", ".json", ".doc", ".docx", ".xls", ".xlsx"
    };

    private readonly AppDbContext _db;
    private readonly IEvidenceHasher _hasher;
    private readonly IAuditLogService _auditLogs;
    private readonly IFileStorageService _storageService;
    private readonly IServiceProvider _serviceProvider;

    public EvidenceService(
        AppDbContext db,
        IEvidenceHasher hasher,
        IAuditLogService auditLogs,
        IFileStorageService storageService,
        IServiceProvider serviceProvider)
    {
        _db = db;
        _hasher = hasher;
        _auditLogs = auditLogs;
        _storageService = storageService;
        _serviceProvider = serviceProvider;
    }

    public async Task<EvidenceDto> CreateEvidenceAsync(
        CreateEvidenceRequestDto request,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        // 1. Validate Asset exists
        var asset = await _db.Assets.SingleOrDefaultAsync(a => a.AssetId == request.AssetId, cancellationToken);
        if (asset == null)
        {
            throw new ValidationException($"Asset with ID '{request.AssetId}' does not exist.");
        }

        // 2. Validate user exists
        var userExists = await _db.Users.AnyAsync(u => u.UserId == userId, cancellationToken);
        if (!userExists)
        {
            throw new ValidationException($"User with ID '{userId}' does not exist.");
        }

        // 3. Validate coordinates range
        if (request.Latitude.HasValue && (request.Latitude < -90m || request.Latitude > 90m))
        {
            throw new ValidationException("Latitude must be between -90 and 90 degrees.");
        }

        if (request.Longitude.HasValue && (request.Longitude < -180m || request.Longitude > 180m))
        {
            throw new ValidationException("Longitude must be between -180 and 180 degrees.");
        }

        // 4. Validate description
        if (string.IsNullOrWhiteSpace(request.Description))
        {
            throw new ValidationException("Description cannot be empty.");
        }

        // 5. Create Draft Evidence Record
        var evidence = new EvidenceRecord
        {
            EvidenceId = Guid.NewGuid(),
            AssetId = request.AssetId,
            UserId = userId,
            ActivityType = request.ActivityType,
            Timestamp = request.Timestamp.ToUniversalTime(),
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            Description = request.Description.Trim(),
            EvidenceHash = null,
            AnchorStatus = AnchorStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };

        _db.EvidenceRecords.Add(evidence);
        await _db.SaveChangesAsync(cancellationToken);

        // 6. Record audit event
        await _auditLogs.LogAsync(
            action: "EvidenceCreated",
            userId: userId,
            entityType: "EvidenceRecord",
            entityId: evidence.EvidenceId.ToString(),
            details: JsonSerializer.Serialize(new
            {
                evidenceId = evidence.EvidenceId,
                assetId = evidence.AssetId,
                activityType = evidence.ActivityType.ToString(),
                timestamp = evidence.Timestamp,
                status = evidence.AnchorStatus.ToString()
            }),
            cancellationToken: cancellationToken);

        return MapToDto(evidence, new List<string>());
    }

    public async Task<EvidenceDto?> GetEvidenceByIdAsync(
        Guid evidenceId,
        CancellationToken cancellationToken = default)
    {
        var evidence = await _db.EvidenceRecords
            .AsNoTracking()
            .Include(e => e.MediaFiles)
            .SingleOrDefaultAsync(e => e.EvidenceId == evidenceId, cancellationToken);

        if (evidence == null)
            return null;

        var mediaHashes = evidence.MediaFiles
            .Select(m => m.StorageUrl)
            .ToList();

        return MapToDto(evidence, mediaHashes);
    }

    public async Task<PagedResult<EvidenceDto>> GetEvidenceAsync(
        EvidenceFilterParams filterParams,
        CancellationToken cancellationToken = default)
    {
        var page = filterParams.Page < 1 ? 1 : filterParams.Page;
        var pageSize = filterParams.PageSize < 1 ? 20 : (filterParams.PageSize > 100 ? 100 : filterParams.PageSize);

        IQueryable<EvidenceRecord> q = _db.EvidenceRecords
            .AsNoTracking()
            .Include(e => e.MediaFiles);

        if (filterParams.AssetId.HasValue && filterParams.AssetId.Value != Guid.Empty)
        {
            q = q.Where(e => e.AssetId == filterParams.AssetId.Value);
        }

        if (filterParams.UserId.HasValue && filterParams.UserId.Value != Guid.Empty)
        {
            q = q.Where(e => e.UserId == filterParams.UserId.Value);
        }

        if (filterParams.ActivityType.HasValue)
        {
            q = q.Where(e => e.ActivityType == filterParams.ActivityType.Value);
        }

        if (filterParams.AnchorStatus.HasValue)
        {
            q = q.Where(e => e.AnchorStatus == filterParams.AnchorStatus.Value);
        }

        if (filterParams.FromDate.HasValue)
        {
            var fromUtc = filterParams.FromDate.Value.ToUniversalTime();
            q = q.Where(e => e.Timestamp >= fromUtc);
        }

        if (filterParams.ToDate.HasValue)
        {
            var toUtc = filterParams.ToDate.Value.ToUniversalTime();
            q = q.Where(e => e.Timestamp <= toUtc);
        }

        if (!string.IsNullOrWhiteSpace(filterParams.Query))
        {
            var term = filterParams.Query.Trim().ToLower();
            q = q.Where(e => e.Description.ToLower().Contains(term) ||
                             (e.EvidenceHash != null && e.EvidenceHash.ToLower().Contains(term)));
        }

        var total = await q.CountAsync(cancellationToken);

        var items = await q
            .OrderByDescending(e => e.Timestamp)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var dtos = items.Select(e => MapToDto(e, e.MediaFiles.Select(m => m.StorageUrl).ToList())).ToList();

        return new PagedResult<EvidenceDto>
        {
            Items = dtos,
            Total = total,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<PagedResult<EvidenceDto>> GetEvidenceByAssetIdAsync(
        Guid assetId,
        int page = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        return await GetEvidenceAsync(new EvidenceFilterParams
        {
            AssetId = assetId,
            Page = page,
            PageSize = pageSize
        }, cancellationToken);
    }

    public async Task<EvidenceMediaDto> UploadMediaAsync(
        Guid evidenceId,
        Stream fileStream,
        string fileName,
        string contentType,
        long fileSize,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        if (fileStream == null || !fileStream.CanRead)
        {
            throw new ValidationException("A valid, readable file must be provided.");
        }

        if (string.IsNullOrWhiteSpace(fileName))
        {
            throw new ValidationException("File name must not be empty.");
        }

        if (fileSize <= 0)
        {
            throw new ValidationException("Uploaded file is empty (0 bytes).");
        }

        if (fileSize > MaxFileSizeBytes)
        {
            throw new ValidationException($"File size exceeds the maximum limit of {MaxFileSizeBytes / (1024 * 1024)} MB.");
        }

        var extension = Path.GetExtension(fileName);
        if (string.IsNullOrWhiteSpace(extension) || !AllowedExtensions.Contains(extension))
        {
            throw new ValidationException($"File type '{extension}' is unsupported. Allowed: images, videos, and documents (PDF, CSV, TXT, DOCX, XLSX).");
        }

        var evidence = await _db.EvidenceRecords
            .SingleOrDefaultAsync(e => e.EvidenceId == evidenceId, cancellationToken);

        if (evidence == null)
        {
            throw new NotFoundException($"Evidence with ID '{evidenceId}' was not found.");
        }

        if (evidence.AnchorStatus == AnchorStatus.Anchored)
        {
            throw new ConflictException("Cannot attach media to an evidence record that has already been anchored on the blockchain.");
        }

        // Store file off-chain using the storage abstraction
        var storedResult = await _storageService.StoreAsync(fileStream, fileName, contentType, cancellationToken);

        return await AttachMediaAsync(
            evidenceId: evidenceId,
            fileName: storedResult.FileName,
            contentType: storedResult.ContentType,
            storageUrl: storedResult.StorageUrl,
            fileSizeBytes: storedResult.FileSizeBytes,
            fileHash: null,
            userId: userId,
            cancellationToken: cancellationToken);
    }

    public async Task<EvidenceMediaDto> AttachMediaAsync(
        Guid evidenceId,
        string fileName,
        string contentType,
        string storageUrl,
        long? fileSizeBytes,
        string? fileHash,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var evidence = await _db.EvidenceRecords
            .SingleOrDefaultAsync(e => e.EvidenceId == evidenceId, cancellationToken);

        if (evidence == null)
        {
            throw new NotFoundException($"Evidence with ID '{evidenceId}' was not found.");
        }

        if (evidence.AnchorStatus == AnchorStatus.Anchored)
        {
            throw new ConflictException("Cannot attach media to an evidence record that has already been anchored on the blockchain.");
        }

        var fileType = InferMediaFileType(fileName, contentType);

        var media = new EvidenceMedia
        {
            MediaId = Guid.NewGuid(),
            EvidenceId = evidenceId,
            FileName = Path.GetFileName(fileName),
            FileType = fileType,
            StorageUrl = storageUrl,
            FileSizeBytes = fileSizeBytes,
            UploadedAt = DateTime.UtcNow
        };

        _db.EvidenceMedia.Add(media);
        await _db.SaveChangesAsync(cancellationToken);

        // Record audit event
        await _auditLogs.LogAsync(
            action: "MediaAttached",
            userId: userId,
            entityType: "EvidenceMedia",
            entityId: media.MediaId.ToString(),
            details: JsonSerializer.Serialize(new
            {
                mediaId = media.MediaId,
                evidenceId = evidenceId,
                fileName = media.FileName,
                fileType = media.FileType.ToString(),
                storageUrl = media.StorageUrl,
                fileHash = fileHash
            }),
            cancellationToken: cancellationToken);

        return new EvidenceMediaDto
        {
            MediaId = media.MediaId,
            EvidenceId = media.EvidenceId,
            FileName = media.FileName,
            FileType = media.FileType,
            StorageProvider = "Local",
            StorageUrl = media.StorageUrl,
            FileSizeBytes = media.FileSizeBytes,
            FileHash = fileHash,
            UploadedAt = media.UploadedAt
        };
    }

    public async Task<IReadOnlyList<EvidenceMediaDto>> GetEvidenceMediaAsync(
        Guid evidenceId,
        CancellationToken cancellationToken = default)
    {
        var mediaList = await _db.EvidenceMedia
            .AsNoTracking()
            .Where(m => m.EvidenceId == evidenceId)
            .OrderBy(m => m.UploadedAt)
            .ToListAsync(cancellationToken);

        return mediaList.Select(m => new EvidenceMediaDto
        {
            MediaId = m.MediaId,
            EvidenceId = m.EvidenceId,
            FileName = m.FileName,
            FileType = m.FileType,
            StorageProvider = "Local",
            StorageUrl = m.StorageUrl,
            FileSizeBytes = m.FileSizeBytes,
            FileHash = null,
            UploadedAt = m.UploadedAt
        }).ToList();
    }

    public async Task<EvidenceDto> SubmitEvidenceAsync(
        Guid evidenceId,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var evidence = await _db.EvidenceRecords
            .Include(e => e.MediaFiles)
            .Include(e => e.BlockchainProof)
            .SingleOrDefaultAsync(e => e.EvidenceId == evidenceId, cancellationToken);

        if (evidence == null)
        {
            throw new NotFoundException($"Evidence with ID '{evidenceId}' was not found.");
        }

        // Idempotency: If already anchored, return existing representation
        if (evidence.AnchorStatus == AnchorStatus.Anchored && evidence.BlockchainProof != null)
        {
            var existingMediaHashes = evidence.MediaFiles.Select(m => m.StorageUrl).ToList();
            return MapToDto(evidence, existingMediaHashes);
        }

        // 1. Gather media hashes or references
        var mediaHashes = evidence.MediaFiles
            .Select(m => m.StorageUrl)
            .ToList();

        // 2. Compute canonical SHA-256 hash using IEvidenceHasher
        var calculatedHash = _hasher.ComputeHash(evidence, mediaHashes);
        evidence.EvidenceHash = calculatedHash;

        // 3. Obtain blockchain adapter
        var adapter = _serviceProvider.GetService<IBlockchainAdapter>();
        if (adapter == null)
        {
            throw new InvalidOperationException("No IBlockchainAdapter implementation is registered. Blockchain anchoring is unavailable.");
        }

        // 4. Anchor evidence on blockchain
        var anchorParams = new AnchorEvidenceParams
        {
            EvidenceId = evidence.EvidenceId,
            AssetId = evidence.AssetId,
            EvidenceHash = calculatedHash,
            Timestamp = evidence.Timestamp,
            SignerReference = userId.ToString()
        };

        var anchorResult = await adapter.AnchorEvidenceAsync(anchorParams, cancellationToken);

        if (string.Equals(anchorResult.Status, "ANCHORED", StringComparison.OrdinalIgnoreCase) &&
            !string.IsNullOrWhiteSpace(anchorResult.TransactionId))
        {
            evidence.AnchorStatus = AnchorStatus.Anchored;

            // Persist BlockchainProof record
            var proof = new BlockchainProof
            {
                ProofId = Guid.NewGuid(),
                EvidenceId = evidence.EvidenceId,
                AssetId = evidence.AssetId,
                EvidenceHash = calculatedHash,
                TransactionId = anchorResult.TransactionId,
                SignerIdentity = userId.ToString(),
                AnchoredAt = anchorResult.AnchoredAt ?? DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            };

            _db.BlockchainProofs.Add(proof);
            evidence.BlockchainProof = proof;
        }
        else
        {
            evidence.AnchorStatus = AnchorStatus.Failed;
        }

        await _db.SaveChangesAsync(cancellationToken);

        // 5. Record audit log
        await _auditLogs.LogAsync(
            action: evidence.AnchorStatus == AnchorStatus.Anchored ? "EvidenceSubmitted" : "EvidenceSubmissionFailed",
            userId: userId,
            entityType: "EvidenceRecord",
            entityId: evidence.EvidenceId.ToString(),
            details: JsonSerializer.Serialize(new
            {
                evidenceId = evidence.EvidenceId,
                evidenceHash = calculatedHash,
                anchorStatus = evidence.AnchorStatus.ToString(),
                transactionId = anchorResult.TransactionId,
                error = anchorResult.Error
            }),
            cancellationToken: cancellationToken);

        if (evidence.AnchorStatus == AnchorStatus.Failed)
        {
            throw new InvalidOperationException($"Blockchain anchoring failed: {anchorResult.Error ?? "Unknown error."}");
        }

        return MapToDto(evidence, mediaHashes);
    }

    public async Task<EvidenceVerificationResponseDto> VerifyEvidenceAsync(
        Guid evidenceId,
        CancellationToken cancellationToken = default)
    {
        var evidence = await _db.EvidenceRecords
            .AsNoTracking()
            .Include(e => e.MediaFiles)
            .Include(e => e.BlockchainProof)
            .SingleOrDefaultAsync(e => e.EvidenceId == evidenceId, cancellationToken);

        if (evidence == null)
        {
            throw new NotFoundException($"Evidence with ID '{evidenceId}' was not found.");
        }

        var mediaHashes = evidence.MediaFiles.Select(m => m.StorageUrl).ToList();
        var calculatedHash = _hasher.ComputeHash(evidence, mediaHashes);

        if (evidence.AnchorStatus != AnchorStatus.Anchored || evidence.BlockchainProof == null)
        {
            return new EvidenceVerificationResponseDto
            {
                EvidenceId = evidenceId,
                CalculatedHash = calculatedHash,
                TrustedHash = evidence.EvidenceHash,
                IsValid = false,
                Status = "PENDING",
                TransactionId = null,
                AnchoredAt = null,
                Error = "Evidence has not been anchored on the blockchain ledger yet."
            };
        }

        var adapter = _serviceProvider.GetService<IBlockchainAdapter>();
        if (adapter == null)
        {
            // Database-level verification fallback if ledger adapter is unavailable
            bool dbMatches = string.Equals(calculatedHash, evidence.BlockchainProof.EvidenceHash, StringComparison.OrdinalIgnoreCase);
            return new EvidenceVerificationResponseDto
            {
                EvidenceId = evidenceId,
                CalculatedHash = calculatedHash,
                TrustedHash = evidence.BlockchainProof.EvidenceHash,
                IsValid = dbMatches,
                Status = dbMatches ? "VERIFIED" : "INTEGRITY_MISMATCH",
                TransactionId = evidence.BlockchainProof.TransactionId,
                AnchoredAt = evidence.BlockchainProof.AnchoredAt,
                Error = dbMatches ? null : "Local calculated hash does not match stored proof hash."
            };
        }

        var verifyResult = await adapter.VerifyEvidenceAsync(new VerifyEvidenceParams
        {
            EvidenceId = evidenceId,
            CalculatedHash = calculatedHash
        }, cancellationToken);

        return new EvidenceVerificationResponseDto
        {
            EvidenceId = evidenceId,
            CalculatedHash = calculatedHash,
            TrustedHash = verifyResult.TrustedHash ?? evidence.BlockchainProof.EvidenceHash,
            IsValid = verifyResult.IsValid,
            Status = verifyResult.Status,
            TransactionId = verifyResult.TransactionId ?? evidence.BlockchainProof.TransactionId,
            AnchoredAt = evidence.BlockchainProof.AnchoredAt,
            Error = verifyResult.Error
        };
    }

    private static EvidenceDto MapToDto(EvidenceRecord record, IList<string> mediaHashes)
    {
        return new EvidenceDto
        {
            EvidenceId = record.EvidenceId,
            AssetId = record.AssetId,
            UserId = record.UserId,
            ActivityType = record.ActivityType,
            Timestamp = record.Timestamp,
            Latitude = record.Latitude,
            Longitude = record.Longitude,
            Description = record.Description,
            MediaHashes = mediaHashes,
            AnchorStatus = record.AnchorStatus,
            EvidenceHash = record.EvidenceHash,
            CreatedAt = record.CreatedAt,
            UpdatedAt = null
        };
    }

    private static MediaFileType InferMediaFileType(string fileName, string contentType)
    {
        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        var mime = (contentType ?? string.Empty).ToLowerInvariant();

        if (mime.StartsWith("image/") || ext is ".jpg" or ".jpeg" or ".png" or ".gif" or ".bmp" or ".webp" or ".svg")
        {
            return MediaFileType.Image;
        }

        if (mime.StartsWith("video/") || ext is ".mp4" or ".avi" or ".mov" or ".mkv" or ".webm")
        {
            return MediaFileType.Video;
        }

        return MediaFileType.Document;
    }
}
