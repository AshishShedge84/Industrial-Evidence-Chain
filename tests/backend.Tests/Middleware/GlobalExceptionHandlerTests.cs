using System.Net;
using System.Text.Json;
using backend.DTOs.Common;
using backend.Exceptions;
using backend.Middleware;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;

namespace backend.Tests.Middleware;

public class GlobalExceptionHandlerTests
{
    private readonly GlobalExceptionHandler _handler;

    public GlobalExceptionHandlerTests()
    {
        _handler = new GlobalExceptionHandler(NullLogger<GlobalExceptionHandler>.Instance);
    }

    private static (HttpContext Context, MemoryStream BodyStream) CreateHttpContext()
    {
        var context = new DefaultHttpContext();
        var bodyStream = new MemoryStream();
        context.Response.Body = bodyStream;
        context.TraceIdentifier = "test-trace-id-12345";
        return (context, bodyStream);
    }

    private static async Task<ErrorResponseDto?> ReadResponseAsync(MemoryStream stream)
    {
        stream.Seek(0, SeekOrigin.Begin);
        return await JsonSerializer.DeserializeAsync<ErrorResponseDto>(stream, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });
    }

    [Fact]
    public async Task TryHandleAsync_ValidationException_Returns400WithValidationError()
    {
        var (context, stream) = CreateHttpContext();
        var exception = new ValidationException("Invalid input provided.");

        var handled = await _handler.TryHandleAsync(context, exception, CancellationToken.None);

        Assert.True(handled);
        Assert.Equal(StatusCodes.Status400BadRequest, context.Response.StatusCode);

        var body = await ReadResponseAsync(stream);
        Assert.NotNull(body);
        Assert.Equal("VALIDATION_ERROR", body.Code);
        Assert.Equal("Invalid input provided.", body.Message);
        Assert.Equal(400, body.StatusCode);
        Assert.Equal("test-trace-id-12345", body.TraceId);
    }

    [Fact]
    public async Task TryHandleAsync_ArgumentException_Returns400WithBadRequest()
    {
        var (context, stream) = CreateHttpContext();
        var exception = new ArgumentException("Action cannot be null.");

        var handled = await _handler.TryHandleAsync(context, exception, CancellationToken.None);

        Assert.True(handled);
        Assert.Equal(StatusCodes.Status400BadRequest, context.Response.StatusCode);

        var body = await ReadResponseAsync(stream);
        Assert.NotNull(body);
        Assert.Equal("BAD_REQUEST", body.Code);
        Assert.Equal("Action cannot be null.", body.Message);
        Assert.Equal(400, body.StatusCode);
    }

    [Fact]
    public async Task TryHandleAsync_NotFoundException_Returns404WithNotFound()
    {
        var (context, stream) = CreateHttpContext();
        var exception = new NotFoundException("Asset with ID 'asset-1' not found.");

        var handled = await _handler.TryHandleAsync(context, exception, CancellationToken.None);

        Assert.True(handled);
        Assert.Equal(StatusCodes.Status404NotFound, context.Response.StatusCode);

        var body = await ReadResponseAsync(stream);
        Assert.NotNull(body);
        Assert.Equal("NOT_FOUND", body.Code);
        Assert.Equal("Asset with ID 'asset-1' not found.", body.Message);
        Assert.Equal(404, body.StatusCode);
    }

    [Fact]
    public async Task TryHandleAsync_ConflictException_Returns409WithConflict()
    {
        var (context, stream) = CreateHttpContext();
        var exception = new ConflictException("Evidence serial number already registered.");

        var handled = await _handler.TryHandleAsync(context, exception, CancellationToken.None);

        Assert.True(handled);
        Assert.Equal(StatusCodes.Status409Conflict, context.Response.StatusCode);

        var body = await ReadResponseAsync(stream);
        Assert.NotNull(body);
        Assert.Equal("CONFLICT", body.Code);
        Assert.Equal("Evidence serial number already registered.", body.Message);
        Assert.Equal(409, body.StatusCode);
    }

    [Fact]
    public async Task TryHandleAsync_InvalidOperationException_Returns409WithConflict()
    {
        var (context, stream) = CreateHttpContext();
        var exception = new InvalidOperationException("Username is already taken.");

        var handled = await _handler.TryHandleAsync(context, exception, CancellationToken.None);

        Assert.True(handled);
        Assert.Equal(StatusCodes.Status409Conflict, context.Response.StatusCode);

        var body = await ReadResponseAsync(stream);
        Assert.NotNull(body);
        Assert.Equal("CONFLICT", body.Code);
        Assert.Equal("Username is already taken.", body.Message);
        Assert.Equal(409, body.StatusCode);
    }

    [Fact]
    public async Task TryHandleAsync_UnauthorizedAccessException_Returns401WithUnauthorized()
    {
        var (context, stream) = CreateHttpContext();
        var exception = new UnauthorizedAccessException("Invalid authentication token.");

        var handled = await _handler.TryHandleAsync(context, exception, CancellationToken.None);

        Assert.True(handled);
        Assert.Equal(StatusCodes.Status401Unauthorized, context.Response.StatusCode);

        var body = await ReadResponseAsync(stream);
        Assert.NotNull(body);
        Assert.Equal("UNAUTHORIZED", body.Code);
        Assert.Equal("Invalid authentication token.", body.Message);
        Assert.Equal(401, body.StatusCode);
    }

    [Fact]
    public async Task TryHandleAsync_UnexpectedException_Returns500AndMasksDetails()
    {
        var (context, stream) = CreateHttpContext();
        var exception = new Npgsql.NpgsqlException("Connection to server at 127.0.0.1:5432 failed: password authentication failed for user 'postgres'");

        var handled = await _handler.TryHandleAsync(context, exception, CancellationToken.None);

        Assert.True(handled);
        Assert.Equal(StatusCodes.Status500InternalServerError, context.Response.StatusCode);

        var body = await ReadResponseAsync(stream);
        Assert.NotNull(body);
        Assert.Equal("INTERNAL_SERVER_ERROR", body.Code);
        Assert.Equal("An unexpected error occurred. Please contact the system administrator.", body.Message);
        Assert.Equal(500, body.StatusCode);
        Assert.Equal("test-trace-id-12345", body.TraceId);

        // Verify raw DB password / internal info is NOT leaked to response
        Assert.DoesNotContain("postgres", body.Message);
        Assert.DoesNotContain("127.0.0.1", body.Message);
        Assert.DoesNotContain("5432", body.Message);
        Assert.DoesNotContain("password", body.Message);
    }
}
