using backend.Models.Enums;

namespace backend.DTOs.Evidence;

/// <summary>
/// Media file metadata attached to an evidence record.
/// </summary>
public class EvidenceMediaDto
{
    public Guid MediaId { get; set; }
    public Guid EvidenceId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public MediaFileType FileType { get; set; }
    public string StorageProvider { get; set; } = "Local";
    public string StorageUrl { get; set; } = string.Empty;
    public long? FileSizeBytes { get; set; }
    public string? FileHash { get; set; }
    public DateTime UploadedAt { get; set; }
}
