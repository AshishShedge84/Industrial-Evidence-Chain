using backend.DTOs.Blockchain;
using backend.Services;
using Microsoft.Extensions.Logging.Abstractions;

namespace backend.Tests.Blockchain;

public class MockBlockchainAdapterTests
{
    private readonly MockBlockchainAdapter _adapter = new(NullLogger<MockBlockchainAdapter>.Instance);

    [Fact]
    public async Task AnchorEvidenceAsync_ValidParams_AnchorsAndReturnsTransactionId()
    {
        var evidenceId = Guid.NewGuid();
        var assetId = Guid.NewGuid();
        var hash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

        var result = await _adapter.AnchorEvidenceAsync(new AnchorEvidenceParams
        {
            EvidenceId = evidenceId,
            AssetId = assetId,
            EvidenceHash = hash,
            Timestamp = DateTime.UtcNow,
            SignerReference = "user-01"
        });

        Assert.NotNull(result);
        Assert.Equal("ANCHORED", result.Status);
        Assert.NotNull(result.TransactionId);
        Assert.NotEmpty(result.TransactionId);
        Assert.NotNull(result.ProofReference);
        Assert.NotNull(result.AnchoredAt);
        Assert.Null(result.Error);
    }

    [Fact]
    public async Task GetEvidenceProofAsync_AfterAnchoring_ReturnsProofRecord()
    {
        var evidenceId = Guid.NewGuid();
        var assetId = Guid.NewGuid();
        var hash = "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08";

        var anchorResult = await _adapter.AnchorEvidenceAsync(new AnchorEvidenceParams
        {
            EvidenceId = evidenceId,
            AssetId = assetId,
            EvidenceHash = hash,
            Timestamp = DateTime.UtcNow,
            SignerReference = "signer-msp"
        });

        var proof = await _adapter.GetEvidenceProofAsync(evidenceId);

        Assert.NotNull(proof);
        Assert.Equal(evidenceId, proof.EvidenceId);
        Assert.Equal(assetId, proof.AssetId);
        Assert.Equal(hash, proof.EvidenceHash);
        Assert.Equal(anchorResult.TransactionId, proof.TransactionId);
        Assert.Equal("signer-msp", proof.SignerReference);
        Assert.True(proof.BlockNumber >= 1000);
    }

    [Fact]
    public async Task VerifyEvidenceAsync_MatchingHash_ReturnsVerified()
    {
        var evidenceId = Guid.NewGuid();
        var hash = "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8";

        var anchorResult = await _adapter.AnchorEvidenceAsync(new AnchorEvidenceParams
        {
            EvidenceId = evidenceId,
            AssetId = Guid.NewGuid(),
            EvidenceHash = hash,
            Timestamp = DateTime.UtcNow
        });

        var verifyResult = await _adapter.VerifyEvidenceAsync(new VerifyEvidenceParams
        {
            EvidenceId = evidenceId,
            CalculatedHash = hash
        });

        Assert.NotNull(verifyResult);
        Assert.True(verifyResult.IsValid);
        Assert.Equal("VERIFIED", verifyResult.Status);
        Assert.Equal(hash, verifyResult.TrustedHash);
        Assert.Equal(hash, verifyResult.CalculatedHash);
        Assert.Equal(anchorResult.TransactionId, verifyResult.TransactionId);
        Assert.Null(verifyResult.Error);
    }

    [Fact]
    public async Task VerifyEvidenceAsync_TamperedHash_ReturnsIntegrityMismatch()
    {
        var evidenceId = Guid.NewGuid();
        var originalHash = "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a";
        var tamperedHash = "ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d";

        var anchorResult = await _adapter.AnchorEvidenceAsync(new AnchorEvidenceParams
        {
            EvidenceId = evidenceId,
            AssetId = Guid.NewGuid(),
            EvidenceHash = originalHash,
            Timestamp = DateTime.UtcNow
        });

        var verifyResult = await _adapter.VerifyEvidenceAsync(new VerifyEvidenceParams
        {
            EvidenceId = evidenceId,
            CalculatedHash = tamperedHash
        });

        Assert.NotNull(verifyResult);
        Assert.False(verifyResult.IsValid);
        Assert.Equal("INTEGRITY_MISMATCH", verifyResult.Status);
        Assert.Equal(originalHash, verifyResult.TrustedHash);
        Assert.Equal(tamperedHash, verifyResult.CalculatedHash);
        Assert.Equal(anchorResult.TransactionId, verifyResult.TransactionId);
        Assert.NotNull(verifyResult.Error);
    }

    [Fact]
    public async Task VerifyEvidenceAsync_NonExistentEvidence_ReturnsProofNotFound()
    {
        var unknownEvidenceId = Guid.NewGuid();

        var verifyResult = await _adapter.VerifyEvidenceAsync(new VerifyEvidenceParams
        {
            EvidenceId = unknownEvidenceId,
            CalculatedHash = "somehash"
        });

        Assert.NotNull(verifyResult);
        Assert.False(verifyResult.IsValid);
        Assert.Equal("PROOF_NOT_FOUND", verifyResult.Status);
        Assert.Null(verifyResult.TrustedHash);
        Assert.Null(verifyResult.TransactionId);
    }

    [Fact]
    public async Task AnchorEvidenceAsync_IdempotentAnchor_ReturnsExistingProof()
    {
        var evidenceId = Guid.NewGuid();
        var hash = "6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b";

        var firstAnchor = await _adapter.AnchorEvidenceAsync(new AnchorEvidenceParams
        {
            EvidenceId = evidenceId,
            AssetId = Guid.NewGuid(),
            EvidenceHash = hash,
            Timestamp = DateTime.UtcNow
        });

        var secondAnchor = await _adapter.AnchorEvidenceAsync(new AnchorEvidenceParams
        {
            EvidenceId = evidenceId,
            AssetId = Guid.NewGuid(),
            EvidenceHash = hash,
            Timestamp = DateTime.UtcNow
        });

        Assert.Equal(firstAnchor.TransactionId, secondAnchor.TransactionId);
        Assert.Equal(firstAnchor.AnchoredAt, secondAnchor.AnchoredAt);
        Assert.Equal("ANCHORED", secondAnchor.Status);
    }
}
