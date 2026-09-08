namespace backend.Models;

/// <summary>
/// Blockchain proof record anchored on Hyperledger Fabric.
/// Matches the approved Blockchain Proof Contract fields.
/// Maps to PostgreSQL table: blockchain_proofs
/// </summary>
public class BlockchainProof
{
    public Guid ProofId { get; set; }

    /// <summary>One-to-one: each evidence record has at most one blockchain proof.</summary>
    public Guid EvidenceId { get; set; }

    public Guid AssetId { get; set; }

    /// <summary>SHA-256 hash that was anchored on-chain.</summary>
    public string EvidenceHash { get; set; } = string.Empty;

    /// <summary>Hyperledger Fabric transaction ID.</summary>
    public string TransactionId { get; set; } = string.Empty;

    /// <summary>Fabric identity/MSP reference of the submitting identity (nullable).</summary>
    public string? SignerIdentity { get; set; }

    public DateTime AnchoredAt { get; set; }
    public DateTime CreatedAt { get; set; }

    // Navigation properties
    public EvidenceRecord EvidenceRecord { get; set; } = null!;
    public Asset Asset { get; set; } = null!;
}
