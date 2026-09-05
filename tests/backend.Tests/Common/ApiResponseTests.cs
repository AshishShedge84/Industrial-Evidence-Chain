using backend.DTOs.Common;

namespace backend.Tests.Common;

public class ApiResponseTests
{
    [Fact]
    public void SuccessResult_CreatesValidSuccessEnvelope()
    {
        var sampleData = new { Name = "Generator 1", Tag = "GEN-01" };
        var response = ApiResponse<object>.SuccessResult(sampleData, "req-12345");

        Assert.True(response.Success);
        Assert.Equal(sampleData, response.Data);
        Assert.Null(response.Error);
        Assert.NotNull(response.Meta);
        Assert.Equal("req-12345", response.Meta.RequestId);
        Assert.Equal("1.0", response.Meta.Version);
        Assert.True(response.Meta.Timestamp <= DateTime.UtcNow);
    }

    [Fact]
    public void ErrorResult_CreatesValidErrorEnvelope()
    {
        var error = new ErrorResponseDto
        {
            Code = "UNAUTHORIZED",
            Message = "Invalid credentials.",
            StatusCode = 401,
            TraceId = "req-999"
        };

        var response = ApiResponse<object>.ErrorResult(error, "req-999");

        Assert.False(response.Success);
        Assert.Null(response.Data);
        Assert.NotNull(response.Error);
        Assert.Equal("UNAUTHORIZED", response.Error.Code);
        Assert.Equal("Invalid credentials.", response.Error.Message);
        Assert.Equal(401, response.Error.StatusCode);
        Assert.Equal("req-999", response.Meta.RequestId);
    }
}
