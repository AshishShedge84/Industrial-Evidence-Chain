using backend.Helpers;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Data;

public static class DbInitializer
{
    public static async Task SeedAsync(AppDbContext context, IConfiguration configuration, ILogger logger)
    {
        try
        {
            if (!await context.Database.CanConnectAsync())
            {
                logger.LogError("[IEC Database] FATAL: Cannot connect to authoritative database 'iec_db' on localhost:5433. Startup aborted to prevent creating a fresh empty database.");
                throw new InvalidOperationException("Authoritative database 'iec_db' on localhost:5433 is unreachable. Startup aborted.");
            }

            await context.Database.MigrateAsync();

            // 1. Seed Roles
            var roleNames = new[] { AppRoles.Admin, AppRoles.Manager, AppRoles.Technician, AppRoles.Auditor };
            var roleMap = new Dictionary<string, Role>();

            foreach (var roleName in roleNames)
            {
                var role = await context.Roles.FirstOrDefaultAsync(r => r.Name == roleName);
                if (role == null)
                {
                    role = new Role
                    {
                        RoleId = Guid.NewGuid(),
                        Name = roleName,
                        Description = $"{roleName} role"
                    };
                    context.Roles.Add(role);
                    await context.SaveChangesAsync();
                }
                roleMap[roleName] = role;
            }

            // 2. Default Seed Users
            var defaultPassword = "password123";
            var defaultUsers = new[]
            {
                new { Username = "admin", Email = "admin@iec.app", FullName = "Admin User", Role = AppRoles.Admin },
                new { Username = "tech", Email = "tech@iec.app", FullName = "John Smith", Role = AppRoles.Technician },
                new { Username = "manager", Email = "manager@iec.app", FullName = "Sarah Connor", Role = AppRoles.Manager },
                new { Username = "auditor", Email = "auditor@iec.app", FullName = "Michael Chen", Role = AppRoles.Auditor },
            };

            foreach (var u in defaultUsers)
            {
                var existing = await context.Users
                    .Include(x => x.UserRoles)
                    .FirstOrDefaultAsync(x => x.Email == u.Email || x.Username == u.Username);

                if (existing == null)
                {
                    var user = new User
                    {
                        UserId = Guid.NewGuid(),
                        Username = u.Username,
                        Email = u.Email,
                        FullName = u.FullName,
                        PasswordHash = PasswordHasher.Hash(defaultPassword),
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    };
                    context.Users.Add(user);

                    context.UserRoles.Add(new UserRole
                    {
                        UserRoleId = Guid.NewGuid(),
                        UserId = user.UserId,
                        RoleId = roleMap[u.Role].RoleId,
                        AssignedAt = DateTime.UtcNow
                    });

                    await context.SaveChangesAsync();
                    logger.LogInformation("Seeded user {Email} ({Role})", u.Email, u.Role);
                }
            }

            // 3. Optional Bootstrap Admin from Environment
            var bootstrapPassword = Environment.GetEnvironmentVariable("ADMIN_BOOTSTRAP_PASSWORD");
            if (!string.IsNullOrWhiteSpace(bootstrapPassword) && bootstrapPassword.Length >= 6)
            {
                var adminTest = await context.Users
                    .Include(x => x.UserRoles)
                    .FirstOrDefaultAsync(x => x.Username == "admin_test" || x.Email == "admin.test@iec.app");

                if (adminTest == null)
                {
                    var user = new User
                    {
                        UserId = Guid.NewGuid(),
                        Username = "admin_test",
                        Email = "admin.test@iec.app",
                        FullName = "Admin Test",
                        PasswordHash = PasswordHasher.Hash(bootstrapPassword),
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    };
                    context.Users.Add(user);

                    context.UserRoles.Add(new UserRole
                    {
                        UserRoleId = Guid.NewGuid(),
                        UserId = user.UserId,
                        RoleId = roleMap[AppRoles.Admin].RoleId,
                        AssignedAt = DateTime.UtcNow
                    });

                    await context.SaveChangesAsync();
                    logger.LogInformation("Seeded bootstrap admin user admin.test@iec.app from ADMIN_BOOTSTRAP_PASSWORD");
                }
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Database seeding skipped or encountered a non-fatal error: {Message}", ex.Message);
        }
    }
}
