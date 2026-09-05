namespace backend.Settings;

/// <summary>
/// Configuration settings for file storage (local/mock storage in dev).
/// </summary>
public class FileStorageSettings
{
    public const string SectionName = "FileStorage";

    /// <summary>
    /// Relative or absolute base directory for storing uploaded files.
    /// Defaults to "uploads" directory.
    /// </summary>
    public string BasePath { get; set; } = "uploads";
}
