using System.Security.Cryptography;
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
    private readonly INotificationService _notificationService;

    public EvidenceService(
        AppDbContext db,
        IEvidenceHasher hasher,
        IAuditLogService auditLogs,
        IFileStorageService storageService,
        IServiceProvider serviceProvider,
        INotificationService notificationService)
    {
        _db = db;
        _hasher = hasher;
        _auditLogs = auditLogs;
        _storageService = storageService;
        _serviceProvider = serviceProvider;
        _notificationService = notificationService;
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

        var lat = request.Latitude ?? request.Location?.Latitude;
        var lng = request.Longitude ?? request.Location?.Longitude;

        // 3. Validate coordinates range
        if (lat.HasValue && (lat < -90m || lat > 90m))
        {
            throw new ValidationException("Latitude must be between -90 and 90 degrees.");
        }

        if (lng.HasValue && (lng < -180m || lng > 180m))
        {
            throw new ValidationException("Longitude must be between -180 and 180 degrees.");
        }

        // 4. Validate description
        if (string.IsNullOrWhiteSpace(request.Description))
        {
            throw new ValidationException("Description cannot be empty.");
        }

        // 5. Lookup assigned manager if not provided
        var assignedMgrId = request.AssignedManagerId;
        if (!assignedMgrId.HasValue)
        {
            assignedMgrId = await _db.UserRoles
                .Include(ur => ur.Role)
                .Where(ur => ur.Role.Name == AppRoles.Manager)
                .Select(ur => (Guid?)ur.UserId)
                .FirstOrDefaultAsync(cancellationToken);
        }

        // 6. Create Draft Evidence Record
        var evidence = new EvidenceRecord
        {
            EvidenceId = Guid.NewGuid(),
            AssetId = request.AssetId,
            UserId = userId,
            AssignedManagerId = assignedMgrId,
            ActivityType = request.ActivityType,
            Timestamp = request.Timestamp.ToUniversalTime(),
            Latitude = lat,
            Longitude = lng,
            Description = request.Description.Trim(),
            EvidenceHash = null,
            AnchorStatus = AnchorStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };

        _db.EvidenceRecords.Add(evidence);
        await _db.SaveChangesAsync(cancellationToken);

        if (assignedMgrId.HasValue)
        {
            await _notificationService.CreateNotificationAsync(
                assignedMgrId.Value,
                "Verification Requested",
                $"New evidence captured for asset {asset.Name} requires your verification.",
                "VerificationRequest",
                evidence.EvidenceId,
                cancellationToken
            );
        }

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
            .Include(e => e.Asset)
            .Include(e => e.User)
                .ThenInclude(u => u!.UserRoles)
                    .ThenInclude(ur => ur.Role)
            .Include(e => e.AssignedManager)
            .Include(e => e.BlockchainProof)
            .SingleOrDefaultAsync(e => e.EvidenceId == evidenceId, cancellationToken);

        if (evidence == null)
            return null;

        var mediaHashes = evidence.MediaFiles
            .Where(m => !string.IsNullOrWhiteSpace(m.FileHash))
            .Select(m => m.FileHash!)
            .ToList();

        var evidenceIdStr = evidenceId.ToString();
        var verificationLog = await _db.AuditLogs
            .AsNoTracking()
            .Include(l => l.User)
            .Where(l => l.Action == "EvidenceVerified" && l.EntityId == evidenceIdStr)
            .OrderByDescending(l => l.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        string verificationStatus = evidence.AnchorStatus == AnchorStatus.Pending ? "DRAFT" : "PENDING_VERIFICATION";
        DateTime? verifiedAt = null;
        string? verifiedBy = null;

        if (verificationLog != null)
        {
            verifiedAt = verificationLog.CreatedAt;
            verifiedBy = verificationLog.User?.FullName ?? verificationLog.User?.Username ?? "Manager";
            if (!string.IsNullOrWhiteSpace(verificationLog.Details))
            {
                try
                {
                    using var doc = JsonDocument.Parse(verificationLog.Details);
                    if (doc.RootElement.TryGetProperty("status", out var statusEl))
                    {
                        verificationStatus = statusEl.GetString() ?? "VERIFIED";
                    }
                    else
                    {
                        verificationStatus = "VERIFIED";
                    }
                }
                catch
                {
                    verificationStatus = "VERIFIED";
                }
            }
            else
            {
                verificationStatus = "VERIFIED";
            }
        }

        return MapToDto(evidence, mediaHashes, verificationStatus, verifiedAt, verifiedBy);
    }

    public async Task<PagedResult<EvidenceDto>> GetEvidenceAsync(
        EvidenceFilterParams filterParams,
        CancellationToken cancellationToken = default)
    {
        var page = filterParams.Page < 1 ? 1 : filterParams.Page;
        var pageSize = filterParams.PageSize < 1 ? 20 : (filterParams.PageSize > 100 ? 100 : filterParams.PageSize);

        IQueryable<EvidenceRecord> q = _db.EvidenceRecords
            .AsNoTracking()
            .Include(e => e.MediaFiles)
            .Include(e => e.Asset)
            .Include(e => e.User)
                .ThenInclude(u => u!.UserRoles)
                    .ThenInclude(ur => ur.Role)
            .Include(e => e.AssignedManager)
            .Include(e => e.BlockchainProof);

        if (filterParams.AssetId.HasValue && filterParams.AssetId.Value != Guid.Empty)
        {
            q = q.Where(e => e.AssetId == filterParams.AssetId.Value);
        }

        if (filterParams.UserId.HasValue && filterParams.UserId.Value != Guid.Empty)
        {
            q = q.Where(e => e.UserId == filterParams.UserId.Value);
        }

        if (filterParams.AssignedManagerId.HasValue && filterParams.AssignedManagerId.Value != Guid.Empty)
        {
            q = q.Where(e => e.AssignedManagerId == filterParams.AssignedManagerId.Value);
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

        var itemIds = items.Select(e => e.EvidenceId.ToString()).ToList();
        var verificationLogs = await _db.AuditLogs
            .AsNoTracking()
            .Include(l => l.User)
            .Where(l => l.Action == "EvidenceVerified" && l.EntityId != null && itemIds.Contains(l.EntityId))
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync(cancellationToken);

        var verificationMap = verificationLogs
            .GroupBy(l => l.EntityId!)
            .ToDictionary(g => g.Key, g => g.First());

        var dtos = items.Select(e =>
        {
            var idStr = e.EvidenceId.ToString();
            string vStatus = e.AnchorStatus == AnchorStatus.Pending ? "DRAFT" : "PENDING_VERIFICATION";
            DateTime? vAt = null;
            string? vBy = null;

            if (verificationMap.TryGetValue(idStr, out var log))
            {
                vAt = log.CreatedAt;
                vBy = log.User?.FullName ?? log.User?.Username ?? "Manager";
                if (!string.IsNullOrWhiteSpace(log.Details))
                {
                    try
                    {
                        using var doc = JsonDocument.Parse(log.Details);
                        if (doc.RootElement.TryGetProperty("status", out var sEl))
                            vStatus = sEl.GetString() ?? "VERIFIED";
                        else
                            vStatus = "VERIFIED";
                    }
                    catch
                    {
                        vStatus = "VERIFIED";
                    }
                }
                else
                {
                    vStatus = "VERIFIED";
                }
            }

            return MapToDto(e, e.MediaFiles
                .Where(m => !string.IsNullOrWhiteSpace(m.FileHash))
                .Select(m => m.FileHash!)
                .ToList(), vStatus, vAt, vBy);
        }).ToList();

        if (!string.IsNullOrWhiteSpace(filterParams.VerificationStatus))
        {
            dtos = dtos.Where(d => string.Equals(d.VerificationStatus, filterParams.VerificationStatus, StringComparison.OrdinalIgnoreCase)).ToList();
        }

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
            fileHash: storedResult.FileHash,
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
            FileHash = fileHash,
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
            FileHash = media.FileHash,
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
            FileHash = m.FileHash,
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
            var existingMediaHashes = evidence.MediaFiles
                .Where(m => !string.IsNullOrWhiteSpace(m.FileHash))
                .Select(m => m.FileHash!)
                .ToList();
            return MapToDto(evidence, existingMediaHashes);
        }

        // 1. Gather media hashes from actual binary content (m.FileHash)
        var mediaHashes = new List<string>();
        foreach (var media in evidence.MediaFiles)
        {
            var hash = media.FileHash;
            if (string.IsNullOrWhiteSpace(hash))
            {
                // If FileHash was not stored previously, compute live from physical storage
                var storageKey = media.StorageUrl.StartsWith("/uploads/")
                    ? media.StorageUrl["/uploads/".Length..]
                    : media.StorageUrl.TrimStart('/');
                using var stream = await _storageService.GetFileStreamAsync(storageKey, cancellationToken);
                var hashBytes = await SHA256.HashDataAsync(stream, cancellationToken);
                hash = Convert.ToHexString(hashBytes).ToLowerInvariant();
                media.FileHash = hash;
            }
            mediaHashes.Add(hash);
        }

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
        Guid? userId = null,
        bool recordAudit = false,
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

        // 1. Re-read physical files from disk and recompute SHA-256 live
        var liveMediaHashes = new List<string>();
        bool physicalFileTampered = false;

        foreach (var media in evidence.MediaFiles)
        {
            string liveHash;
            try
            {
                var storageKey = media.StorageUrl.StartsWith("/uploads/")
                    ? media.StorageUrl["/uploads/".Length..]
                    : media.StorageUrl.TrimStart('/');
                using var stream = await _storageService.GetFileStreamAsync(storageKey, cancellationToken);
                var hashBytes = await SHA256.HashDataAsync(stream, cancellationToken);
                liveHash = Convert.ToHexString(hashBytes).ToLowerInvariant();
            }
            catch (Exception ex)
            {
                // Physical file missing or unreadable on disk
                var failedDto = new EvidenceVerificationResponseDto
                {
                    EvidenceId = evidenceId,
                    CalculatedHash = string.Empty,
                    TrustedHash = evidence.BlockchainProof?.EvidenceHash ?? evidence.EvidenceHash,
                    IsValid = false,
                    Status = "FAILED",
                    TransactionId = evidence.BlockchainProof?.TransactionId,
                    AnchoredAt = evidence.BlockchainProof?.AnchoredAt,
                    Error = $"Physical media file '{media.FileName}' could not be read from storage: {ex.Message}"
                };

                if (recordAudit || userId.HasValue)
                {
                    try
                    {
                        await _auditLogs.LogAsync(
                            action: "EvidenceVerified",
                            userId: userId,
                            entityType: "EvidenceRecord",
                            entityId: evidence.EvidenceId.ToString(),
                            details: JsonSerializer.Serialize(new
                            {
                                status = "FAILED",
                                errorType = "STORAGE_ERROR",
                                isValid = false,
                                calculatedHash = "",
                                trustedHash = failedDto.TrustedHash,
                                transactionId = failedDto.TransactionId,
                                error = failedDto.Error,
                                verifiedAt = DateTime.UtcNow
                            }),
                            cancellationToken: cancellationToken);
                    }
                    catch
                    {
                    }
                }

                return failedDto;
            }

            // Compare freshly computed live hash against stored FileHash
            if (!string.IsNullOrWhiteSpace(media.FileHash) &&
                !string.Equals(liveHash, media.FileHash, StringComparison.OrdinalIgnoreCase))
            {
                physicalFileTampered = true;
            }

            liveMediaHashes.Add(liveHash);
        }

        // 2. Recompute canonical evidence hash using freshly computed live media hashes
        var calculatedHash = _hasher.ComputeHash(evidence, liveMediaHashes);

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

        // If physical file tampering was detected on disk, report INTEGRITY_MISMATCH
        if (physicalFileTampered)
        {
            var mismatchDto = new EvidenceVerificationResponseDto
            {
                EvidenceId = evidenceId,
                CalculatedHash = calculatedHash,
                TrustedHash = evidence.BlockchainProof.EvidenceHash,
                IsValid = false,
                Status = "INTEGRITY_MISMATCH",
                TransactionId = evidence.BlockchainProof.TransactionId,
                AnchoredAt = evidence.BlockchainProof.AnchoredAt,
                Error = "INTEGRITY ALERT: Physical media file on disk has been modified or tampered with since anchoring."
            };

            if (recordAudit || userId.HasValue)
            {
                try
                {
                    await _auditLogs.LogAsync(
                        action: "EvidenceVerified",
                        userId: userId,
                        entityType: "EvidenceRecord",
                        entityId: evidence.EvidenceId.ToString(),
                        details: JsonSerializer.Serialize(new
                        {
                            status = "INTEGRITY_MISMATCH",
                            errorType = "FILE_TAMPERED",
                            isValid = false,
                            calculatedHash = mismatchDto.CalculatedHash,
                            trustedHash = mismatchDto.TrustedHash,
                            transactionId = mismatchDto.TransactionId,
                            error = mismatchDto.Error,
                            verifiedAt = DateTime.UtcNow
                        }),
                        cancellationToken: cancellationToken);
                }
                catch
                {
                }
            }

            return mismatchDto;
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

        bool isValid = verifyResult.IsValid;
        string status = verifyResult.Status;
        string? trustedHash = verifyResult.TrustedHash ?? evidence.BlockchainProof.EvidenceHash;

        if (status == "PROOF_NOT_FOUND" && evidence.BlockchainProof != null)
        {
            bool dbMatches = string.Equals(calculatedHash, evidence.BlockchainProof.EvidenceHash, StringComparison.OrdinalIgnoreCase);
            isValid = dbMatches;
            status = dbMatches ? "VERIFIED" : "INTEGRITY_MISMATCH";
            trustedHash = evidence.BlockchainProof.EvidenceHash;
        }

        var resultDto = new EvidenceVerificationResponseDto
        {
            EvidenceId = evidenceId,
            CalculatedHash = calculatedHash,
            TrustedHash = trustedHash,
            IsValid = isValid,
            Status = status,
            TransactionId = verifyResult.TransactionId ?? evidence.BlockchainProof?.TransactionId,
            AnchoredAt = evidence.BlockchainProof?.AnchoredAt,
            Error = isValid ? null : (status == "INTEGRITY_MISMATCH" ? "Cryptographic hash does not match anchored ledger proof." : verifyResult.Error)
        };

        if (recordAudit || userId.HasValue)
        {
            try
            {
                await _auditLogs.LogAsync(
                    action: "EvidenceVerified",
                    userId: userId,
                    entityType: "EvidenceRecord",
                    entityId: evidence.EvidenceId.ToString(),
                    details: JsonSerializer.Serialize(new
                    {
                        status = resultDto.Status,
                        isValid = resultDto.IsValid,
                        calculatedHash = resultDto.CalculatedHash,
                        trustedHash = resultDto.TrustedHash,
                        transactionId = resultDto.TransactionId,
                        verifiedAt = DateTime.UtcNow
                    }),
                    cancellationToken: cancellationToken);
            }
            catch
            {
                // Fallback: verification still returns even if audit logging fails
            }
        }

        // Notify technician of verification outcome
        if (evidence.UserId != Guid.Empty && (userId == null || userId.Value != evidence.UserId))
        {
            try
            {
                var notifTitle = isValid ? "Evidence Verified" : "Verification Failed";
                var notifMsg = isValid
                    ? $"Evidence #{evidence.EvidenceId.ToString()[..8]} was successfully verified and anchored."
                    : $"Verification failed for evidence #{evidence.EvidenceId.ToString()[..8]}: {resultDto.Error ?? "Integrity mismatch"}.";
                var notifType = isValid ? "EvidenceVerified" : "VerificationFailed";

                await _notificationService.CreateNotificationAsync(
                    evidence.UserId,
                    notifTitle,
                    notifMsg,
                    notifType,
                    evidence.EvidenceId,
                    cancellationToken
                );
            }
            catch
            {
                // Non-blocking notification dispatch
            }
        }

        return resultDto;
    }

    private static EvidenceDto MapToDto(
        EvidenceRecord record,
        IList<string> mediaHashes,
        string verificationStatus = "PENDING_VERIFICATION",
        DateTime? verifiedAt = null,
        string? verifiedBy = null)
    {
        if (record.AnchorStatus == AnchorStatus.Pending)
        {
            verificationStatus = "DRAFT";
        }

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
            AssetName = record.Asset?.Name,
            AssetCode = record.Asset?.AssetCode,
            UserName = record.User?.FullName ?? record.User?.Username,
            UserRole = record.User?.UserRoles?.Select(ur => ur.Role?.Name).FirstOrDefault(),
            CreatedAt = record.CreatedAt,
            UpdatedAt = null,
            VerificationStatus = verificationStatus,
            VerifiedAt = verifiedAt,
            VerifiedBy = verifiedBy,
            AssignedManagerId = record.AssignedManagerId,
            AssignedManagerName = record.AssignedManager?.FullName ?? record.AssignedManager?.Username,
            TransactionId = record.BlockchainProof?.TransactionId,
            AnchoredAt = record.BlockchainProof?.AnchoredAt
        };
    }

    public async Task<IReadOnlyList<AuditTrailEntryDto>> GetEvidenceAuditTrailAsync(
        Guid evidenceId,
        CancellationToken cancellationToken = default)
    {
        var evidenceIdStr = evidenceId.ToString();

        var logs = await _db.AuditLogs
            .AsNoTracking()
            .Include(l => l.User)
            .Where(l => (l.EntityType == "EvidenceRecord" || l.EntityType == "Evidence" || l.EntityType == "EvidenceMedia") 
                     && (l.EntityId == evidenceIdStr || (l.Details != null && l.Details.Contains(evidenceIdStr))))
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync(cancellationToken);

        var entries = new List<AuditTrailEntryDto>();

        foreach (var log in logs)
        {
            JsonElement? detailsEl = null;
            if (!string.IsNullOrWhiteSpace(log.Details))
            {
                try
                {
                    using var doc = JsonDocument.Parse(log.Details);
                    detailsEl = doc.RootElement.Clone();
                }
                catch
                {
                }
            }

            var performer = log.User?.FullName ?? log.User?.Username;
            if (string.IsNullOrWhiteSpace(performer))
            {
                performer = log.UserId.HasValue ? log.UserId.Value.ToString() : "System";
            }

            entries.Add(new AuditTrailEntryDto
            {
                Id = log.AuditLogId,
                EvidenceId = evidenceId,
                Action = log.Action,
                PerformedBy = performer,
                PerformedAt = log.CreatedAt,
                Details = detailsEl,
                IpAddress = log.IpAddress,
                UserAgent = null
            });
        }

        return entries;
    }

    public async Task<EvidenceVerificationResponseDto> GetEvidenceVerificationAsync(
        Guid evidenceId,
        CancellationToken cancellationToken = default)
    {
        var evidence = await _db.EvidenceRecords
            .AsNoTracking()
            .Include(e => e.BlockchainProof)
            .SingleOrDefaultAsync(e => e.EvidenceId == evidenceId, cancellationToken);

        if (evidence == null)
        {
            throw new NotFoundException($"Evidence with ID '{evidenceId}' was not found.");
        }

        var evidenceIdStr = evidenceId.ToString();
        var verificationLog = await _db.AuditLogs
            .AsNoTracking()
            .Include(l => l.User)
            .Where(l => l.Action == "EvidenceVerified" && l.EntityId == evidenceIdStr)
            .OrderByDescending(l => l.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (verificationLog != null && !string.IsNullOrWhiteSpace(verificationLog.Details))
        {
            try
            {
                using var doc = JsonDocument.Parse(verificationLog.Details);
                var root = doc.RootElement;
                string status = root.TryGetProperty("status", out var s) ? s.GetString() ?? "VERIFIED" : "VERIFIED";
                bool isValid = root.TryGetProperty("isValid", out var v) && v.GetBoolean();
                string calcHash = root.TryGetProperty("calculatedHash", out var ch) ? ch.GetString() ?? "" : "";
                string trustedHash = root.TryGetProperty("trustedHash", out var th) ? th.GetString() ?? "" : (evidence.BlockchainProof?.EvidenceHash ?? evidence.EvidenceHash ?? "");
                string? txId = root.TryGetProperty("transactionId", out var tx) ? tx.GetString() : evidence.BlockchainProof?.TransactionId;
                string? err = root.TryGetProperty("error", out var er) ? er.GetString() : null;

                return new EvidenceVerificationResponseDto
                {
                    EvidenceId = evidenceId,
                    CalculatedHash = calcHash,
                    TrustedHash = trustedHash,
                    IsValid = isValid,
                    Status = status,
                    TransactionId = txId,
                    AnchoredAt = evidence.BlockchainProof?.AnchoredAt,
                    Error = err
                };
            }
            catch
            {
            }
        }

        return new EvidenceVerificationResponseDto
        {
            EvidenceId = evidenceId,
            CalculatedHash = string.Empty,
            TrustedHash = evidence.BlockchainProof?.EvidenceHash ?? evidence.EvidenceHash,
            IsValid = false,
            Status = evidence.AnchorStatus == AnchorStatus.Anchored ? "PENDING_VERIFICATION" : "PENDING",
            TransactionId = evidence.BlockchainProof?.TransactionId,
            AnchoredAt = evidence.BlockchainProof?.AnchoredAt,
            Error = evidence.AnchorStatus != AnchorStatus.Anchored ? "Evidence has not been anchored on the blockchain ledger yet." : null
        };
    }

    public async Task<bool> RecordOperationalActionAsync(
        Guid evidenceId,
        string action,
        string? reason,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var evidence = await _db.EvidenceRecords
            .AsNoTracking()
            .SingleOrDefaultAsync(e => e.EvidenceId == evidenceId, cancellationToken);

        if (evidence == null)
        {
            throw new NotFoundException($"Evidence with ID '{evidenceId}' was not found.");
        }

        string auditAction = action.ToUpperInvariant() switch
        {
            "ESCALATE" => "EvidenceEscalated",
            "REQUEST_RECAPTURE" => "EvidenceRecaptureRequested",
            "ACKNOWLEDGE_MISMATCH" => "EvidenceMismatchAcknowledged",
            "FLAG_STORAGE_ISSUE" => "EvidenceStorageIssueFlagged",
            _ => $"EvidenceAction_{action}"
        };

        await _auditLogs.LogAsync(
            action: auditAction,
            userId: userId,
            entityType: "EvidenceRecord",
            entityId: evidenceId.ToString(),
            details: JsonSerializer.Serialize(new
            {
                action = action,
                reason = reason ?? "Operational action performed by manager.",
                timestamp = DateTime.UtcNow
            }),
            cancellationToken: cancellationToken);

        return true;
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
