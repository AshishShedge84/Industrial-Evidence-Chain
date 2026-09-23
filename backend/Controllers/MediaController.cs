using System.Diagnostics;
using backend.Data;
using backend.DTOs.Common;
using backend.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
public class MediaController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IFileStorageService _storageService;
    private readonly ILogger<MediaController> _logger;
    private readonly string _baseMediaDirectory;

    public MediaController(
        AppDbContext db,
        IFileStorageService storageService,
        ILogger<MediaController> logger)
    {
        _db = db;
        _storageService = storageService;
        _logger = logger;

        // Resolve 'Uploaded Media' directory on host machine
        var customPath = Environment.GetEnvironmentVariable("UPLOADED_MEDIA_PATH");
        if (string.IsNullOrWhiteSpace(customPath) || !Directory.Exists(customPath))
        {
            var candidate = Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "..", "Uploaded Media"));
            customPath = Directory.Exists(candidate) ? candidate : Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "Uploaded Media"));
        }
        _baseMediaDirectory = Path.GetFullPath(customPath);
    }

    /// <summary>
    /// Serves an uploaded evidence media file (image or video) from the host machine.
    /// Supports HTTP range processing for video playback on mobile Safari/Chrome.
    /// </summary>
    [HttpGet("api/media/{*storagePath}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetMediaFile(string storagePath)
    {
        if (string.IsNullOrWhiteSpace(storagePath))
        {
            return BadRequest("Storage path must be provided.");
        }

        // 1. First, check if storagePath is a raw 64-char hex SHA-256 hash
        if (storagePath.Length == 64 && !storagePath.Contains('/') && !storagePath.Contains('.'))
        {
            var mediaByHash = await _db.EvidenceMedia
                .AsNoTracking()
                .FirstOrDefaultAsync(m => m.FileHash == storagePath.ToLowerInvariant());

            if (mediaByHash != null && !string.IsNullOrEmpty(mediaByHash.StorageUrl))
            {
                var relativeKey = mediaByHash.StorageUrl.Replace("/uploads/", string.Empty).TrimStart('/');
                return ServePhysicalFile(relativeKey);
            }
        }

        // 2. Normal storage path e.g. "images/guid_photo.jpg" or "videos/guid_video.webm"
        return ServePhysicalFile(storagePath);
    }

    /// <summary>
    /// Serves media by exact SHA-256 checksum.
    /// </summary>
    [HttpGet("api/media/hash/{hash}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetMediaByHash(string hash)
    {
        if (string.IsNullOrWhiteSpace(hash))
        {
            return BadRequest("Hash is required.");
        }

        var media = await _db.EvidenceMedia
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.FileHash == hash.ToLowerInvariant());

        if (media == null || string.IsNullOrEmpty(media.StorageUrl))
        {
            return NotFound($"Media with hash '{hash}' not found.");
        }

        var relativeKey = media.StorageUrl.Replace("/uploads/", string.Empty).TrimStart('/');
        return ServePhysicalFile(relativeKey);
    }

    /// <summary>
    /// Serves media by database MediaId GUID.
    /// </summary>
    [HttpGet("api/media/id/{mediaId:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetMediaById(Guid mediaId)
    {
        var media = await _db.EvidenceMedia
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.MediaId == mediaId);

        if (media == null || string.IsNullOrEmpty(media.StorageUrl))
        {
            return NotFound($"Media with ID '{mediaId}' not found.");
        }

        var relativeKey = media.StorageUrl.Replace("/uploads/", string.Empty).TrimStart('/');
        return ServePhysicalFile(relativeKey);
    }

    private IActionResult ServePhysicalFile(string relativePath)
    {
        // Path traversal guard
        if (Path.IsPathRooted(relativePath) || relativePath.Contains(".."))
        {
            return BadRequest("Invalid path traversal detected.");
        }

        var normalized = relativePath.Replace('/', Path.DirectorySeparatorChar).Replace('\\', Path.DirectorySeparatorChar);
        var fullPhysicalPath = Path.GetFullPath(Path.Combine(_baseMediaDirectory, normalized));

        // Ensure inside Uploaded Media base directory
        var baseDirWithSlash = _baseMediaDirectory.EndsWith(Path.DirectorySeparatorChar)
            ? _baseMediaDirectory
            : _baseMediaDirectory + Path.DirectorySeparatorChar;

        if (!fullPhysicalPath.StartsWith(baseDirWithSlash, StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest("Path traversal forbidden.");
        }

        if (!System.IO.File.Exists(fullPhysicalPath))
        {
            // Check fallback in content root 'uploads' if migrated
            var fallback = Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "uploads", normalized));
            if (System.IO.File.Exists(fallback))
            {
                fullPhysicalPath = fallback;
            }
            else
            {
                return NotFound($"Media file '{relativePath}' not found on host storage.");
            }
        }

        var contentType = GetContentType(fullPhysicalPath);
        
        // Enable range processing is crucial for video/audio streaming on mobile Safari and Chrome
        return PhysicalFile(fullPhysicalPath, contentType, enableRangeProcessing: true);
    }

    private static string GetContentType(string filePath)
    {
        var ext = Path.GetExtension(filePath).ToLowerInvariant();
        return ext switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".webp" => "image/webp",
            ".gif" => "image/gif",
            ".svg" => "image/svg+xml",
            ".mp4" => "video/mp4",
            ".webm" => "video/webm",
            ".mov" => "video/quicktime",
            ".pdf" => "application/pdf",
            ".csv" => "text/csv",
            ".txt" => "text/plain",
            _ => "application/octet-stream"
        };
    }
}
