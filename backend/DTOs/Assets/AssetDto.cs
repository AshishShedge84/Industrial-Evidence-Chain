using System.Text.Json;

namespace backend.DTOs.Assets;

/// <summary>
/// Geographical coordinates for an asset location.
/// </summary>
public class AssetCoordinatesDto
{
    public double Latitude { get; set; }
    public double Longitude { get; set; }
}

/// <summary>
/// Structured asset location matching Member 3 frontend contract.
/// </summary>
public class AssetLocationDto
{
    public string Site { get; set; } = string.Empty;
    public string? Building { get; set; }
    public string? Floor { get; set; }
    public string? Room { get; set; }
    public AssetCoordinatesDto? Coordinates { get; set; }
}

/// <summary>
/// Full asset representation returned in Asset API responses.
/// </summary>
public class AssetDto
{
    public Guid Id { get; set; }
    public string AssetTag { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Status { get; set; } = "Active";
    public AssetLocationDto? Location { get; set; }
    public JsonElement? Specifications { get; set; }
    public string? QrCode { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public Guid CreatedBy { get; set; }
    public Guid AssignedTo { get; set; }
}
