namespace backend.DTOs.Common;

/// <summary>
/// Response metadata providing timestamp, request correlation id, and API version.
/// </summary>
public class ResponseMeta
{
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string? RequestId { get; set; }
    public string Version { get; set; } = "1.0";
}

/// <summary>
/// Unified standard API response envelope matching confirmed Member 3 frontend contract.
/// </summary>
/// <typeparam name="T">Data payload type.</typeparam>
public class ApiResponse<T>
{
    public bool Success { get; set; }
    public T? Data { get; set; }
    public ErrorResponseDto? Error { get; set; }
    public ResponseMeta Meta { get; set; } = new();

    public static ApiResponse<T> SuccessResult(T data, string? requestId = null)
    {
        return new ApiResponse<T>
        {
            Success = true,
            Data = data,
            Error = null,
            Meta = new ResponseMeta
            {
                Timestamp = DateTime.UtcNow,
                RequestId = requestId,
                Version = "1.0"
            }
        };
    }

    public static ApiResponse<T> ErrorResult(ErrorResponseDto error, string? requestId = null)
    {
        return new ApiResponse<T>
        {
            Success = false,
            Data = default,
            Error = error,
            Meta = new ResponseMeta
            {
                Timestamp = DateTime.UtcNow,
                RequestId = requestId,
                Version = "1.0"
            }
        };
    }
}
