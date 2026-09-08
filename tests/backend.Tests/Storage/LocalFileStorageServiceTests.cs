using System.Text;
using backend.Exceptions;
using backend.Models.Enums;
using backend.Services;
using backend.Settings;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace backend.Tests.Storage;

public class LocalFileStorageServiceTests : IDisposable
{
    private readonly string _testTempDir;
    private readonly LocalFileStorageService _sut;

    public LocalFileStorageServiceTests()
    {
        _testTempDir = Path.Combine(Path.GetTempPath(), "iec_test_storage_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_testTempDir);

        var options = Options.Create(new FileStorageSettings
        {
            BasePath = _testTempDir
        });

        _sut = new LocalFileStorageService(options, NullLogger<LocalFileStorageService>.Instance);
    }

    [Fact]
    public async Task StoreAsync_ValidFile_StoresFileAndReturnsExpectedMetadata()
    {
        var sampleBytes = Encoding.UTF8.GetBytes("Sample evidence media content.");
        using var stream = new MemoryStream(sampleBytes);

        var result = await _sut.StoreAsync(stream, "test_inspection.png", "image/png");

        Assert.NotNull(result);
        Assert.False(string.IsNullOrWhiteSpace(result.StorageKey));
        Assert.Contains("test_inspection.png", result.StorageKey);
        Assert.Equal("test_inspection.png", result.FileName);
        Assert.Equal("image/png", result.ContentType);
        Assert.Equal(MediaFileType.Image, result.FileType);
        Assert.Equal(sampleBytes.Length, result.FileSizeBytes);
        var expectedHash = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(sampleBytes)).ToLowerInvariant();
        Assert.Equal(expectedHash, result.FileHash);
        Assert.Equal(64, result.FileHash.Length);
        Assert.StartsWith("/uploads/", result.StorageUrl);
        Assert.True(result.StoredAt <= DateTime.UtcNow);
    }

    [Fact]
    public async Task GetFileStreamAsync_ExistingFile_ReturnsReadableContent()
    {
        var contentString = "Vibration analysis report log content.";
        var sampleBytes = Encoding.UTF8.GetBytes(contentString);
        using var uploadStream = new MemoryStream(sampleBytes);

        var stored = await _sut.StoreAsync(uploadStream, "report.pdf", "application/pdf");

        using var retrievedStream = await _sut.GetFileStreamAsync(stored.StorageKey);
        using var reader = new StreamReader(retrievedStream);
        var readContent = await reader.ReadToEndAsync();

        Assert.Equal(contentString, readContent);
    }

    [Fact]
    public async Task GetFileStreamAsync_NonExistentKey_ThrowsNotFoundException()
    {
        await Assert.ThrowsAsync<NotFoundException>(() =>
            _sut.GetFileStreamAsync("2026/09/non_existent_file.pdf"));
    }

    [Theory]
    [InlineData("../../etc/passwd")]
    [InlineData("..\\..\\windows\\system32\\calc.exe")]
    [InlineData("/var/log/syslog")]
    [InlineData("C:\\secret.key")]
    public async Task GetFileStreamAsync_PathTraversal_ThrowsValidationException(string maliciousKey)
    {
        await Assert.ThrowsAsync<ValidationException>(() =>
            _sut.GetFileStreamAsync(maliciousKey));
    }

    [Fact]
    public async Task StoreAsync_SanitizesClientFileName()
    {
        var sampleBytes = Encoding.UTF8.GetBytes("Data");
        using var stream = new MemoryStream(sampleBytes);

        var result = await _sut.StoreAsync(stream, "../../../malicious_file.jpg", "image/jpeg");

        Assert.Equal("malicious_file.jpg", result.FileName);
        Assert.DoesNotContain("..", result.StorageKey);
    }

    [Fact]
    public async Task StoreAsync_NullOrUnreadableStream_ThrowsValidationException()
    {
        await Assert.ThrowsAsync<ValidationException>(() =>
            _sut.StoreAsync(null!, "file.txt", "text/plain"));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task StoreAsync_EmptyFileName_ThrowsValidationException(string invalidName)
    {
        var sampleBytes = Encoding.UTF8.GetBytes("Data");
        using var stream = new MemoryStream(sampleBytes);

        await Assert.ThrowsAsync<ValidationException>(() =>
            _sut.StoreAsync(stream, invalidName, "text/plain"));
    }

    [Fact]
    public async Task DeleteAsync_ExistingFile_DeletesAndReturnsTrue()
    {
        var sampleBytes = Encoding.UTF8.GetBytes("Temporary evidence");
        using var stream = new MemoryStream(sampleBytes);

        var stored = await _sut.StoreAsync(stream, "temp_video.mp4", "video/mp4");
        Assert.Equal(MediaFileType.Video, stored.FileType);

        var deleted = await _sut.DeleteAsync(stored.StorageKey);
        Assert.True(deleted);

        // Subsequent get should throw NotFoundException
        await Assert.ThrowsAsync<NotFoundException>(() =>
            _sut.GetFileStreamAsync(stored.StorageKey));
    }

    [Fact]
    public async Task DeleteAsync_NonExistentFile_ReturnsFalse()
    {
        var result = await _sut.DeleteAsync("2026/09/non_existent.png");
        Assert.False(result);
    }

    public void Dispose()
    {
        try
        {
            if (Directory.Exists(_testTempDir))
            {
                Directory.Delete(_testTempDir, recursive: true);
            }
        }
        catch
        {
            // Ignore cleanup errors during test teardown
        }
    }
}
