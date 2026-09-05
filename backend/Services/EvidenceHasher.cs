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
/// Rules:
/// - RFC 8785 lexicographical property ordering
/// - Lowercase hyphenated UUIDs
/// - UTC timestamps formatted as ISO-8601 with milliseconds (yyyy-MM-ddTHH:mm:ss.fffZ)
/// - Geographic coordinates fixed to 6 decimal places (InvariantCulture)
/// - Unicode Normalization Form C (NFC)
/// - UTF-8 encoding without BOM
/// - SHA-256 producing lowercase 64-character hexadecimal
/// </summary>
public class EvidenceHasher : IEvidenceHasher
{
    public byte[] Canonicalize(CanonicalEvidencePayload payload)
    {
        // 1. Normalize and canonicalize all properties
        var jsonObject = new JsonObject
        {
            ["activityType"] = (payload.ActivityType ?? string.Empty).Normalize(NormalizationForm.FormC),
            ["assetId"] = (payload.AssetId ?? string.Empty).ToLowerInvariant().Normalize(NormalizationForm.FormC),
            ["description"] = (payload.Description ?? string.Empty).Normalize(NormalizationForm.FormC),
            ["evidenceId"] = (payload.EvidenceId ?? string.Empty).ToLowerInvariant().Normalize(NormalizationForm.FormC),
            ["latitude"] = payload.Latitude != null ? payload.Latitude.Normalize(NormalizationForm.FormC) : null,
            ["longitude"] = payload.Longitude != null ? payload.Longitude.Normalize(NormalizationForm.FormC) : null,
            ["timestamp"] = (payload.Timestamp ?? string.Empty).Normalize(NormalizationForm.FormC),
            ["userId"] = (payload.UserId ?? string.Empty).ToLowerInvariant().Normalize(NormalizationForm.FormC)
        };

        // Media hashes array (sorted alphabetically for deterministic hashing)
        var mediaArray = new JsonArray();
        if (payload.MediaHashes != null)
        {
            var sortedMedia = payload.MediaHashes
                .Where(h => !string.IsNullOrWhiteSpace(h))
                .Select(h => h.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormC))
                .OrderBy(h => h, StringComparer.Ordinal)
                .ToList();

            foreach (var hash in sortedMedia)
            {
                mediaArray.Add(JsonValue.Create(hash));
            }
        }
        jsonObject["mediaHashes"] = mediaArray;

        // 2. Sort properties lexicographically by UTF-16 code units (RFC 8785 rule)
        var sortedObject = new JsonObject();
        foreach (var prop in jsonObject.OrderBy(kvp => kvp.Key, StringComparer.Ordinal))
        {
            sortedObject[prop.Key] = prop.Value?.DeepClone();
        }

        // 3. Serialize to canonical compact UTF-8 JSON without whitespace
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

    public string ComputeHash(EvidenceRecord record, IEnumerable<string>? mediaHashes = null)
    {
        var payload = new CanonicalEvidencePayload
        {
            EvidenceId = record.EvidenceId.ToString("D"),
            AssetId = record.AssetId.ToString("D"),
            UserId = record.UserId.ToString("D"),
            ActivityType = record.ActivityType.ToString(),
            Timestamp = record.Timestamp.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ", CultureInfo.InvariantCulture),
            Latitude = record.Latitude.HasValue ? record.Latitude.Value.ToString("F6", CultureInfo.InvariantCulture) : null,
            Longitude = record.Longitude.HasValue ? record.Longitude.Value.ToString("F6", CultureInfo.InvariantCulture) : null,
            Description = record.Description ?? string.Empty,
            MediaHashes = mediaHashes?.ToList() ?? new List<string>()
        };

        return ComputeHash(payload);
    }
}
