namespace backend.DTOs.Blockchain;

/// <summary>
/// Parameters for anchoring an evidence proof to the blockchain ledger.
/// Conforms to Member 1 Integration Guide section 3.
/// </summary>
public class AnchorEvidenceParams
{
    public Guid EvidenceId { get; set; }
    public Guid AssetId { get; set; }

    /// <summary>64-character lowercase SHA-256 hex digest.</summary>
    public string EvidenceHash { get; set; } = string.Empty;

    /// <summary>UTC ISO-8601 timestamp when evidence was captured.</summary>
    public DateTime Timestamp { get; set; }

    /// <summary>Identity/MSP reference of the submitting user or system.</summary>
    public string SignerReference { get; set; } = string.Empty;
}

/// <summary>
/// Result returned from anchoring evidence to the blockchain ledger.
/// </summary>
public class AnchorEvidenceResult
{
    public string? TransactionId { get; set; }

    /// <summary>Status: "ANCHORED" or "FAILED".</summary>
    public string Status { get; set; } = string.Empty;

    public string ProofReference { get; set; } = string.Empty;
    public DateTime? AnchoredAt { get; set; }
    public string? Error { get; set; }
}

/// <summary>
/// Parameters for verifying an evidence record against the blockchain ledger.
/// </summary>
public class VerifyEvidenceParams
{
    public Guid EvidenceId { get; set; }

    /// <summary>Recalculated 64-character lowercase SHA-256 hex digest.</summary>
    public string CalculatedHash { get; set; } = string.Empty;
}

/// <summary>
/// Result returned from verifying an evidence record against the blockchain ledger.
/// </summary>
public class VerifyEvidenceResult
{
    public bool IsValid { get; set; }
    public string? TrustedHash { get; set; }
    public string CalculatedHash { get; set; } = string.Empty;

    /// <summary>Status: "VERIFIED", "INTEGRITY_MISMATCH", "PROOF_NOT_FOUND", "FAILED".</summary>
    public string Status { get; set; } = string.Empty;

    public string? TransactionId { get; set; }
    public string? Error { get; set; }
}

/// <summary>
/// Cryptographic proof structure retrieved from the blockchain ledger.
/// </summary>
public class EvidenceProof
{
    public Guid EvidenceId { get; set; }
    public Guid AssetId { get; set; }
    public string EvidenceHash { get; set; } = string.Empty;
    public string TransactionId { get; set; } = string.Empty;
    public string? SignerReference { get; set; }
    public DateTime AnchoredAt { get; set; }
    public ulong? BlockNumber { get; set; }
}
