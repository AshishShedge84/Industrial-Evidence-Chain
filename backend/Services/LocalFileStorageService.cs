using System.Security.Cryptography;
using backend.DTOs.Storage;
using backend.Exceptions;
using backend.Models.Enums;
using backend.Services.Interfaces;
using backend.Settings;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace backend.Services;

/// <summary>
/// Development/local disk implementation of IFileStorageService.
/// Stores media files safely in a local folder with strict path traversal prevention
/// and deterministic GUID-prefixed filenames.
/// </summary>
public class LocalFileStorageService : IFileStorageService
{
    private readonly string _basePath;
    private readonly ILogger<LocalFileStorageService> _logger;

    public LocalFileStorageService(
        IOptions<FileStorageSettings> options,
        ILogger<LocalFileStorageService> logger)
    {
        _logger = logger;
        var configuredPath = options.Value?.BasePath ?? "uploads";
        _basePath = Path.GetFullPath(configuredPath);

        if (!Directory.Exists(_basePath))
        {
            Directory.CreateDirectory(_basePath);
        }
    }

    public async Task<StoredFileResult> StoreAsync(
        Stream content,
        string fileName,
        string contentType,
        CancellationToken cancellationToken = default)
    {
        if (content is null || !content.CanRead)
        {
            throw new ValidationException("File stream must be readable and non-null.");
        }

        if (string.IsNullOrWhiteSpace(fileName))
        {
            throw new ValidationException("File name must be specified.");
        }

        // Sanitize file name: remove directory components and invalid path characters
        var sanitizedFileName = Path.GetFileName(fileName).Trim();
        if (string.IsNullOrWhiteSpace(sanitizedFileName))
        {
            sanitizedFileName = "unnamed_file";
        }

        var extension = Path.GetExtension(sanitizedFileName);
        var uniquePrefix = Guid.NewGuid().ToString("N");
        var storageFileName = $"{uniquePrefix}_{sanitizedFileName}";

        // Subdirectory partitioning by year/month
        var subFolder = DateTime.UtcNow.ToString("yyyy/MM");
        var targetDirectory = Path.Combine(_basePath, subFolder.Replace('/', Path.DirectorySeparatorChar));

        if (!Directory.Exists(targetDirectory))
        {
            Directory.CreateDirectory(targetDirectory);
        }

        var fullPhysicalPath = Path.Combine(targetDirectory, storageFileName);

        // Path traversal guard
        EnsurePathInsideBaseDirectory(fullPhysicalPath);

        long bytesWritten = 0;
        string fileHash;

        using (var destinationStream = new FileStream(fullPhysicalPath, FileMode.CreateNew, FileAccess.Write, FileShare.None, 81920, useAsync: true))
        using (var sha256 = IncrementalHash.CreateHash(HashAlgorithmName.SHA256))
        {
            var buffer = new byte[81920];
            int bytesRead;
            while ((bytesRead = await content.ReadAsync(buffer, 0, buffer.Length, cancellationToken)) > 0)
            {
                await destinationStream.WriteAsync(buffer.AsMemory(0, bytesRead), cancellationToken);
                sha256.AppendData(buffer, 0, bytesRead);
                bytesWritten += bytesRead;
            }
            fileHash = Convert.ToHexString(sha256.GetHashAndReset()).ToLowerInvariant();
        }

        var storageKey = $"{subFolder}/{storageFileName}";
        var storageUrl = $"/uploads/{storageKey}";
        var fileType = InferMediaFileType(extension, contentType);

        _logger.LogInformation("File stored successfully. StorageKey: {StorageKey}, Size: {Size} bytes, SHA256: {FileHash}", storageKey, bytesWritten, fileHash);

        return new StoredFileResult
        {
            StorageKey = storageKey,
            StorageUrl = storageUrl,
            FileName = sanitizedFileName,
            ContentType = string.IsNullOrWhiteSpace(contentType) ? "application/octet-stream" : contentType.Trim(),
            FileType = fileType,
            FileSizeBytes = bytesWritten,
            FileHash = fileHash,
            StoredAt = DateTime.UtcNow
        };
    }

    public Task<Stream> GetFileStreamAsync(
        string storageKey,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(storageKey))
        {
            throw new ValidationException("Storage key must be specified.");
        }

        var fullPhysicalPath = ResolveAndValidatePhysicalPath(storageKey);

        if (!File.Exists(fullPhysicalPath))
        {
            throw new NotFoundException($"File not found for storage key: {storageKey}");
        }

        Stream stream = new FileStream(fullPhysicalPath, FileMode.Open, FileAccess.Read, FileShare.Read, 81920, useAsync: true);
        return Task.FromResult(stream);
    }

    public Task<bool> DeleteAsync(
        string storageKey,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(storageKey))
        {
            return Task.FromResult(false);
        }

        try
        {
            var fullPhysicalPath = ResolveAndValidatePhysicalPath(storageKey);

            if (!File.Exists(fullPhysicalPath))
            {
                return Task.FromResult(false);
            }

            File.Delete(fullPhysicalPath);
            _logger.LogInformation("File deleted successfully. StorageKey: {StorageKey}", storageKey);
            return Task.FromResult(true);
        }
        catch (ValidationException)
        {
            return Task.FromResult(false);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete file with StorageKey: {StorageKey}", storageKey);
            throw;
        }
    }

    private string ResolveAndValidatePhysicalPath(string storageKey)
    {
        if (Path.IsPathRooted(storageKey) || storageKey.StartsWith('/') || storageKey.StartsWith('\\'))
        {
            throw new ValidationException("Path traversal or rooted path attempt detected.");
        }

        var normalizedKey = storageKey.Replace('/', Path.DirectorySeparatorChar).Replace('\\', Path.DirectorySeparatorChar);
        var fullPhysicalPath = Path.GetFullPath(Path.Combine(_basePath, normalizedKey));

        EnsurePathInsideBaseDirectory(fullPhysicalPath);

        return fullPhysicalPath;
    }

    private void EnsurePathInsideBaseDirectory(string physicalPath)
    {
        var fullBaseWithSlash = _basePath.EndsWith(Path.DirectorySeparatorChar)
            ? _basePath
            : _basePath + Path.DirectorySeparatorChar;

        if (!physicalPath.StartsWith(fullBaseWithSlash, StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(physicalPath, _basePath, StringComparison.OrdinalIgnoreCase))
        {
            throw new ValidationException("Path traversal attempt detected.");
        }
    }

    private static MediaFileType InferMediaFileType(string extension, string contentType)
    {
        var ext = extension.ToLowerInvariant();
        var mime = contentType.ToLowerInvariant();

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
