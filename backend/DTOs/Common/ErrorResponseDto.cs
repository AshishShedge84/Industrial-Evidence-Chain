namespace backend.DTOs.Common;

/// <summary>
/// Minimal, consistent client-facing error response envelope.
/// Provides structured error details, status code, and correlation/request ID.
/// </summary>
public class ErrorResponseDto
{
    public string Code { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public int StatusCode { get; set; }
    public string? TraceId { get; set; }
}
