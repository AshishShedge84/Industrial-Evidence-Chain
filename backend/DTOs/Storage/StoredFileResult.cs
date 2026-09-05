using backend.Models.Enums;

namespace backend.DTOs.Storage;

/// <summary>
/// Result metadata returned after storing a file.
/// Provides all fields required to construct an EvidenceMedia entity.
/// </summary>
public class StoredFileResult
{
    /// <summary>Unique storage identifier/relative path (e.g. "evidence/2026/09/guid_filename.jpg").</summary>
    public string StorageKey { get; set; } = string.Empty;

    /// <summary>Access URL or relative resource URI.</summary>
    public string StorageUrl { get; set; } = string.Empty;

    /// <summary>Sanitized original file name.</summary>
    public string FileName { get; set; } = string.Empty;

    /// <summary>MIME content type (e.g. "image/jpeg", "application/pdf").</summary>
    public string ContentType { get; set; } = string.Empty;

    /// <summary>Inferred media type enum (Image, Video, Document).</summary>
    public MediaFileType FileType { get; set; }

    /// <summary>Size of the stored file in bytes.</summary>
    public long FileSizeBytes { get; set; }

    /// <summary>UTC timestamp when the file was saved.</summary>
    public DateTime StoredAt { get; set; }
}
