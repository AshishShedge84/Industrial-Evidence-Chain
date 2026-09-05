using System.Text.Json;
using backend.DTOs.Assets;
using backend.DTOs.Common;

namespace backend.Tests.Assets;

public class AssetDtoSerializationAndContractTests
{
    [Fact]
    public void AssetDto_SerializesWithCamelCaseMatchingFrontendContract()
    {
        var id = Guid.NewGuid();
        var createdBy = Guid.NewGuid();
        var assignedTo = Guid.NewGuid();

        var specsJson = JsonDocument.Parse("{\"power\":\"500kW\",\"voltage\":\"400V\"}").RootElement;

        var assetDto = new AssetDto
        {
            Id = id,
            AssetTag = "TAG-001",
            Name = "Generator A",
            Description = "Backup generator",
            Category = "Machinery",
            Status = "Active",
            Location = new AssetLocationDto
            {
                Site = "Main Plant",
                Building = "B1",
                Floor = "Ground",
                Room = "R101",
                Coordinates = new AssetCoordinatesDto
                {
                    Latitude = 12.3456,
                    Longitude = 78.9101
                }
            },
            Specifications = specsJson,
            QrCode = "TAG-001",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedBy = createdBy,
            AssignedTo = assignedTo
        };

        var response = ApiResponse<AssetDto>.SuccessResult(assetDto, "req-123");

        var json = JsonSerializer.Serialize(response, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        Assert.True(root.GetProperty("success").GetBoolean());
        Assert.Equal("req-123", root.GetProperty("meta").GetProperty("requestId").GetString());

        var data = root.GetProperty("data");
        Assert.Equal(id.ToString(), data.GetProperty("id").GetString());
        Assert.Equal("TAG-001", data.GetProperty("assetTag").GetString());
        Assert.Equal("Generator A", data.GetProperty("name").GetString());
        Assert.Equal("Backup generator", data.GetProperty("description").GetString());
        Assert.Equal("Machinery", data.GetProperty("category").GetString());
        Assert.Equal("Active", data.GetProperty("status").GetString());
        Assert.Equal("Main Plant", data.GetProperty("location").GetProperty("site").GetString());
        Assert.Equal(12.3456, data.GetProperty("location").GetProperty("coordinates").GetProperty("latitude").GetDouble());
        Assert.Equal("500kW", data.GetProperty("specifications").GetProperty("power").GetString());
        Assert.Equal(createdBy.ToString(), data.GetProperty("createdBy").GetString());
        Assert.Equal(assignedTo.ToString(), data.GetProperty("assignedTo").GetString());
    }

    [Fact]
    public void PagedResult_ComputesTotalPagesCorrectly()
    {
        var paged = new PagedResult<AssetDto>
        {
            Items = new List<AssetDto>(),
            Total = 45,
            Page = 1,
            PageSize = 20
        };

        Assert.Equal(3, paged.TotalPages);

        var pagedExact = new PagedResult<AssetDto>
        {
            Total = 40,
            PageSize = 20
        };
        Assert.Equal(2, pagedExact.TotalPages);
    }

    [Fact]
    public void AssetHistoryDto_SerializesExpectedContractFields()
    {
        var id = Guid.NewGuid();
        var assetId = Guid.NewGuid();
        var detailsJson = JsonDocument.Parse("{\"reason\":\"Scheduled audit\"}").RootElement;

        var historyDto = new AssetHistoryDto
        {
            Id = id,
            AssetId = assetId,
            Action = "StatusChanged",
            PerformedBy = "admin-user",
            PerformedAt = DateTime.UtcNow,
            Details = detailsJson,
            PreviousStatus = "Active",
            NewStatus = "Maintenance"
        };

        var json = JsonSerializer.Serialize(historyDto, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        Assert.Equal(id.ToString(), root.GetProperty("id").GetString());
        Assert.Equal(assetId.ToString(), root.GetProperty("assetId").GetString());
        Assert.Equal("StatusChanged", root.GetProperty("action").GetString());
        Assert.Equal("admin-user", root.GetProperty("performedBy").GetString());
        Assert.Equal("Active", root.GetProperty("previousStatus").GetString());
        Assert.Equal("Maintenance", root.GetProperty("newStatus").GetString());
        Assert.Equal("Scheduled audit", root.GetProperty("details").GetProperty("reason").GetString());
    }
}
