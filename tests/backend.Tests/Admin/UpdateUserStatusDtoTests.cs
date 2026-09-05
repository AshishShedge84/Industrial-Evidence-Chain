using backend.DTOs.Admin;
using backend.Exceptions;

namespace backend.Tests.Admin;

public class UpdateUserStatusDtoTests
{
    [Theory]
    [InlineData("active", true)]
    [InlineData("ACTIVE", true)]
    [InlineData("  active  ", true)]
    [InlineData("pending", false)]
    [InlineData("PENDING", false)]
    [InlineData("suspended", false)]
    [InlineData("rejected", false)]
    public void ResolveIsActive_ValidStatusString_ReturnsExpectedBoolean(string inputStatus, bool expectedResult)
    {
        var dto = new UpdateUserStatusDto { Status = inputStatus };
        var result = dto.ResolveIsActive();
        Assert.Equal(expectedResult, result);
    }

    [Theory]
    [InlineData(true, true)]
    [InlineData(false, false)]
    public void ResolveIsActive_BooleanOnly_ReturnsExpectedBoolean(bool inputBool, bool expectedResult)
    {
        var dto = new UpdateUserStatusDto { IsActive = inputBool };
        var result = dto.ResolveIsActive();
        Assert.Equal(expectedResult, result);
    }

    [Fact]
    public void ResolveIsActive_InvalidStatus_ThrowsValidationException()
    {
        var dto = new UpdateUserStatusDto { Status = "unknown_status" };
        Assert.Throws<ValidationException>(() => dto.ResolveIsActive());
    }

    [Fact]
    public void ResolveIsActive_NoStatusOrIsActive_ThrowsValidationException()
    {
        var dto = new UpdateUserStatusDto();
        Assert.Throws<ValidationException>(() => dto.ResolveIsActive());
    }
}
