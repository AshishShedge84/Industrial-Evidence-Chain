using System.Diagnostics;
using backend.DTOs.Common;
using backend.Exceptions;
using Microsoft.AspNetCore.Diagnostics;

namespace backend.Middleware;

/// <summary>
/// Centralized ASP.NET Core global exception handler.
/// Translates exceptions to standardized HTTP status codes and ErrorResponseDto payloads.
/// Prevents leakage of internal stack traces, DB connection strings, and server internals.
/// </summary>
public class GlobalExceptionHandler : IExceptionHandler
{
    private readonly ILogger<GlobalExceptionHandler> _logger;

    public GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger)
    {
        _logger = logger;
    }

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        var traceId = Activity.Current?.Id ?? httpContext.TraceIdentifier;

        var (statusCode, code, message) = exception switch
        {
            ValidationException ve => (StatusCodes.Status400BadRequest, "VALIDATION_ERROR", ve.Message),
            ArgumentException ae => (StatusCodes.Status400BadRequest, "BAD_REQUEST", ae.Message),
            NotFoundException nfe => (StatusCodes.Status404NotFound, "NOT_FOUND", nfe.Message),
            ConflictException ce => (StatusCodes.Status409Conflict, "CONFLICT", ce.Message),
            InvalidOperationException ioe => (StatusCodes.Status409Conflict, "CONFLICT", ioe.Message),
            UnauthorizedAccessException uae => (StatusCodes.Status401Unauthorized, "UNAUTHORIZED", uae.Message),
            _ => (StatusCodes.Status500InternalServerError, "INTERNAL_SERVER_ERROR", "An unexpected error occurred. Please contact the system administrator.")
        };

        if (statusCode >= 500)
        {
            _logger.LogError(exception, "Unhandled exception occurred while processing request {Path} [TraceId: {TraceId}]",
                httpContext.Request.Path, traceId);
        }
        else
        {
            _logger.LogWarning("Handled application exception ({Code}) for request {Path} [TraceId: {TraceId}]: {Message}",
                code, httpContext.Request.Path, traceId, message);
        }

        httpContext.Response.StatusCode = statusCode;
        httpContext.Response.ContentType = "application/json";

        var response = new ErrorResponseDto
        {
            Code = code,
            Message = message,
            StatusCode = statusCode,
            TraceId = traceId
        };

        await httpContext.Response.WriteAsJsonAsync(response, cancellationToken);
        return true;
    }
}
