using backend.DTOs.Blockchain;

namespace backend.Services.Interfaces;

/// <summary>
/// Logical adapter contract between Member 1 (ASP.NET Core Backend) and Member 2 (Blockchain Layer).
/// Conforms to Member 1 Integration Guide section 3.
/// </summary>
public interface IBlockchainAdapter
{
    /// <summary>
    /// Anchors a SHA-256 evidence proof to the blockchain ledger upon successful off-chain storage.
    /// </summary>
    Task<AnchorEvidenceResult> AnchorEvidenceAsync(AnchorEvidenceParams parameters, CancellationToken cancellationToken = default);

    /// <summary>
    /// Queries the blockchain ledger and verifies whether a recalculated evidence hash matches the anchored proof.
    /// </summary>
    Task<VerifyEvidenceResult> VerifyEvidenceAsync(VerifyEvidenceParams parameters, CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves the immutable cryptographic proof record for an evidence item from the blockchain ledger.
    /// </summary>
    Task<EvidenceProof?> GetEvidenceProofAsync(Guid evidenceId, CancellationToken cancellationToken = default);
}
