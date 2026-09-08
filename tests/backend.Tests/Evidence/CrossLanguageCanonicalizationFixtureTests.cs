using System.Globalization;
using System.Text;
using backend.DTOs.Evidence;
using backend.Models;
using backend.Models.Enums;
using backend.Services;

namespace backend.Tests.Evidence;

/// <summary>
/// Cross-language fixture tests verifying byte-identical RFC 8785 canonical JSON serialization
/// and SHA-256 evidence hashing matching the TypeScript blockchain implementation.
/// </summary>
public class CrossLanguageCanonicalizationFixtureTests
{
    private readonly EvidenceHasher _hasher = new();

    [Fact]
    public void Vector1_StandardInspection_ProducesExactMatchingJsonAndSha256()
    {
        // Arrange - Vector 1: Standard Maintenance with multiple media content hashes
        var payload = new CanonicalEvidencePayload
        {
            EvidenceId = "e82b7b51-4623-424a-9b4d-17849cb15d2a",
            AssetId = "a1111111-2222-3333-4444-555555555555",
            UserId = "b9999999-8888-7777-6666-555555555555",
            ActivityType = "Maintenance",
            Timestamp = "2026-09-02T14:30:00.000Z",
            CreatedAt = "2026-09-02T14:32:15.000Z",
            Location = new CanonicalLocationPayload
            {
                Latitude = "18.52043",
                Longitude = "73.856744"
            },
            Description = "Replaced high-pressure hydraulic filter unit #4 during scheduled quarterly overhaul.",
            MediaReferences = new List<string>
            {
                "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                "ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb"
            }
        };

        const string expectedJson =
            "{\"activityType\":\"Maintenance\",\"assetId\":\"a1111111-2222-3333-4444-555555555555\",\"createdAt\":\"2026-09-02T14:32:15.000Z\",\"description\":\"Replaced high-pressure hydraulic filter unit #4 during scheduled quarterly overhaul.\",\"evidenceId\":\"e82b7b51-4623-424a-9b4d-17849cb15d2a\",\"location\":{\"latitude\":\"18.520430\",\"longitude\":\"73.856744\"},\"mediaReferences\":[\"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\",\"ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb\"],\"timestamp\":\"2026-09-02T14:30:00.000Z\",\"userId\":\"b9999999-8888-7777-6666-555555555555\"}";
        const string expectedHash = "43e654c52da7e2b97c044d9a9d1d1b23cc2f9a6a1846ce4b4be35856fcd6b2ae";

        // Act
        var canonicalBytes = _hasher.Canonicalize(payload);
        var canonicalJson = Encoding.UTF8.GetString(canonicalBytes);
        var hash = _hasher.ComputeHash(payload);

        // Assert
        Assert.Equal(expectedJson, canonicalJson);
        Assert.Equal(expectedHash, hash);
    }

    [Fact]
    public void Vector2_UnicodeDiacritics_ProducesExactMatchingJsonAndSha256()
    {
        // Arrange - Vector 2: Unicode text with umlauts, accents, and punctuation
        var payload = new CanonicalEvidencePayload
        {
            EvidenceId = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
            AssetId = "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
            UserId = "f47ac10b-58cc-4372-a567-0e02b2c3d479",
            ActivityType = "Safety",
            Timestamp = "2026-09-05T08:15:30.500Z",
            CreatedAt = "2026-09-05T08:20:00.000Z",
            Location = new CanonicalLocationPayload
            {
                Latitude = "48.137154",
                Longitude = "11.576124"
            },
            Description = "Überprüfung des Druckbehälters & Sicherheitsventil: Prüfung erfolgreich abgeschlossen. (Válvula de presión: OK)",
            MediaReferences = new List<string>
            {
                "b4c8167f2b1d318cf1c9c849cf24a2c1f5480eb170d10565debb3889f078e888"
            }
        };

        const string expectedJson =
            "{\"activityType\":\"Safety\",\"assetId\":\"1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d\",\"createdAt\":\"2026-09-05T08:20:00.000Z\",\"description\":\"Überprüfung des Druckbehälters & Sicherheitsventil: Prüfung erfolgreich abgeschlossen. (Válvula de presión: OK)\",\"evidenceId\":\"9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d\",\"location\":{\"latitude\":\"48.137154\",\"longitude\":\"11.576124\"},\"mediaReferences\":[\"b4c8167f2b1d318cf1c9c849cf24a2c1f5480eb170d10565debb3889f078e888\"],\"timestamp\":\"2026-09-05T08:15:30.500Z\",\"userId\":\"f47ac10b-58cc-4372-a567-0e02b2c3d479\"}";
        const string expectedHash = "5e20e13d7e842e0228fe0631a9c74acb48260bb723866c47bdf4ed140ab9197c";

        // Act
        var canonicalBytes = _hasher.Canonicalize(payload);
        var canonicalJson = Encoding.UTF8.GetString(canonicalBytes);
        var hash = _hasher.ComputeHash(payload);

        // Assert
        Assert.Equal(expectedJson, canonicalJson);
        Assert.Equal(expectedHash, hash);
    }

    [Fact]
    public void Vector3_UppercaseUuidsAndEmptyMedia_ProducesNormalizedMatchingJsonAndSha256()
    {
        // Arrange - Vector 3: Uppercase UUIDs, negative coordinates, and empty mediaReferences
        var payload = new CanonicalEvidencePayload
        {
            EvidenceId = "F81D4FAE-7DEC-11D0-A765-00A0C91E6BF6",
            AssetId = "C305D68D-2C97-4EFB-814E-8E5F0CA9DE59",
            UserId = "6BA7B810-9DAD-11D1-80B4-00C04FD430C8",
            ActivityType = "Incident",
            Timestamp = "2026-09-06T23:59:59.999Z",
            CreatedAt = "2026-09-07T00:01:00.000Z",
            Location = new CanonicalLocationPayload
            {
                Latitude = "-33.86882",
                Longitude = "151.209296"
            },
            Description = "Emergency power shutdown due to thermal overload tripping breaker B-12.",
            MediaReferences = new List<string>()
        };

        const string expectedJson =
            "{\"activityType\":\"Incident\",\"assetId\":\"c305d68d-2c97-4efb-814e-8e5f0ca9de59\",\"createdAt\":\"2026-09-07T00:01:00.000Z\",\"description\":\"Emergency power shutdown due to thermal overload tripping breaker B-12.\",\"evidenceId\":\"f81d4fae-7dec-11d0-a765-00a0c91e6bf6\",\"location\":{\"latitude\":\"-33.868820\",\"longitude\":\"151.209296\"},\"mediaReferences\":[],\"timestamp\":\"2026-09-06T23:59:59.999Z\",\"userId\":\"6ba7b810-9dad-11d1-80b4-00c04fd430c8\"}";
        const string expectedHash = "3b838e7e76e37d04bcbdd43ede0030e796d17bba6af7238721d7015d99a617a9";

        // Act
        var canonicalBytes = _hasher.Canonicalize(payload);
        var canonicalJson = Encoding.UTF8.GetString(canonicalBytes);
        var hash = _hasher.ComputeHash(payload);

        // Assert
        Assert.Equal(expectedJson, canonicalJson);
        Assert.Equal(expectedHash, hash);
    }

    [Fact]
    public void ComputeHash_FromEvidenceRecordEntity_ProducesExactHashMatchingVector1()
    {
        // Arrange - Entity representation of Vector 1
        var record = new EvidenceRecord
        {
            EvidenceId = Guid.Parse("e82b7b51-4623-424a-9b4d-17849cb15d2a"),
            AssetId = Guid.Parse("a1111111-2222-3333-4444-555555555555"),
            UserId = Guid.Parse("b9999999-8888-7777-6666-555555555555"),
            ActivityType = ActivityType.Maintenance,
            Timestamp = DateTime.Parse("2026-09-02T14:30:00.000Z", CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal),
            CreatedAt = DateTime.Parse("2026-09-02T14:32:15.000Z", CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal),
            Latitude = 18.52043m,
            Longitude = 73.856744m,
            Description = "Replaced high-pressure hydraulic filter unit #4 during scheduled quarterly overhaul."
        };

        var mediaReferences = new List<string>
        {
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            "ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb"
        };

        const string expectedHash = "43e654c52da7e2b97c044d9a9d1d1b23cc2f9a6a1846ce4b4be35856fcd6b2ae";

        // Act
        var hash = _hasher.ComputeHash(record, mediaReferences);

        // Assert
        Assert.Equal(expectedHash, hash);
    }
}
