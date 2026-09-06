namespace backend.DTOs.Evidence;

/// <summary>
/// Response payload representing the cryptographic verification of an evidence record against the blockchain ledger.
/// </summary>
public class EvidenceVerificationResponseDto
{
    public Guid EvidenceId { get; set; }
    public string CalculatedHash { get; set; } = string.Empty;
    public string? TrustedHash { get; set; }
    public bool IsValid { get; set; }

    /// <summary>Status string: "VERIFIED", "INTEGRITY_MISMATCH", "PROOF_NOT_FOUND", "PENDING", or "FAILED".</summary>
    public string Status { get; set; } = string.Empty;

    public string? TransactionId { get; set; }
    public DateTime? AnchoredAt { get; set; }
    public string? Error { get; set; }
}
