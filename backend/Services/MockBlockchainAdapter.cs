using System.Collections.Concurrent;
using System.Security.Cryptography;
using backend.DTOs.Blockchain;
using backend.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace backend.Services;

/// <summary>
/// In-memory development and testing mock implementation of IBlockchainAdapter.
/// Simulates the Member 2 Hyperledger Fabric blockchain integration boundary without requiring a live network.
/// NOTE: This mock does NOT provide real cryptographic blockchain immutability or distributed consensus.
/// </summary>
public class MockBlockchainAdapter : IBlockchainAdapter
{
    private readonly ConcurrentDictionary<Guid, EvidenceProof> _ledger = new();
    private readonly ILogger<MockBlockchainAdapter> _logger;
    private long _blockCounter = 1000;

    public MockBlockchainAdapter(ILogger<MockBlockchainAdapter> logger)
    {
        _logger = logger;
    }

    public Task<AnchorEvidenceResult> AnchorEvidenceAsync(
        AnchorEvidenceParams parameters,
        CancellationToken cancellationToken = default)
    {
        if (parameters == null)
        {
            return Task.FromResult(new AnchorEvidenceResult
            {
                Status = "FAILED",
                Error = "Anchor parameters must not be null."
            });
        }

        if (parameters.EvidenceId == Guid.Empty)
        {
            return Task.FromResult(new AnchorEvidenceResult
            {
                Status = "FAILED",
                Error = "EvidenceId must not be empty."
            });
        }

        if (string.IsNullOrWhiteSpace(parameters.EvidenceHash))
        {
            return Task.FromResult(new AnchorEvidenceResult
            {
                Status = "FAILED",
                Error = "EvidenceHash must not be empty."
            });
        }

        // Idempotency: If already anchored, return existing proof transaction details
        if (_ledger.TryGetValue(parameters.EvidenceId, out var existingProof))
        {
            _logger.LogInformation("MockBlockchainAdapter: EvidenceId {EvidenceId} already anchored with TxId {TxId}. Returning existing proof.",
                parameters.EvidenceId, existingProof.TransactionId);

            return Task.FromResult(new AnchorEvidenceResult
            {
                Status = "ANCHORED",
                TransactionId = existingProof.TransactionId,
                ProofReference = $"mock://ledger/proofs/{parameters.EvidenceId}",
                AnchoredAt = existingProof.AnchoredAt,
                Error = null
            });
        }

        // Generate deterministic-looking mock transaction ID (e.g. 64-char hex)
        var txBytes = RandomNumberGenerator.GetBytes(32);
        var txId = Convert.ToHexString(txBytes).ToLowerInvariant();
        var anchoredAt = DateTime.UtcNow;
        var blockNumber = (ulong)Interlocked.Increment(ref _blockCounter);

        var proof = new EvidenceProof
        {
            EvidenceId = parameters.EvidenceId,
            AssetId = parameters.AssetId,
            EvidenceHash = parameters.EvidenceHash.Trim().ToLowerInvariant(),
            TransactionId = txId,
            SignerReference = parameters.SignerReference,
            AnchoredAt = anchoredAt,
            BlockNumber = blockNumber
        };

        _ledger[parameters.EvidenceId] = proof;

        _logger.LogInformation("MockBlockchainAdapter: Anchored EvidenceId {EvidenceId} on mock block #{BlockNumber} with TxId {TxId}.",
            parameters.EvidenceId, blockNumber, txId);

        return Task.FromResult(new AnchorEvidenceResult
        {
            Status = "ANCHORED",
            TransactionId = txId,
            ProofReference = $"mock://ledger/proofs/{parameters.EvidenceId}",
            AnchoredAt = anchoredAt,
            Error = null
        });
    }

    public Task<VerifyEvidenceResult> VerifyEvidenceAsync(
        VerifyEvidenceParams parameters,
        CancellationToken cancellationToken = default)
    {
        if (parameters == null || parameters.EvidenceId == Guid.Empty)
        {
            return Task.FromResult(new VerifyEvidenceResult
            {
                IsValid = false,
                Status = "FAILED",
                CalculatedHash = parameters?.CalculatedHash ?? string.Empty,
                Error = "Invalid verification parameters."
            });
        }

        if (!_ledger.TryGetValue(parameters.EvidenceId, out var proof))
        {
            _logger.LogWarning("MockBlockchainAdapter: Verification requested for unknown EvidenceId {EvidenceId}.", parameters.EvidenceId);
            return Task.FromResult(new VerifyEvidenceResult
            {
                IsValid = false,
                Status = "PROOF_NOT_FOUND",
                CalculatedHash = parameters.CalculatedHash,
                TrustedHash = null,
                TransactionId = null,
                Error = $"No proof found on mock ledger for EvidenceId '{parameters.EvidenceId}'."
            });
        }

        var calculatedNorm = (parameters.CalculatedHash ?? string.Empty).Trim().ToLowerInvariant();
        var trustedNorm = (proof.EvidenceHash ?? string.Empty).Trim().ToLowerInvariant();

        if (string.Equals(calculatedNorm, trustedNorm, StringComparison.OrdinalIgnoreCase))
        {
            return Task.FromResult(new VerifyEvidenceResult
            {
                IsValid = true,
                Status = "VERIFIED",
                CalculatedHash = parameters.CalculatedHash ?? string.Empty,
                TrustedHash = proof.EvidenceHash,
                TransactionId = proof.TransactionId,
                Error = null
            });
        }

        _logger.LogWarning("MockBlockchainAdapter: Integrity mismatch for EvidenceId {EvidenceId}. Expected {Trusted}, got {Calculated}.",
            parameters.EvidenceId, trustedNorm, calculatedNorm);

        return Task.FromResult(new VerifyEvidenceResult
        {
            IsValid = false,
            Status = "INTEGRITY_MISMATCH",
            CalculatedHash = parameters.CalculatedHash ?? string.Empty,
            TrustedHash = proof.EvidenceHash,
            TransactionId = proof.TransactionId,
            Error = "Calculated hash does not match trusted hash anchored on mock ledger."
        });
    }

    public Task<EvidenceProof?> GetEvidenceProofAsync(
        Guid evidenceId,
        CancellationToken cancellationToken = default)
    {
        if (_ledger.TryGetValue(evidenceId, out var proof))
        {
            return Task.FromResult<EvidenceProof?>(proof);
        }

        return Task.FromResult<EvidenceProof?>(null);
    }
}
