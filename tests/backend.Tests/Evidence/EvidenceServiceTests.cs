using System.Text.Json;
using backend.Data;
using backend.DTOs.Blockchain;
using backend.DTOs.Evidence;
using backend.Exceptions;
using backend.Models;
using backend.Models.Enums;
using backend.Services;
using backend.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace backend.Tests.Evidence;

public class EvidenceServiceTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly AuditLogService _auditLogs;
    private readonly EvidenceHasher _hasher;
    private readonly ServiceCollection _services;
    private IServiceProvider _serviceProvider;
    private readonly EvidenceService _sut;

    private readonly Guid _userId;
    private readonly Guid _assetId;

    public EvidenceServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _db = new AppDbContext(options);
        _auditLogs = new AuditLogService(_db, NullLogger<AuditLogService>.Instance);
        _hasher = new EvidenceHasher();

        var storagePath = Path.Combine(Path.GetTempPath(), "iec_tests_" + Guid.NewGuid().ToString("N"));
        var storageOptions = Microsoft.Extensions.Options.Options.Create(new backend.Settings.FileStorageSettings { BasePath = storagePath });
        var storageService = new LocalFileStorageService(storageOptions, NullLogger<LocalFileStorageService>.Instance);

        _services = new ServiceCollection();
        _serviceProvider = _services.BuildServiceProvider();

        _sut = new EvidenceService(_db, _hasher, _auditLogs, storageService, _serviceProvider);

        var user = new User
        {
            UserId = Guid.NewGuid(),
            Username = "tech_user",
            Email = "tech@example.com",
            FullName = "Technician User",
            PasswordHash = "hash",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        var asset = new Asset
        {
            AssetId = Guid.NewGuid(),
            AssetCode = "ASSET-TEST-001",
            Name = "Centrifugal Pump",
            Category = "Equipment",
            Status = AssetStatus.Active,
            Specifications = "{}",
            CreatedByUserId = user.UserId,
            AssignedToUserId = user.UserId,
            CreatedAt = DateTime.UtcNow
        };

        _db.Users.Add(user);
        _db.Assets.Add(asset);
        _db.SaveChanges();

        _userId = user.UserId;
        _assetId = asset.AssetId;
    }

    [Fact]
    public async Task CreateEvidence_WithValidData_CreatesPendingRecordAndEmitsAuditLog()
    {
        var request = new CreateEvidenceRequestDto
        {
            AssetId = _assetId,
            ActivityType = ActivityType.Inspection,
            Timestamp = DateTime.UtcNow,
            Latitude = 12.345678m,
            Longitude = 77.123456m,
            Description = "Completed standard safety and pressure check."
        };

        var result = await _sut.CreateEvidenceAsync(request, _userId);

        Assert.NotNull(result);
        Assert.NotEqual(Guid.Empty, result.EvidenceId);
        Assert.Equal(_assetId, result.AssetId);
        Assert.Equal(_userId, result.UserId);
        Assert.Equal(ActivityType.Inspection, result.ActivityType);
        Assert.Equal(AnchorStatus.Pending, result.AnchorStatus);
        Assert.Null(result.EvidenceHash);
        Assert.Equal(12.345678m, result.Latitude);
        Assert.Equal(77.123456m, result.Longitude);

        // Verify database persistence
        var dbRecord = await _db.EvidenceRecords.SingleOrDefaultAsync(e => e.EvidenceId == result.EvidenceId);
        Assert.NotNull(dbRecord);
        Assert.Equal(AnchorStatus.Pending, dbRecord.AnchorStatus);

        // Verify audit log emission
        var auditLogs = await _db.AuditLogs.Where(l => l.EntityId == result.EvidenceId.ToString()).ToListAsync();
        Assert.Single(auditLogs);
        Assert.Equal("EvidenceCreated", auditLogs[0].Action);
        Assert.Equal(_userId, auditLogs[0].UserId);
    }

    [Fact]
    public async Task CreateEvidence_NonExistentAsset_ThrowsValidationException()
    {
        var request = new CreateEvidenceRequestDto
        {
            AssetId = Guid.NewGuid(),
            ActivityType = ActivityType.Inspection,
            Timestamp = DateTime.UtcNow,
            Description = "Invalid asset test"
        };

        await Assert.ThrowsAsync<ValidationException>(() => _sut.CreateEvidenceAsync(request, _userId));
    }

    [Fact]
    public async Task CreateEvidence_InvalidLatitudeLongitude_ThrowsValidationException()
    {
        var invalidLatRequest = new CreateEvidenceRequestDto
        {
            AssetId = _assetId,
            ActivityType = ActivityType.Maintenance,
            Timestamp = DateTime.UtcNow,
            Latitude = 120.0m, // Invalid latitude > 90
            Longitude = 77.0m,
            Description = "Bad latitude"
        };

        await Assert.ThrowsAsync<ValidationException>(() => _sut.CreateEvidenceAsync(invalidLatRequest, _userId));

        var invalidLngRequest = new CreateEvidenceRequestDto
        {
            AssetId = _assetId,
            ActivityType = ActivityType.Maintenance,
            Timestamp = DateTime.UtcNow,
            Latitude = 45.0m,
            Longitude = 200.0m, // Invalid longitude > 180
            Description = "Bad longitude"
        };

        await Assert.ThrowsAsync<ValidationException>(() => _sut.CreateEvidenceAsync(invalidLngRequest, _userId));
    }

    [Fact]
    public async Task GetEvidenceById_ReturnsEvidenceWithAttachedMedia()
    {
        var evidence = await _sut.CreateEvidenceAsync(new CreateEvidenceRequestDto
        {
            AssetId = _assetId,
            ActivityType = ActivityType.Maintenance,
            Timestamp = DateTime.UtcNow,
            Description = "Replaced sealing gasket"
        }, _userId);

        await _sut.AttachMediaAsync(
            evidence.EvidenceId,
            "valve_diagram.png",
            "image/png",
            "/uploads/2026/09/valve_diagram.png",
            10240,
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            _userId);

        var retrieved = await _sut.GetEvidenceByIdAsync(evidence.EvidenceId);

        Assert.NotNull(retrieved);
        Assert.Equal(evidence.EvidenceId, retrieved.EvidenceId);
        Assert.Single(retrieved.MediaHashes);
        Assert.Equal("/uploads/2026/09/valve_diagram.png", retrieved.MediaHashes[0]);
    }

    [Fact]
    public async Task GetEvidenceByAssetId_FiltersCorrectly()
    {
        var anotherAsset = new Asset
        {
            AssetId = Guid.NewGuid(),
            AssetCode = "ASSET-ANOTHER-99",
            Name = "Turbine",
            Category = "Machinery",
            Status = AssetStatus.Active,
            CreatedByUserId = _userId,
            AssignedToUserId = _userId,
            CreatedAt = DateTime.UtcNow
        };
        _db.Assets.Add(anotherAsset);
        await _db.SaveChangesAsync();

        // 2 records for asset 1
        await _sut.CreateEvidenceAsync(new CreateEvidenceRequestDto
        {
            AssetId = _assetId,
            ActivityType = ActivityType.Inspection,
            Timestamp = DateTime.UtcNow,
            Description = "Asset 1 Inspection"
        }, _userId);

        await _sut.CreateEvidenceAsync(new CreateEvidenceRequestDto
        {
            AssetId = _assetId,
            ActivityType = ActivityType.Maintenance,
            Timestamp = DateTime.UtcNow,
            Description = "Asset 1 Maintenance"
        }, _userId);

        // 1 record for asset 2
        await _sut.CreateEvidenceAsync(new CreateEvidenceRequestDto
        {
            AssetId = anotherAsset.AssetId,
            ActivityType = ActivityType.Inspection,
            Timestamp = DateTime.UtcNow,
            Description = "Asset 2 Inspection"
        }, _userId);

        var asset1Evidence = await _sut.GetEvidenceByAssetIdAsync(_assetId);
        Assert.Equal(2, asset1Evidence.Total);
        Assert.All(asset1Evidence.Items, e => Assert.Equal(_assetId, e.AssetId));

        var asset2Evidence = await _sut.GetEvidenceByAssetIdAsync(anotherAsset.AssetId);
        Assert.Equal(1, asset2Evidence.Total);
        Assert.Equal(anotherAsset.AssetId, asset2Evidence.Items[0].AssetId);
    }

    [Fact]
    public async Task AttachMedia_ToAnchoredEvidence_ThrowsConflictException()
    {
        var evidence = new EvidenceRecord
        {
            EvidenceId = Guid.NewGuid(),
            AssetId = _assetId,
            UserId = _userId,
            ActivityType = ActivityType.Audit,
            Timestamp = DateTime.UtcNow,
            Description = "Already anchored record",
            AnchorStatus = AnchorStatus.Anchored, // Already anchored
            EvidenceHash = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
            CreatedAt = DateTime.UtcNow
        };
        _db.EvidenceRecords.Add(evidence);
        await _db.SaveChangesAsync();

        await Assert.ThrowsAsync<ConflictException>(() => _sut.AttachMediaAsync(
            evidence.EvidenceId,
            "late_photo.jpg",
            "image/jpeg",
            "/uploads/late.jpg",
            2048,
            null,
            _userId));
    }

    [Fact]
    public async Task SubmitEvidence_WhenNoBlockchainAdapterRegistered_ThrowsInvalidOperationException()
    {
        var evidence = await _sut.CreateEvidenceAsync(new CreateEvidenceRequestDto
        {
            AssetId = _assetId,
            ActivityType = ActivityType.Inspection,
            Timestamp = DateTime.UtcNow,
            Description = "Test record awaiting adapter"
        }, _userId);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _sut.SubmitEvidenceAsync(evidence.EvidenceId, _userId));

        Assert.Contains("IBlockchainAdapter", ex.Message);
    }

    [Fact]
    public async Task UploadMediaAsync_ValidFile_StoresFileAndCreatesMediaRecord()
    {
        var evidence = await _sut.CreateEvidenceAsync(new CreateEvidenceRequestDto
        {
            AssetId = _assetId,
            ActivityType = ActivityType.Inspection,
            Timestamp = DateTime.UtcNow,
            Description = "Upload unit test"
        }, _userId);

        var fileBytes = "test image binary data"u8.ToArray();
        using var stream = new MemoryStream(fileBytes);

        var result = await _sut.UploadMediaAsync(
            evidenceId: evidence.EvidenceId,
            fileStream: stream,
            fileName: "sensor_chart.png",
            contentType: "image/png",
            fileSize: fileBytes.Length,
            userId: _userId);

        Assert.NotNull(result);
        Assert.Equal("sensor_chart.png", result.FileName);
        Assert.Equal(MediaFileType.Image, result.FileType);
        Assert.StartsWith("/uploads/", result.StorageUrl);
        Assert.False(result.StorageUrl.Contains("C:"), "StorageUrl must not expose absolute filesystem path");
        Assert.Equal(fileBytes.Length, result.FileSizeBytes);

        // Verify DB entity
        var mediaInDb = await _db.EvidenceMedia.SingleOrDefaultAsync(m => m.MediaId == result.MediaId);
        Assert.NotNull(mediaInDb);
        Assert.Equal(evidence.EvidenceId, mediaInDb.EvidenceId);

        // Verify Audit Log
        var audit = await _db.AuditLogs.SingleOrDefaultAsync(l => l.EntityId == result.MediaId.ToString());
        Assert.NotNull(audit);
        Assert.Equal("MediaAttached", audit.Action);
    }

    [Fact]
    public async Task UploadMediaAsync_UnsupportedExtension_ThrowsValidationException()
    {
        var evidence = await _sut.CreateEvidenceAsync(new CreateEvidenceRequestDto
        {
            AssetId = _assetId,
            ActivityType = ActivityType.Inspection,
            Timestamp = DateTime.UtcNow,
            Description = "Executable upload test"
        }, _userId);

        var fileBytes = new byte[] { 0x4D, 0x5A };
        using var stream = new MemoryStream(fileBytes);

        await Assert.ThrowsAsync<ValidationException>(() => _sut.UploadMediaAsync(
            evidenceId: evidence.EvidenceId,
            fileStream: stream,
            fileName: "malware.exe",
            contentType: "application/octet-stream",
            fileSize: fileBytes.Length,
            userId: _userId));
    }

    [Fact]
    public async Task UploadMediaAsync_ZeroByteFile_ThrowsValidationException()
    {
        var evidence = await _sut.CreateEvidenceAsync(new CreateEvidenceRequestDto
        {
            AssetId = _assetId,
            ActivityType = ActivityType.Inspection,
            Timestamp = DateTime.UtcNow,
            Description = "Empty file test"
        }, _userId);

        using var stream = new MemoryStream();

        await Assert.ThrowsAsync<ValidationException>(() => _sut.UploadMediaAsync(
            evidenceId: evidence.EvidenceId,
            fileStream: stream,
            fileName: "empty.png",
            contentType: "image/png",
            fileSize: 0,
            userId: _userId));
    }

    [Fact]
    public async Task UploadMediaAsync_OversizedFile_ThrowsValidationException()
    {
        var evidence = await _sut.CreateEvidenceAsync(new CreateEvidenceRequestDto
        {
            AssetId = _assetId,
            ActivityType = ActivityType.Inspection,
            Timestamp = DateTime.UtcNow,
            Description = "Oversized file test"
        }, _userId);

        using var stream = new MemoryStream(new byte[100]);

        await Assert.ThrowsAsync<ValidationException>(() => _sut.UploadMediaAsync(
            evidenceId: evidence.EvidenceId,
            fileStream: stream,
            fileName: "huge_video.mp4",
            contentType: "video/mp4",
            fileSize: 100 * 1024 * 1024, // 100 MB > 50 MB limit
            userId: _userId));
    }

    [Fact]
    public async Task SubmitEvidence_WithBlockchainAdapter_ComputesHashAndAnchorsProof()
    {
        var mockAdapter = new TestBlockchainAdapter();
        var customServices = new ServiceCollection();
        customServices.AddSingleton<IBlockchainAdapter>(mockAdapter);
        var customProvider = customServices.BuildServiceProvider();

        var storagePath = Path.Combine(Path.GetTempPath(), "iec_tests_" + Guid.NewGuid().ToString("N"));
        var storageOptions = Microsoft.Extensions.Options.Options.Create(new backend.Settings.FileStorageSettings { BasePath = storagePath });
        var storageService = new LocalFileStorageService(storageOptions, NullLogger<LocalFileStorageService>.Instance);

        var sutWithAdapter = new EvidenceService(_db, _hasher, _auditLogs, storageService, customProvider);

        var evidence = await sutWithAdapter.CreateEvidenceAsync(new CreateEvidenceRequestDto
        {
            AssetId = _assetId,
            ActivityType = ActivityType.Inspection,
            Timestamp = DateTime.UtcNow,
            Latitude = 12.345678m,
            Longitude = 77.123456m,
            Description = "Ready for anchoring"
        }, _userId);

        var submitted = await sutWithAdapter.SubmitEvidenceAsync(evidence.EvidenceId, _userId);

        Assert.NotNull(submitted.EvidenceHash);
        Assert.Equal(64, submitted.EvidenceHash.Length);
        Assert.Equal(AnchorStatus.Anchored, submitted.AnchorStatus);

        // Verify BlockchainProof record was persisted
        var proof = await _db.BlockchainProofs.SingleOrDefaultAsync(p => p.EvidenceId == evidence.EvidenceId);
        Assert.NotNull(proof);
        Assert.Equal("TX-MOCK-12345", proof.TransactionId);
        Assert.Equal(submitted.EvidenceHash, proof.EvidenceHash);

        // Verify Idempotency: Submitting again does not throw or duplicate
        var reSubmitted = await sutWithAdapter.SubmitEvidenceAsync(evidence.EvidenceId, _userId);
        Assert.Equal(submitted.EvidenceHash, reSubmitted.EvidenceHash);
        Assert.Equal(AnchorStatus.Anchored, reSubmitted.AnchorStatus);

        var proofCount = await _db.BlockchainProofs.CountAsync(p => p.EvidenceId == evidence.EvidenceId);
        Assert.Equal(1, proofCount);
    }

    [Fact]
    public async Task VerifyEvidence_WhenAnchored_ReturnsVerifiedStatus()
    {
        var mockAdapter = new TestBlockchainAdapter();
        var customServices = new ServiceCollection();
        customServices.AddSingleton<IBlockchainAdapter>(mockAdapter);
        var customProvider = customServices.BuildServiceProvider();

        var storagePath = Path.Combine(Path.GetTempPath(), "iec_tests_" + Guid.NewGuid().ToString("N"));
        var storageOptions = Microsoft.Extensions.Options.Options.Create(new backend.Settings.FileStorageSettings { BasePath = storagePath });
        var storageService = new LocalFileStorageService(storageOptions, NullLogger<LocalFileStorageService>.Instance);

        var sutWithAdapter = new EvidenceService(_db, _hasher, _auditLogs, storageService, customProvider);

        var evidence = await sutWithAdapter.CreateEvidenceAsync(new CreateEvidenceRequestDto
        {
            AssetId = _assetId,
            ActivityType = ActivityType.Quality,
            Timestamp = DateTime.UtcNow,
            Description = "Calibration log"
        }, _userId);

        await sutWithAdapter.SubmitEvidenceAsync(evidence.EvidenceId, _userId);

        var verification = await sutWithAdapter.VerifyEvidenceAsync(evidence.EvidenceId);

        Assert.NotNull(verification);
        Assert.True(verification.IsValid);
        Assert.Equal("VERIFIED", verification.Status);
        Assert.Equal("TX-MOCK-12345", verification.TransactionId);
        Assert.Equal(verification.CalculatedHash, verification.TrustedHash);
        Assert.Null(verification.Error);
    }

    [Fact]
    public async Task VerifyEvidence_WhenIntegrityMismatch_ReturnsIntegrityMismatchStatus()
    {
        var mockAdapter = new MismatchBlockchainAdapter();
        var customServices = new ServiceCollection();
        customServices.AddSingleton<IBlockchainAdapter>(mockAdapter);
        var customProvider = customServices.BuildServiceProvider();

        var storagePath = Path.Combine(Path.GetTempPath(), "iec_tests_" + Guid.NewGuid().ToString("N"));
        var storageOptions = Microsoft.Extensions.Options.Options.Create(new backend.Settings.FileStorageSettings { BasePath = storagePath });
        var storageService = new LocalFileStorageService(storageOptions, NullLogger<LocalFileStorageService>.Instance);

        var sutWithAdapter = new EvidenceService(_db, _hasher, _auditLogs, storageService, customProvider);

        var evidence = await sutWithAdapter.CreateEvidenceAsync(new CreateEvidenceRequestDto
        {
            AssetId = _assetId,
            ActivityType = ActivityType.Inspection,
            Timestamp = DateTime.UtcNow,
            Description = "Integrity mismatch test"
        }, _userId);

        await sutWithAdapter.SubmitEvidenceAsync(evidence.EvidenceId, _userId);

        var verification = await sutWithAdapter.VerifyEvidenceAsync(evidence.EvidenceId);

        Assert.NotNull(verification);
        Assert.False(verification.IsValid);
        Assert.Equal("INTEGRITY_MISMATCH", verification.Status);
        Assert.NotNull(verification.CalculatedHash);
        Assert.NotNull(verification.TrustedHash);
        Assert.NotEqual(verification.CalculatedHash, verification.TrustedHash);
        Assert.NotNull(verification.Error);
    }

    [Fact]
    public async Task VerifyEvidence_WhenProofNotFound_ReturnsProofNotFoundStatus()
    {
        var mockAdapter = new MissingProofBlockchainAdapter();
        var customServices = new ServiceCollection();
        customServices.AddSingleton<IBlockchainAdapter>(mockAdapter);
        var customProvider = customServices.BuildServiceProvider();

        var storagePath = Path.Combine(Path.GetTempPath(), "iec_tests_" + Guid.NewGuid().ToString("N"));
        var storageOptions = Microsoft.Extensions.Options.Options.Create(new backend.Settings.FileStorageSettings { BasePath = storagePath });
        var storageService = new LocalFileStorageService(storageOptions, NullLogger<LocalFileStorageService>.Instance);

        var sutWithAdapter = new EvidenceService(_db, _hasher, _auditLogs, storageService, customProvider);

        var evidence = await sutWithAdapter.CreateEvidenceAsync(new CreateEvidenceRequestDto
        {
            AssetId = _assetId,
            ActivityType = ActivityType.Inspection,
            Timestamp = DateTime.UtcNow,
            Description = "Missing proof test"
        }, _userId);

        await sutWithAdapter.SubmitEvidenceAsync(evidence.EvidenceId, _userId);

        var verification = await sutWithAdapter.VerifyEvidenceAsync(evidence.EvidenceId);

        Assert.NotNull(verification);
        Assert.False(verification.IsValid);
        Assert.Equal("PROOF_NOT_FOUND", verification.Status);
        Assert.NotNull(verification.Error);
    }

    [Fact]
    public async Task VerifyEvidence_WhenAdapterFails_ReturnsFailedStatus()
    {
        var mockAdapter = new FailingBlockchainAdapter();
        var customServices = new ServiceCollection();
        customServices.AddSingleton<IBlockchainAdapter>(mockAdapter);
        var customProvider = customServices.BuildServiceProvider();

        var storagePath = Path.Combine(Path.GetTempPath(), "iec_tests_" + Guid.NewGuid().ToString("N"));
        var storageOptions = Microsoft.Extensions.Options.Options.Create(new backend.Settings.FileStorageSettings { BasePath = storagePath });
        var storageService = new LocalFileStorageService(storageOptions, NullLogger<LocalFileStorageService>.Instance);

        var sutWithAdapter = new EvidenceService(_db, _hasher, _auditLogs, storageService, customProvider);

        var evidence = await sutWithAdapter.CreateEvidenceAsync(new CreateEvidenceRequestDto
        {
            AssetId = _assetId,
            ActivityType = ActivityType.Inspection,
            Timestamp = DateTime.UtcNow,
            Description = "Adapter failure test"
        }, _userId);

        await sutWithAdapter.SubmitEvidenceAsync(evidence.EvidenceId, _userId);

        var verification = await sutWithAdapter.VerifyEvidenceAsync(evidence.EvidenceId);

        Assert.NotNull(verification);
        Assert.False(verification.IsValid);
        Assert.Equal("FAILED", verification.Status);
        Assert.NotNull(verification.Error);
    }

    [Fact]
    public async Task VerifyEvidence_WhenNonExistent_ThrowsNotFoundException()
    {
        var nonExistentId = Guid.NewGuid();
        await Assert.ThrowsAsync<NotFoundException>(() => _sut.VerifyEvidenceAsync(nonExistentId));
    }

    [Fact]
    public async Task VerifyEvidence_WhenPendingNotAnchored_ReturnsPendingStatus()
    {
        var evidence = await _sut.CreateEvidenceAsync(new CreateEvidenceRequestDto
        {
            AssetId = _assetId,
            ActivityType = ActivityType.Maintenance,
            Timestamp = DateTime.UtcNow,
            Description = "Draft evidence"
        }, _userId);

        var verification = await _sut.VerifyEvidenceAsync(evidence.EvidenceId);

        Assert.NotNull(verification);
        Assert.False(verification.IsValid);
        Assert.Equal("PENDING", verification.Status);
        Assert.Null(verification.TransactionId);
        Assert.NotNull(verification.CalculatedHash);
        Assert.NotNull(verification.Error);
    }

    [Fact]
    public async Task VerifyEvidence_RepeatedCalls_IsSafeAndIdempotent()
    {
        var mockAdapter = new TestBlockchainAdapter();
        var customServices = new ServiceCollection();
        customServices.AddSingleton<IBlockchainAdapter>(mockAdapter);
        var customProvider = customServices.BuildServiceProvider();

        var storagePath = Path.Combine(Path.GetTempPath(), "iec_tests_" + Guid.NewGuid().ToString("N"));
        var storageOptions = Microsoft.Extensions.Options.Options.Create(new backend.Settings.FileStorageSettings { BasePath = storagePath });
        var storageService = new LocalFileStorageService(storageOptions, NullLogger<LocalFileStorageService>.Instance);

        var sutWithAdapter = new EvidenceService(_db, _hasher, _auditLogs, storageService, customProvider);

        var evidence = await sutWithAdapter.CreateEvidenceAsync(new CreateEvidenceRequestDto
        {
            AssetId = _assetId,
            ActivityType = ActivityType.Audit,
            Timestamp = DateTime.UtcNow,
            Description = "Idempotency test"
        }, _userId);

        await sutWithAdapter.SubmitEvidenceAsync(evidence.EvidenceId, _userId);

        var verify1 = await sutWithAdapter.VerifyEvidenceAsync(evidence.EvidenceId);
        var verify2 = await sutWithAdapter.VerifyEvidenceAsync(evidence.EvidenceId);

        Assert.Equal(verify1.IsValid, verify2.IsValid);
        Assert.Equal(verify1.Status, verify2.Status);
        Assert.Equal(verify1.CalculatedHash, verify2.CalculatedHash);
        Assert.Equal(verify1.TrustedHash, verify2.TrustedHash);
        Assert.Equal(verify1.TransactionId, verify2.TransactionId);
    }

    [Fact]
    public async Task SubmitAndVerify_WithMockBlockchainAdapter_FullLifecycleWorks()
    {
        var realMockAdapter = new MockBlockchainAdapter(NullLogger<MockBlockchainAdapter>.Instance);
        var customServices = new ServiceCollection();
        customServices.AddSingleton<IBlockchainAdapter>(realMockAdapter);
        var customProvider = customServices.BuildServiceProvider();

        var storagePath = Path.Combine(Path.GetTempPath(), "iec_tests_" + Guid.NewGuid().ToString("N"));
        var storageOptions = Microsoft.Extensions.Options.Options.Create(new backend.Settings.FileStorageSettings { BasePath = storagePath });
        var storageService = new LocalFileStorageService(storageOptions, NullLogger<LocalFileStorageService>.Instance);

        var sutWithAdapter = new EvidenceService(_db, _hasher, _auditLogs, storageService, customProvider);

        var evidence = await sutWithAdapter.CreateEvidenceAsync(new CreateEvidenceRequestDto
        {
            AssetId = _assetId,
            ActivityType = ActivityType.Inspection,
            Timestamp = DateTime.UtcNow,
            Latitude = 45.123m,
            Longitude = -73.456m,
            Description = "Full lifecycle with MockBlockchainAdapter"
        }, _userId);

        var submitted = await sutWithAdapter.SubmitEvidenceAsync(evidence.EvidenceId, _userId);
        Assert.Equal(AnchorStatus.Anchored, submitted.AnchorStatus);
        Assert.NotNull(submitted.EvidenceHash);

        var verified = await sutWithAdapter.VerifyEvidenceAsync(evidence.EvidenceId);
        Assert.True(verified.IsValid);
        Assert.Equal("VERIFIED", verified.Status);
        Assert.Equal(submitted.EvidenceHash, verified.CalculatedHash);
        Assert.Equal(submitted.EvidenceHash, verified.TrustedHash);
        Assert.NotNull(verified.TransactionId);

        // Confirm proof exists in adapter
        var proof = await realMockAdapter.GetEvidenceProofAsync(evidence.EvidenceId);
        Assert.NotNull(proof);
        Assert.Equal(submitted.EvidenceHash, proof.EvidenceHash);
    }

    public void Dispose() => _db.Dispose();

    private class TestBlockchainAdapter : IBlockchainAdapter
    {
        public Task<AnchorEvidenceResult> AnchorEvidenceAsync(AnchorEvidenceParams parameters, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(new AnchorEvidenceResult
            {
                Status = "ANCHORED",
                TransactionId = "TX-MOCK-12345",
                ProofReference = $"proof-{parameters.EvidenceId}",
                AnchoredAt = DateTime.UtcNow
            });
        }

        public Task<VerifyEvidenceResult> VerifyEvidenceAsync(VerifyEvidenceParams parameters, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(new VerifyEvidenceResult
            {
                IsValid = true,
                Status = "VERIFIED",
                CalculatedHash = parameters.CalculatedHash,
                TrustedHash = parameters.CalculatedHash,
                TransactionId = "TX-MOCK-12345"
            });
        }

        public Task<EvidenceProof?> GetEvidenceProofAsync(Guid evidenceId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<EvidenceProof?>(new EvidenceProof
            {
                EvidenceId = evidenceId,
                TransactionId = "TX-MOCK-12345",
                AnchoredAt = DateTime.UtcNow
            });
        }
    }

    private class MismatchBlockchainAdapter : IBlockchainAdapter
    {
        public Task<AnchorEvidenceResult> AnchorEvidenceAsync(AnchorEvidenceParams parameters, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(new AnchorEvidenceResult
            {
                Status = "ANCHORED",
                TransactionId = "TX-MISMATCH-123",
                ProofReference = $"proof-{parameters.EvidenceId}",
                AnchoredAt = DateTime.UtcNow
            });
        }

        public Task<VerifyEvidenceResult> VerifyEvidenceAsync(VerifyEvidenceParams parameters, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(new VerifyEvidenceResult
            {
                IsValid = false,
                Status = "INTEGRITY_MISMATCH",
                CalculatedHash = parameters.CalculatedHash,
                TrustedHash = "trusted-different-hash-value-000000000000000000000000000000000000",
                TransactionId = "TX-MISMATCH-123",
                Error = "Calculated hash does not match trusted hash on ledger."
            });
        }

        public Task<EvidenceProof?> GetEvidenceProofAsync(Guid evidenceId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<EvidenceProof?>(null);
        }
    }

    private class MissingProofBlockchainAdapter : IBlockchainAdapter
    {
        public Task<AnchorEvidenceResult> AnchorEvidenceAsync(AnchorEvidenceParams parameters, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(new AnchorEvidenceResult
            {
                Status = "ANCHORED",
                TransactionId = "TX-MISSING-123",
                ProofReference = $"proof-{parameters.EvidenceId}",
                AnchoredAt = DateTime.UtcNow
            });
        }

        public Task<VerifyEvidenceResult> VerifyEvidenceAsync(VerifyEvidenceParams parameters, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(new VerifyEvidenceResult
            {
                IsValid = false,
                Status = "PROOF_NOT_FOUND",
                CalculatedHash = parameters.CalculatedHash,
                TrustedHash = null,
                TransactionId = null,
                Error = "Proof not found on blockchain."
            });
        }

        public Task<EvidenceProof?> GetEvidenceProofAsync(Guid evidenceId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<EvidenceProof?>(null);
        }
    }

    private class FailingBlockchainAdapter : IBlockchainAdapter
    {
        public Task<AnchorEvidenceResult> AnchorEvidenceAsync(AnchorEvidenceParams parameters, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(new AnchorEvidenceResult
            {
                Status = "ANCHORED",
                TransactionId = "TX-FAIL-123",
                ProofReference = $"proof-{parameters.EvidenceId}",
                AnchoredAt = DateTime.UtcNow
            });
        }

        public Task<VerifyEvidenceResult> VerifyEvidenceAsync(VerifyEvidenceParams parameters, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(new VerifyEvidenceResult
            {
                IsValid = false,
                Status = "FAILED",
                CalculatedHash = parameters.CalculatedHash,
                TrustedHash = null,
                TransactionId = null,
                Error = "Blockchain connection timeout."
            });
        }

        public Task<EvidenceProof?> GetEvidenceProofAsync(Guid evidenceId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<EvidenceProof?>(null);
        }
    }
}
