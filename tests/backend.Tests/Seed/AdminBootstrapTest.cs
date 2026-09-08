using System.Text.Json;
using backend.Data;
using backend.Helpers;
using backend.Models;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace backend.Tests.Seed;

public class AdminBootstrapTest
{
    private static string GetConnectionString()
    {
        // 1. Check environment variable override
        var envConn = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
                   ?? Environment.GetEnvironmentVariable("DEFAULT_CONNECTION");
        if (!string.IsNullOrWhiteSpace(envConn))
            return envConn;

        // 2. Deterministically traverse up from BaseDirectory / CurrentDirectory to find repository root containing backend/appsettings.Development.json
        var currentDir = new DirectoryInfo(AppContext.BaseDirectory);
        while (currentDir != null)
        {
            var devJsonPath = Path.Combine(currentDir.FullName, "backend", "appsettings.Development.json");
            if (File.Exists(devJsonPath))
            {
                using var doc = JsonDocument.Parse(File.ReadAllText(devJsonPath));
                if (doc.RootElement.TryGetProperty("ConnectionStrings", out var connSection) &&
                    connSection.TryGetProperty("DefaultConnection", out var defaultConn))
                {
                    var connStr = defaultConn.GetString();
                    if (!string.IsNullOrWhiteSpace(connStr) && !connStr.Contains("YOUR_DB_PASSWORD"))
                        return ResolvePlaceholders(connStr);
                }
            }

            // Also check if currentDir itself is the backend directory
            var localDevJson = Path.Combine(currentDir.FullName, "appsettings.Development.json");
            if (File.Exists(localDevJson))
            {
                using var doc = JsonDocument.Parse(File.ReadAllText(localDevJson));
                if (doc.RootElement.TryGetProperty("ConnectionStrings", out var connSection) &&
                    connSection.TryGetProperty("DefaultConnection", out var defaultConn))
                {
                    var connStr = defaultConn.GetString();
                    if (!string.IsNullOrWhiteSpace(connStr) && !connStr.Contains("YOUR_DB_PASSWORD"))
                        return ResolvePlaceholders(connStr);
                }
            }

            currentDir = currentDir.Parent;
        }

        // 3. Fallback: check working directory directly
        var cwdDevJson = Path.Combine(Directory.GetCurrentDirectory(), "backend", "appsettings.Development.json");
        if (File.Exists(cwdDevJson))
        {
            using var doc = JsonDocument.Parse(File.ReadAllText(cwdDevJson));
            if (doc.RootElement.TryGetProperty("ConnectionStrings", out var connSection) &&
                connSection.TryGetProperty("DefaultConnection", out var defaultConn))
            {
                var connStr = defaultConn.GetString();
                if (!string.IsNullOrWhiteSpace(connStr) && !connStr.Contains("YOUR_DB_PASSWORD"))
                    return ResolvePlaceholders(connStr);
            }
        }

        throw new InvalidOperationException(
            "Could not resolve a valid PostgreSQL connection string from environment or backend/appsettings.Development.json.");
    }

    private static string ResolvePlaceholders(string connStr)
    {
        var dbUser = Environment.GetEnvironmentVariable("DB_USER") ?? "postgres";
        var dbPassword = Environment.GetEnvironmentVariable("DB_PASSWORD")
                         ?? Environment.GetEnvironmentVariable("POSTGRES_PASSWORD")
                         ?? string.Empty;
        var dbHost = Environment.GetEnvironmentVariable("DB_HOST");
        var dbPort = Environment.GetEnvironmentVariable("DB_PORT");
        var dbName = Environment.GetEnvironmentVariable("DB_NAME");

        var resolved = connStr
            .Replace("${DB_USER}", dbUser)
            .Replace("${DB_PASSWORD}", dbPassword);

        if (!string.IsNullOrEmpty(dbHost))
            resolved = System.Text.RegularExpressions.Regex.Replace(resolved, @"Host=[^;]+", $"Host={dbHost}");
        if (!string.IsNullOrEmpty(dbPort))
            resolved = System.Text.RegularExpressions.Regex.Replace(resolved, @"Port=[^;]+", $"Port={dbPort}");
        if (!string.IsNullOrEmpty(dbName))
            resolved = System.Text.RegularExpressions.Regex.Replace(resolved, @"Database=[^;]+", $"Database={dbName}");

        return resolved;
    }

    [Fact(Skip = "Integration test requiring live database and ADMIN_BOOTSTRAP_PASSWORD")]
    public async Task BootstrapAdminUser_PostgreSQL()
    {
        // Enforce runtime-only password provision; strictly no hardcoded fallback
        var adminPassword = Environment.GetEnvironmentVariable("ADMIN_BOOTSTRAP_PASSWORD");
        if (string.IsNullOrWhiteSpace(adminPassword))
        {
            throw new InvalidOperationException(
                "ADMIN_BOOTSTRAP_PASSWORD environment variable is missing or empty. " +
                "Set $env:ADMIN_BOOTSTRAP_PASSWORD before running this bootstrap test.");
        }

        if (adminPassword.Length < 6)
        {
            throw new ArgumentException(
                "Admin password must be at least 6 characters long to meet minimum security requirements.");
        }

        var connectionString = GetConnectionString();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(connectionString)
            .Options;

        using var db = new AppDbContext(options);

        // 1. Ensure Admin role exists
        var adminRole = await db.Roles.FirstOrDefaultAsync(r => r.Name == AppRoles.Admin);
        if (adminRole == null)
        {
            adminRole = new Role
            {
                RoleId = Guid.NewGuid(),
                Name = AppRoles.Admin,
                Description = "Administrator role"
            };
            db.Roles.Add(adminRole);
            await db.SaveChangesAsync();
        }

        // 2. Ensure admin_test user exists without modifying any existing accounts
        var existingUser = await db.Users
            .Include(u => u.UserRoles)
            .FirstOrDefaultAsync(u => u.Username == "admin_test" || u.Email == "admin.test@iec.app");

        if (existingUser == null)
        {
            var adminUser = new User
            {
                UserId = Guid.NewGuid(),
                Username = "admin_test",
                Email = "admin.test@iec.app",
                FullName = "Admin Test",
                PasswordHash = PasswordHasher.Hash(adminPassword),
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            db.Users.Add(adminUser);

            db.UserRoles.Add(new UserRole
            {
                UserRoleId = Guid.NewGuid(),
                UserId = adminUser.UserId,
                RoleId = adminRole.RoleId,
                AssignedAt = DateTime.UtcNow
            });

            await db.SaveChangesAsync();
        }
    }
}
