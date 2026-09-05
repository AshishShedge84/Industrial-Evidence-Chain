using backend.DTOs.Storage;

namespace backend.Services.Interfaces;

/// <summary>
/// Abstraction for storing, retrieving, and deleting off-chain evidence media files.
/// Decouples business logic from physical storage providers (local disk, Azure Blob, S3, etc.).
/// </summary>
public interface IFileStorageService
{
    /// <summary>
    /// Stores a file stream asynchronously under a safe generated identifier.
    /// </summary>
    /// <param name="content">Readable file content stream.</param>
    /// <param name="fileName">Original client file name.</param>
    /// <param name="contentType">MIME content type (e.g. "image/png").</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Metadata describing the stored file.</returns>
    Task<StoredFileResult> StoreAsync(
        Stream content,
        string fileName,
        string contentType,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves a stored file stream by storage key/path.
    /// </summary>
    /// <param name="storageKey">Storage identifier returned during StoreAsync.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Readable stream of the file.</returns>
    Task<Stream> GetFileStreamAsync(
        string storageKey,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes a stored file by storage key/path.
    /// </summary>
    /// <param name="storageKey">Storage identifier returned during StoreAsync.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>True if file was deleted, false if it did not exist.</returns>
    Task<bool> DeleteAsync(
        string storageKey,
        CancellationToken cancellationToken = default);
}
