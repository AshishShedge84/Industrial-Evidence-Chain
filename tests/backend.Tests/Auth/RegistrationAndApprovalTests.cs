using backend.Data;
using backend.DTOs.Auth;
using backend.Helpers;
using backend.Models;
using backend.Services;
using backend.Settings;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace backend.Tests.Auth;

public class RegistrationAndApprovalTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly AuthService _authService;
    private readonly AdminService _adminService;

    public RegistrationAndApprovalTests()
    {
        var dbOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _db = new AppDbContext(dbOptions);

        var jwtOptions = Options.Create(new JwtSettings
        {
            Secret = "TestSecretKeyForUnitTestsMustBe32CharsMin!!",
            Issuer = "TestIssuer",
            Audience = "TestAudience",
            ExpiryMinutes = 60
        });

        _authService = new AuthService(_db, jwtOptions);
        _adminService = new AdminService(_db);

        SeedInitialRoles();
    }

    private void SeedInitialRoles()
    {
        _db.Roles.AddRange(
            new Role { RoleId = Guid.NewGuid(), Name = AppRoles.Technician },
            new Role { RoleId = Guid.NewGuid(), Name = AppRoles.Manager },
            new Role { RoleId = Guid.NewGuid(), Name = AppRoles.Auditor },
            new Role { RoleId = Guid.NewGuid(), Name = AppRoles.Admin }
        );
        _db.SaveChanges();
    }

    [Fact]
    public async Task Register_WithValidData_CreatesPendingInactiveTechnician()
    {
        var request = new RegisterRequestDto
        {
            Username = "johndoe",
            Email = "john@example.com",
            Password = "Password123!",
            FullName = "John Doe"
        };

        var response = await _authService.RegisterAsync(request);

        Assert.NotNull(response);
        Assert.Equal("johndoe", response.Username);
        Assert.Equal("john@example.com", response.Email);
        Assert.False(response.IsActive); // MUST start as pending / inactive
        Assert.Contains(AppRoles.Technician, response.Roles);
        Assert.Single(response.Roles);

        var userInDb = await _db.Users
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .SingleAsync(u => u.Username == "johndoe");

        Assert.False(userInDb.IsActive);
        Assert.Contains(userInDb.UserRoles, ur => ur.Role.Name == AppRoles.Technician);
        Assert.DoesNotContain(userInDb.UserRoles, ur => ur.Role.Name == AppRoles.Manager);
        Assert.DoesNotContain(userInDb.UserRoles, ur => ur.Role.Name == AppRoles.Auditor);
        Assert.DoesNotContain(userInDb.UserRoles, ur => ur.Role.Name == AppRoles.Admin);
    }

    [Fact]
    public async Task Register_HashesPassword_DoesNotStorePlaintext()
    {
        var request = new RegisterRequestDto
        {
            Username = "secureuser",
            Email = "secure@example.com",
            Password = "SecretPlaintextPassword123!",
            FullName = "Secure User"
        };

        await _authService.RegisterAsync(request);

        var userInDb = await _db.Users.SingleAsync(u => u.Username == "secureuser");
        Assert.NotEqual("SecretPlaintextPassword123!", userInDb.PasswordHash);
        Assert.True(PasswordHasher.Verify("SecretPlaintextPassword123!", userInDb.PasswordHash));
    }

    [Fact]
    public async Task Register_DuplicateUsername_ThrowsInvalidOperationException()
    {
        var request1 = new RegisterRequestDto
        {
            Username = "duplicateuser",
            Email = "user1@example.com",
            Password = "Password123!",
            FullName = "User One"
        };
        await _authService.RegisterAsync(request1);

        var request2 = new RegisterRequestDto
        {
            Username = "duplicateuser",
            Email = "user2@example.com",
            Password = "Password123!",
            FullName = "User Two"
        };

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => _authService.RegisterAsync(request2));
        Assert.Contains("Username is already taken", ex.Message);
    }

    [Fact]
    public async Task Register_DuplicateEmail_ThrowsInvalidOperationException()
    {
        var request1 = new RegisterRequestDto
        {
            Username = "user1",
            Email = "same@example.com",
            Password = "Password123!",
            FullName = "User One"
        };
        await _authService.RegisterAsync(request1);

        var request2 = new RegisterRequestDto
        {
            Username = "user2",
            Email = "same@example.com",
            Password = "Password123!",
            FullName = "User Two"
        };

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => _authService.RegisterAsync(request2));
        Assert.Contains("Email is already registered", ex.Message);
    }

    [Fact]
    public async Task PendingTechnician_CannotLogin_ReturnsNull()
    {
        var request = new RegisterRequestDto
        {
            Username = "pendinguser",
            Email = "pending@example.com",
            Password = "ValidPassword123!",
            FullName = "Pending User"
        };
        await _authService.RegisterAsync(request);

        var loginResult = await _authService.LoginAsync(new LoginRequestDto
        {
            UsernameOrEmail = "pendinguser",
            Password = "ValidPassword123!"
        });

        Assert.Null(loginResult);
    }

    [Fact]
    public async Task Admin_CanListAllUsers_ExcludesPasswords()
    {
        await _authService.RegisterAsync(new RegisterRequestDto
        {
            Username = "user1",
            Email = "user1@example.com",
            Password = "Password123!",
            FullName = "User One"
        });

        var users = (await _adminService.GetAllUsersAsync()).ToList();

        Assert.NotEmpty(users);
        var u1 = users.First(u => u.Username == "user1");
        Assert.Equal("user1@example.com", u1.Email);
        Assert.False(u1.IsActive);
        Assert.Contains(AppRoles.Technician, u1.Roles);
    }

    [Fact]
    public async Task Admin_CanApproveAndActivateUser_AllowsSubsequentLogin()
    {
        var reg = await _authService.RegisterAsync(new RegisterRequestDto
        {
            Username = "approveduser",
            Email = "approved@example.com",
            Password = "ValidPassword123!",
            FullName = "Approved User"
        });

        // 1. Before approval: login fails
        var beforeApproval = await _authService.LoginAsync(new LoginRequestDto
        {
            UsernameOrEmail = "approveduser",
            Password = "ValidPassword123!"
        });
        Assert.Null(beforeApproval);

        // 2. Admin approves user
        var updated = await _adminService.UpdateUserStatusAsync(reg.UserId, new DTOs.Admin.UpdateUserStatusDto
        {
            IsActive = true
        });

        Assert.NotNull(updated);
        Assert.True(updated.IsActive);

        // 3. After approval: login succeeds and returns JWT
        var afterApproval = await _authService.LoginAsync(new LoginRequestDto
        {
            UsernameOrEmail = "approveduser",
            Password = "ValidPassword123!"
        });

        Assert.NotNull(afterApproval);
        Assert.False(string.IsNullOrWhiteSpace(afterApproval.AccessToken));
        Assert.Equal("approveduser", afterApproval.User.Username);
    }

    [Fact]
    public async Task Admin_UpdateStatus_NonExistentUser_ReturnsNull()
    {
        var result = await _adminService.UpdateUserStatusAsync(Guid.NewGuid(), new DTOs.Admin.UpdateUserStatusDto
        {
            IsActive = true
        });

        Assert.Null(result);
    }

    public void Dispose() => _db.Dispose();
}
