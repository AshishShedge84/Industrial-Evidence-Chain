using System.ComponentModel.DataAnnotations;
using backend.Models.Enums;

namespace backend.DTOs.Evidence;

/// <summary>
/// Request payload for creating a new evidence record for an industrial asset.
/// </summary>
public class CreateEvidenceRequestDto
{
    [Required(ErrorMessage = "AssetId is required.")]
    public Guid AssetId { get; set; }

    [Required(ErrorMessage = "ActivityType is required.")]
    public ActivityType ActivityType { get; set; }

    [Required(ErrorMessage = "Timestamp is required.")]
    public DateTime Timestamp { get; set; }

    [Range(-90.0, 90.0, ErrorMessage = "Latitude must be between -90 and 90 degrees.")]
    public decimal? Latitude { get; set; }

    [Range(-180.0, 180.0, ErrorMessage = "Longitude must be between -180 and 180 degrees.")]
    public decimal? Longitude { get; set; }

    public LocationPayloadDto? Location { get; set; }

    [Required(ErrorMessage = "Description is required.")]
    [StringLength(4000, ErrorMessage = "Description cannot exceed 4000 characters.")]
    public string Description { get; set; } = string.Empty;
}

public class LocationPayloadDto
{
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public decimal? Accuracy { get; set; }
    public string? Address { get; set; }
}
