using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using backend.DTOs.Evidence;
using backend.Models;
using backend.Services.Interfaces;

namespace backend.Services;

/// <summary>
/// Implements RFC 8785 JSON Canonicalization Scheme (JCS) and SHA-256 evidence hashing.
/// Guarantees cross-platform deterministic cryptographic hashing matching Member 2's blockchain contract.
///
/// Canonical Object Schema (lexicographical UTF-16 code unit order):
/// 1. activityType (string, NFC normalized)
/// 2. assetId (string, lowercase 36-char hyphenated UUID)
/// 3. createdAt (string, UTC ISO-8601 with milliseconds: yyyy-MM-ddTHH:mm:ss.fffZ)
/// 4. description (string, NFC normalized)
/// 5. evidenceId (string, lowercase 36-char hyphenated UUID)
/// 6. location (object with latitude and longitude strings fixed to 6 decimal places)
/// 7. mediaReferences (array of strings, preserved order, NFC normalized)
/// 8. timestamp (string, UTC ISO-8601 with milliseconds: yyyy-MM-ddTHH:mm:ss.fffZ)
/// 9. userId (string, lowercase 36-char hyphenated UUID)
/// </summary>
public class EvidenceHasher : IEvidenceHasher
{
    public byte[] Canonicalize(CanonicalEvidencePayload payload)
    {
        // 1. Normalize and canonicalize coordinates
        var latStr = NormalizeCoordinate(payload.Location?.Latitude, -90m, 90m, "location.latitude");
        var lonStr = NormalizeCoordinate(payload.Location?.Longitude, -180m, 180m, "location.longitude");

        var locationObject = new JsonObject
        {
            ["latitude"] = latStr,
            ["longitude"] = lonStr
        };

        // 2. Normalize media references array (preserve item order as per RFC 8785)
        var mediaArray = new JsonArray();
        var mediaList = payload.MediaReferences;
        if (mediaList != null)
        {
            foreach (var item in mediaList)
            {
                if (item != null)
                {
                    mediaArray.Add(JsonValue.Create(item.Trim().Normalize(NormalizationForm.FormC)));
                }
            }
        }

        // 3. Construct canonical JSON object
        var jsonObject = new JsonObject
        {
            ["activityType"] = (payload.ActivityType ?? string.Empty).Normalize(NormalizationForm.FormC),
            ["assetId"] = NormalizeUuid(payload.AssetId, "assetId"),
            ["createdAt"] = NormalizeIsoTimestamp(payload.CreatedAt, "createdAt"),
            ["description"] = (payload.Description ?? string.Empty).Normalize(NormalizationForm.FormC),
            ["evidenceId"] = NormalizeUuid(payload.EvidenceId, "evidenceId"),
            ["location"] = locationObject,
            ["mediaReferences"] = mediaArray,
            ["timestamp"] = NormalizeIsoTimestamp(payload.Timestamp, "timestamp"),
            ["userId"] = NormalizeUuid(payload.UserId, "userId")
        };

        // 4. Sort properties lexicographically by UTF-16 code units (RFC 8785 rule)
        var sortedObject = new JsonObject();
        foreach (var prop in jsonObject.OrderBy(kvp => kvp.Key, StringComparer.Ordinal))
        {
            sortedObject[prop.Key] = prop.Value?.DeepClone();
        }

        // 5. Serialize to canonical compact UTF-8 JSON without whitespace
        var jsonString = sortedObject.ToJsonString(new JsonSerializerOptions
        {
            WriteIndented = false,
            Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
        });

        return Encoding.UTF8.GetBytes(jsonString);
    }

    public string ComputeHash(CanonicalEvidencePayload payload)
    {
        var canonicalBytes = Canonicalize(payload);
        var hashBytes = SHA256.HashData(canonicalBytes);
        return Convert.ToHexString(hashBytes).ToLowerInvariant();
    }

    public string ComputeHash(EvidenceRecord record, IEnumerable<string>? mediaReferences = null)
    {
        var payload = new CanonicalEvidencePayload
        {
            EvidenceId = record.EvidenceId.ToString("D"),
            AssetId = record.AssetId.ToString("D"),
            UserId = record.UserId.ToString("D"),
            ActivityType = record.ActivityType.ToString(),
            Timestamp = record.Timestamp.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ", CultureInfo.InvariantCulture),
            CreatedAt = record.CreatedAt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ", CultureInfo.InvariantCulture),
            Location = new CanonicalLocationPayload
            {
                Latitude = record.Latitude.HasValue ? record.Latitude.Value.ToString("F6", CultureInfo.InvariantCulture) : "0.000000",
                Longitude = record.Longitude.HasValue ? record.Longitude.Value.ToString("F6", CultureInfo.InvariantCulture) : "0.000000"
            },
            Description = record.Description ?? string.Empty,
            MediaReferences = mediaReferences?.ToList() ?? new List<string>()
        };

        return ComputeHash(payload);
    }

    private static string NormalizeUuid(string? value, string fieldName)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return Guid.Empty.ToString("D");
        }
        var trimmed = value.Trim();
        if (Guid.TryParse(trimmed, out var guid))
        {
            return guid.ToString("D");
        }
        return trimmed.ToLowerInvariant().Normalize(NormalizationForm.FormC);
    }

    private static string NormalizeIsoTimestamp(string? value, string fieldName)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ", CultureInfo.InvariantCulture);
        }
        var trimmed = value.Trim();
        if (DateTime.TryParse(trimmed, CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal, out var dt))
        {
            return dt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ", CultureInfo.InvariantCulture);
        }
        return trimmed.Normalize(NormalizationForm.FormC);
    }

    private static string NormalizeCoordinate(string? value, decimal min, decimal max, string fieldName)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return 0m.ToString("F6", CultureInfo.InvariantCulture);
        }
        var trimmed = value.Trim();
        if (decimal.TryParse(trimmed, NumberStyles.Float | NumberStyles.AllowThousands, CultureInfo.InvariantCulture, out var num))
        {
            return num.ToString("F6", CultureInfo.InvariantCulture);
        }
        return trimmed.Normalize(NormalizationForm.FormC);
    }
}
