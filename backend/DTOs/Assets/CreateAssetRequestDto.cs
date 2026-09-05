using System.ComponentModel.DataAnnotations;
using System.Text.Json;

namespace backend.DTOs.Assets;

/// <summary>
/// Request payload for creating a new industrial asset.
/// </summary>
public class CreateAssetRequestDto
{
    [Required(ErrorMessage = "AssetTag is required.")]
    [StringLength(100, ErrorMessage = "AssetTag cannot exceed 100 characters.")]
    public string AssetTag { get; set; } = string.Empty;

    [Required(ErrorMessage = "Name is required.")]
    [StringLength(200, ErrorMessage = "Name cannot exceed 200 characters.")]
    public string Name { get; set; } = string.Empty;

    [StringLength(1000, ErrorMessage = "Description cannot exceed 1000 characters.")]
    public string? Description { get; set; }

    [Required(ErrorMessage = "Category is required.")]
    public string Category { get; set; } = string.Empty;

    public AssetLocationDto? Location { get; set; }

    public JsonElement? Specifications { get; set; }

    [Required(ErrorMessage = "AssignedTo is required.")]
    public Guid AssignedTo { get; set; }
}
