using backend.DTOs.Assets;
using backend.DTOs.Common;

namespace backend.Services.Interfaces;

/// <summary>
/// Service contract for managing industrial assets and lifecycle history.
/// </summary>
public interface IAssetService
{
    /// <summary>
    /// Retrieves a paginated and filtered list of assets.
    /// </summary>
    Task<PagedResult<AssetDto>> GetAssetsAsync(
        string? query = null,
        string? category = null,
        string? status = null,
        Guid? assignedTo = null,
        int page = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves a single asset by its unique identifier.
    /// </summary>
    Task<AssetDto?> GetAssetByIdAsync(Guid assetId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Creates a new industrial asset.
    /// </summary>
    Task<AssetDto> CreateAssetAsync(CreateAssetRequestDto request, Guid createdByUserId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates metadata and status for an existing asset.
    /// </summary>
    Task<AssetDto?> UpdateAssetAsync(Guid assetId, UpdateAssetRequestDto request, Guid updatedByUserId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Soft-decommissions an asset by transitioning its status to 'Decommissioned'.
    /// Preserves all linked evidence, audit records, and blockchain proofs.
    /// </summary>
    Task<AssetDto?> DecommissionAssetAsync(Guid assetId, Guid performedByUserId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves the audit trail and lifecycle history for an asset.
    /// </summary>
    Task<IReadOnlyList<AssetHistoryDto>> GetAssetHistoryAsync(Guid assetId, CancellationToken cancellationToken = default);
}
