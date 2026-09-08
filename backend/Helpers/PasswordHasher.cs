using System.Security.Cryptography;

namespace backend.Helpers;

/// <summary>
/// PBKDF2-SHA256 password hashing helper.
/// Format stored: {iterations}.{base64-salt}.{base64-hash}
/// Uses timing-safe comparison to prevent timing attacks.
/// </summary>
public static class PasswordHasher
{
    private const int SaltSize = 16;       // 128-bit salt
    private const int HashSize = 32;       // 256-bit hash
    private const int Iterations = 100_000;
    private static readonly HashAlgorithmName Algorithm = HashAlgorithmName.SHA256;

    /// <summary>Hashes a plaintext password. Never call with a null/empty password in production.</summary>
    public static string Hash(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(SaltSize);
        var hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, Algorithm, HashSize);
        return $"{Iterations}.{Convert.ToBase64String(salt)}.{Convert.ToBase64String(hash)}";
    }

    /// <summary>Verifies a password against a stored hash using constant-time comparison.</summary>
    public static bool Verify(string password, string storedHash)
    {
        var parts = storedHash.Split('.');
        if (parts.Length != 3) return false;
        if (!int.TryParse(parts[0], out var iterations)) return false;

        byte[] salt, expectedHash;
        try
        {
            salt = Convert.FromBase64String(parts[1]);
            expectedHash = Convert.FromBase64String(parts[2]);
        }
        catch (FormatException)
        {
            return false;
        }

        var actualHash = Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, Algorithm, expectedHash.Length);
        return CryptographicOperations.FixedTimeEquals(actualHash, expectedHash);
    }
}
