using backend.Helpers;

namespace backend.Tests.Auth;

public class PasswordHasherTests
{
    [Fact]
    public void Hash_ReturnsNonEmptyString()
    {
        var hash = PasswordHasher.Hash("TestPassword123!");
        Assert.False(string.IsNullOrWhiteSpace(hash));
    }

    [Fact]
    public void Hash_ProducesThreePartFormat()
    {
        var hash = PasswordHasher.Hash("TestPassword123!");
        var parts = hash.Split('.');
        Assert.Equal(3, parts.Length);
    }

    [Fact]
    public void Hash_TwoCallsProduceDifferentHashes()
    {
        // Different salts must produce different hashes
        var hash1 = PasswordHasher.Hash("SamePassword");
        var hash2 = PasswordHasher.Hash("SamePassword");
        Assert.NotEqual(hash1, hash2);
    }

    [Fact]
    public void Verify_CorrectPasswordReturnsTrue()
    {
        var hash = PasswordHasher.Hash("CorrectPassword!");
        Assert.True(PasswordHasher.Verify("CorrectPassword!", hash));
    }

    [Fact]
    public void Verify_WrongPasswordReturnsFalse()
    {
        var hash = PasswordHasher.Hash("CorrectPassword!");
        Assert.False(PasswordHasher.Verify("WrongPassword!", hash));
    }

    [Fact]
    public void Verify_MalformedHashReturnsFalse()
    {
        Assert.False(PasswordHasher.Verify("anypassword", "not-a-valid-hash"));
    }

    [Fact]
    public void Verify_EmptyHashReturnsFalse()
    {
        Assert.False(PasswordHasher.Verify("anypassword", string.Empty));
    }

    [Fact]
    public void Verify_CaseSensitivePassword()
    {
        var hash = PasswordHasher.Hash("MyPassword");
        Assert.False(PasswordHasher.Verify("mypassword", hash));
    }
}
