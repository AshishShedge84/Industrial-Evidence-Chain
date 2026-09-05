using backend.DTOs.Blockchain;
using backend.Services.Interfaces;

namespace backend.Tests.Blockchain;

public class BlockchainAdapterContractTests
{
    [Fact]
    public void AnchorEvidenceParams_ExposesRequiredContractProperties()
    {
        var evidenceId = Guid.NewGuid();
        var assetId = Guid.NewGuid();
        var now = DateTime.UtcNow;

        var parameters = new AnchorEvidenceParams
        {
            EvidenceId = evidenceId,
            AssetId = assetId,
            EvidenceHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            Timestamp = now,
            SignerReference = "Org1MSP:tech1"
        };

        Assert.Equal(evidenceId, parameters.EvidenceId);
        Assert.Equal(assetId, parameters.AssetId);
        Assert.Equal("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", parameters.EvidenceHash);
        Assert.Equal(now, parameters.Timestamp);
        Assert.Equal("Org1MSP:tech1", parameters.SignerReference);
    }

    [Fact]
    public void VerifyEvidenceResult_ExposesExpectedStatusValues()
    {
        var result = new VerifyEvidenceResult
        {
            IsValid = true,
            TrustedHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            CalculatedHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            Status = "VERIFIED",
            TransactionId = "tx-12345"
        };

        Assert.True(result.IsValid);
        Assert.Equal("VERIFIED", result.Status);
        Assert.Equal(result.TrustedHash, result.CalculatedHash);
        Assert.Equal("tx-12345", result.TransactionId);
    }
}
