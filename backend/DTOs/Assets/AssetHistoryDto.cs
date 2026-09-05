using System.Text.Json;

namespace backend.DTOs.Assets;

/// <summary>
/// Lifecycle audit trail and history record for an asset.
/// </summary>
public class AssetHistoryDto
{
    public Guid Id { get; set; }
    public Guid AssetId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string PerformedBy { get; set; } = string.Empty;
    public DateTime PerformedAt { get; set; }
    public JsonElement? Details { get; set; }
    public string? PreviousStatus { get; set; }
    public string? NewStatus { get; set; }
}
