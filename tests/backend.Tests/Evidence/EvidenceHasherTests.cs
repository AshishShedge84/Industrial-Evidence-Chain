using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using backend.DTOs.Evidence;
using backend.Models;
using backend.Models.Enums;
using backend.Services;

namespace backend.Tests.Evidence;

public class EvidenceHasherTests
{
    private readonly EvidenceHasher _hasher = new();

    [Fact]
    public void Canonicalize_ProducesDeterministicLexicographicalJson()
    {
        var payload = new CanonicalEvidencePayload
        {
            EvidenceId = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
            AssetId = "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
            UserId = "f47ac10b-58cc-4372-a567-0e02b2c3d479",
            ActivityType = "Inspection",
            Timestamp = "2026-09-05T12:00:00.000Z",
            CreatedAt = "2026-09-05T12:05:00.000Z",
            Location = new CanonicalLocationPayload
            {
                Latitude = "12.345678",
                Longitude = "77.123456"
            },
            Description = "Standard quarterly inspection",
            MediaReferences = new List<string> { "hashA", "hashB" }
        };

        var canonicalBytes = _hasher.Canonicalize(payload);
        var canonicalString = Encoding.UTF8.GetString(canonicalBytes);

        // Verify lexicographical key ordering: activityType, assetId, createdAt, description, evidenceId, location, mediaReferences, timestamp, userId
        var expectedOrder = new[]
        {
            "\"activityType\"",
            "\"assetId\"",
            "\"createdAt\"",
            "\"description\"",
            "\"evidenceId\"",
            "\"location\"",
            "\"mediaReferences\"",
            "\"timestamp\"",
            "\"userId\""
        };

        var lastIndex = -1;
        foreach (var key in expectedOrder)
        {
            var currentIndex = canonicalString.IndexOf(key, StringComparison.Ordinal);
            Assert.True(currentIndex > lastIndex, $"Key {key} is out of RFC 8785 lexicographical order.");
            lastIndex = currentIndex;
        }

        // Verify nested location keys
        Assert.Contains("\"location\":{\"latitude\":\"12.345678\",\"longitude\":\"77.123456\"}", canonicalString);

        // Verify media references preserve order
        Assert.Contains("[\"hashA\",\"hashB\"]", canonicalString);
    }

    [Fact]
    public void ComputeHash_ProducesLowercase64CharHexSha256()
    {
        var payload = new CanonicalEvidencePayload
        {
            EvidenceId = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
            AssetId = "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
            UserId = "f47ac10b-58cc-4372-a567-0e02b2c3d479",
            ActivityType = "Maintenance",
            Timestamp = "2026-09-05T12:00:00.000Z",
            CreatedAt = "2026-09-05T12:05:00.000Z",
            Location = new CanonicalLocationPayload
            {
                Latitude = "12.345678",
                Longitude = "77.123456"
            },
            Description = "Replaced pump valve",
            MediaReferences = new List<string>()
        };

        var hash = _hasher.ComputeHash(payload);

        Assert.NotNull(hash);
        Assert.Equal(64, hash.Length);
        Assert.True(Regex.IsMatch(hash, "^[a-f0-9]{64}$"), "Hash must be 64-character lowercase hex");
    }

    [Fact]
    public void ComputeHash_TwoIdenticalRecords_ProduceIdenticalHash()
    {
        var record1 = new EvidenceRecord
        {
            EvidenceId = Guid.Parse("9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"),
            AssetId = Guid.Parse("1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d"),
            UserId = Guid.Parse("f47ac10b-58cc-4372-a567-0e02b2c3d479"),
            ActivityType = ActivityType.Inspection,
            Timestamp = DateTime.Parse("2026-09-05T12:00:00.000Z", CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal),
            CreatedAt = DateTime.Parse("2026-09-05T12:05:00.000Z", CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal),
            Latitude = 12.345678m,
            Longitude = 77.123456m,
            Description = "Quarterly safety inspection"
        };

        var record2 = new EvidenceRecord
        {
            EvidenceId = Guid.Parse("9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"),
            AssetId = Guid.Parse("1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d"),
            UserId = Guid.Parse("f47ac10b-58cc-4372-a567-0e02b2c3d479"),
            ActivityType = ActivityType.Inspection,
            Timestamp = DateTime.Parse("2026-09-05T12:00:00.000Z", CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal),
            CreatedAt = DateTime.Parse("2026-09-05T12:05:00.000Z", CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal),
            Latitude = 12.345678m,
            Longitude = 77.123456m,
            Description = "Quarterly safety inspection"
        };

        var hash1 = _hasher.ComputeHash(record1);
        var hash2 = _hasher.ComputeHash(record2);

        Assert.Equal(hash1, hash2);
    }

    [Fact]
    public void ComputeHash_ModifiedField_ProducesDifferentHash()
    {
        var record1 = new EvidenceRecord
        {
            EvidenceId = Guid.Parse("9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"),
            AssetId = Guid.Parse("1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d"),
            UserId = Guid.Parse("f47ac10b-58cc-4372-a567-0e02b2c3d479"),
            ActivityType = ActivityType.Inspection,
            Timestamp = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            Description = "Original description"
        };

        var record2 = new EvidenceRecord
        {
            EvidenceId = record1.EvidenceId,
            AssetId = record1.AssetId,
            UserId = record1.UserId,
            ActivityType = record1.ActivityType,
            Timestamp = record1.Timestamp,
            CreatedAt = record1.CreatedAt,
            Description = "Tampered description" // modified
        };

        var hash1 = _hasher.ComputeHash(record1);
        var hash2 = _hasher.ComputeHash(record2);

        Assert.NotEqual(hash1, hash2);
    }

    [Fact]
    public void ComputeHash_NormalizesCoordinatesToSixDecimals()
    {
        var record1 = new EvidenceRecord
        {
            EvidenceId = Guid.NewGuid(),
            AssetId = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            ActivityType = ActivityType.Safety,
            Timestamp = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            Latitude = 12.345678000m,
            Longitude = 77.123456000m,
            Description = "Test"
        };

        var record2 = new EvidenceRecord
        {
            EvidenceId = record1.EvidenceId,
            AssetId = record1.AssetId,
            UserId = record1.UserId,
            ActivityType = record1.ActivityType,
            Timestamp = record1.Timestamp,
            CreatedAt = record1.CreatedAt,
            Latitude = 12.345678m,
            Longitude = 77.123456m,
            Description = "Test"
        };

        var hash1 = _hasher.ComputeHash(record1);
        var hash2 = _hasher.ComputeHash(record2);

        Assert.Equal(hash1, hash2);
    }
}
