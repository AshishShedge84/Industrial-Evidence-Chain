using backend.Models.Enums;

namespace backend.Models;

/// <summary>
/// Media file (image, video, document) attached to an evidence record.
/// Actual file is stored off-chain (Azure Blob / object storage).
/// Maps to PostgreSQL table: evidence_media
/// </summary>
public class EvidenceMedia
{
    public Guid MediaId { get; set; }
    public Guid EvidenceId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public MediaFileType FileType { get; set; }

    /// <summary>URL/path to the off-chain storage location.</summary>
    public string StorageUrl { get; set; } = string.Empty;

    public long? FileSizeBytes { get; set; }

    /// <summary>64-character lowercase SHA-256 cryptographic hash of the media file binary content.</summary>
    public string? FileHash { get; set; }

    public DateTime UploadedAt { get; set; }

    // Navigation properties
    public EvidenceRecord EvidenceRecord { get; set; } = null!;
}
