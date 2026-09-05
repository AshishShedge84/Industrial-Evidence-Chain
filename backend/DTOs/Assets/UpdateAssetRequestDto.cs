using System.ComponentModel.DataAnnotations;
using System.Text.Json;

namespace backend.DTOs.Assets;

/// <summary>
/// Request payload for updating an existing industrial asset.
/// </summary>
public class UpdateAssetRequestDto
{
    [StringLength(200, ErrorMessage = "Name cannot exceed 200 characters.")]
    public string? Name { get; set; }

    [StringLength(1000, ErrorMessage = "Description cannot exceed 1000 characters.")]
    public string? Description { get; set; }

    public string? Category { get; set; }

    public string? Status { get; set; }

    public AssetLocationDto? Location { get; set; }

    public JsonElement? Specifications { get; set; }

    public Guid? AssignedTo { get; set; }
}
