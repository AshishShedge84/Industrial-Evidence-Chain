using System.Security.Claims;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.DependencyInjection;

namespace backend.Tests.Auth;

public class AuthorizationPolicyTests
{
    private readonly IAuthorizationService _authorizationService;

    public AuthorizationPolicyTests()
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddAuthorization(options =>
        {
            options.AddPolicy("RequireAdmin", policy => policy.RequireRole(AppRoles.Admin));
            options.AddPolicy("RequireManager", policy => policy.RequireRole(AppRoles.Manager, AppRoles.Admin));
            options.AddPolicy("RequireTechnician", policy => policy.RequireRole(AppRoles.Technician, AppRoles.Admin));
            options.AddPolicy("RequireAuditor", policy => policy.RequireRole(AppRoles.Auditor, AppRoles.Admin));
            options.AddPolicy("RequireEvidenceCreator", policy => policy.RequireRole(AppRoles.Technician, AppRoles.Manager, AppRoles.Admin));
        });

        var provider = services.BuildServiceProvider();
        _authorizationService = provider.GetRequiredService<IAuthorizationService>();
    }

    private static ClaimsPrincipal CreateUserWithRole(string? role)
    {
        if (role is null)
        {
            // Anonymous / unauthenticated
            return new ClaimsPrincipal(new ClaimsIdentity());
        }

        var identity = new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()),
            new Claim(ClaimTypes.Role, role)
        }, "TestAuthType");

        return new ClaimsPrincipal(identity);
    }

    // ── RequireAdmin Policy ───────────────────────────────────────────────────

    [Fact]
    public async Task RequireAdmin_WithAdminRole_Succeeds()
    {
        var user = CreateUserWithRole(AppRoles.Admin);
        var result = await _authorizationService.AuthorizeAsync(user, null, "RequireAdmin");
        Assert.True(result.Succeeded);
    }

    [Theory]
    [InlineData(AppRoles.Technician)]
    [InlineData(AppRoles.Manager)]
    [InlineData(AppRoles.Auditor)]
    public async Task RequireAdmin_WithNonAdminRole_Fails(string role)
    {
        var user = CreateUserWithRole(role);
        var result = await _authorizationService.AuthorizeAsync(user, null, "RequireAdmin");
        Assert.False(result.Succeeded);
    }

    [Fact]
    public async Task RequireAdmin_Unauthenticated_Fails()
    {
        var user = CreateUserWithRole(null);
        var result = await _authorizationService.AuthorizeAsync(user, null, "RequireAdmin");
        Assert.False(result.Succeeded);
    }

    // ── RequireTechnician Policy ──────────────────────────────────────────────

    [Fact]
    public async Task RequireTechnician_WithTechnicianRole_Succeeds()
    {
        var user = CreateUserWithRole(AppRoles.Technician);
        var result = await _authorizationService.AuthorizeAsync(user, null, "RequireTechnician");
        Assert.True(result.Succeeded);
    }

    [Fact]
    public async Task RequireTechnician_WithAdminRole_Succeeds()
    {
        var user = CreateUserWithRole(AppRoles.Admin);
        var result = await _authorizationService.AuthorizeAsync(user, null, "RequireTechnician");
        Assert.True(result.Succeeded);
    }

    [Theory]
    [InlineData(AppRoles.Auditor)]
    [InlineData(AppRoles.Manager)]
    public async Task RequireTechnician_WithOtherRole_Fails(string role)
    {
        var user = CreateUserWithRole(role);
        var result = await _authorizationService.AuthorizeAsync(user, null, "RequireTechnician");
        Assert.False(result.Succeeded);
    }

    // ── RequireManager Policy ─────────────────────────────────────────────────

    [Fact]
    public async Task RequireManager_WithManagerRole_Succeeds()
    {
        var user = CreateUserWithRole(AppRoles.Manager);
        var result = await _authorizationService.AuthorizeAsync(user, null, "RequireManager");
        Assert.True(result.Succeeded);
    }

    [Fact]
    public async Task RequireManager_WithAdminRole_Succeeds()
    {
        var user = CreateUserWithRole(AppRoles.Admin);
        var result = await _authorizationService.AuthorizeAsync(user, null, "RequireManager");
        Assert.True(result.Succeeded);
    }

    [Fact]
    public async Task RequireManager_WithTechnicianRole_Fails()
    {
        var user = CreateUserWithRole(AppRoles.Technician);
        var result = await _authorizationService.AuthorizeAsync(user, null, "RequireManager");
        Assert.False(result.Succeeded);
    }

    // ── RequireAuditor Policy ─────────────────────────────────────────────────

    [Fact]
    public async Task RequireAuditor_WithAuditorRole_Succeeds()
    {
        var user = CreateUserWithRole(AppRoles.Auditor);
        var result = await _authorizationService.AuthorizeAsync(user, null, "RequireAuditor");
        Assert.True(result.Succeeded);
    }

    [Fact]
    public async Task RequireAuditor_WithAdminRole_Succeeds()
    {
        var user = CreateUserWithRole(AppRoles.Admin);
        var result = await _authorizationService.AuthorizeAsync(user, null, "RequireAuditor");
        Assert.True(result.Succeeded);
    }

    [Fact]
    public async Task RequireAuditor_WithTechnicianRole_Fails()
    {
        var user = CreateUserWithRole(AppRoles.Technician);
        var result = await _authorizationService.AuthorizeAsync(user, null, "RequireAuditor");
        Assert.False(result.Succeeded);
    }

    // ── RequireEvidenceCreator Policy ─────────────────────────────────────────

    [Theory]
    [InlineData(AppRoles.Technician)]
    [InlineData(AppRoles.Manager)]
    [InlineData(AppRoles.Admin)]
    public async Task RequireEvidenceCreator_WithAllowedRoles_Succeeds(string role)
    {
        var user = CreateUserWithRole(role);
        var result = await _authorizationService.AuthorizeAsync(user, null, "RequireEvidenceCreator");
        Assert.True(result.Succeeded);
    }

    [Fact]
    public async Task RequireEvidenceCreator_WithAuditorRole_Fails()
    {
        var user = CreateUserWithRole(AppRoles.Auditor);
        var result = await _authorizationService.AuthorizeAsync(user, null, "RequireEvidenceCreator");
        Assert.False(result.Succeeded);
    }

    [Fact]
    public async Task RequireEvidenceCreator_Unauthenticated_Fails()
    {
        var user = CreateUserWithRole(null);
        var result = await _authorizationService.AuthorizeAsync(user, null, "RequireEvidenceCreator");
        Assert.False(result.Succeeded);
    }
}
