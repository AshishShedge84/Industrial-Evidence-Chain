using System.Text;
using backend.Data;
using backend.Middleware;
using backend.Models;
using backend.Services;
using backend.Services.Interfaces;
using backend.Settings;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddJsonFile("appsettings.Development.local.json", optional: true, reloadOnChange: true);

// ── Database (Strict Port 5433 / iec_db Authority) ────────────────────────────
var rawConnectionString = builder.Configuration.GetConnectionString("DefaultConnection") ?? string.Empty;

var dbUser = Environment.GetEnvironmentVariable("DB_USER") ?? "postgres";
var dbPassword = Environment.GetEnvironmentVariable("DB_PASSWORD")
                 ?? Environment.GetEnvironmentVariable("POSTGRES_PASSWORD")
                 ?? string.Empty;

// Strictly enforce IEC Port 5433 and iec_db
var dbHost = "localhost";
var dbPort = "5433";
var dbName = "iec_db";

var envPort = Environment.GetEnvironmentVariable("DB_PORT");
if (!string.IsNullOrEmpty(envPort) && envPort != "5433")
{
    Console.ForegroundColor = ConsoleColor.Yellow;
    Console.WriteLine($"[IEC Backend] WARNING: Disallowed DB_PORT '{envPort}' detected. Strictly enforcing authoritative IEC Port 5433.");
    Console.ResetColor();
}

var envName = Environment.GetEnvironmentVariable("DB_NAME");
if (!string.IsNullOrEmpty(envName) && envName != "iec_db")
{
    Console.ForegroundColor = ConsoleColor.Yellow;
    Console.WriteLine($"[IEC Backend] WARNING: Disallowed DB_NAME '{envName}' detected. Strictly enforcing authoritative IEC Database 'iec_db'.");
    Console.ResetColor();
}

var resolvedConnectionString = rawConnectionString
    .Replace("${DB_USER}", dbUser)
    .Replace("${DB_PASSWORD}", dbPassword);

// Enforce Host, Port, Database in connection string
resolvedConnectionString = System.Text.RegularExpressions.Regex.Replace(resolvedConnectionString, @"Host=[^;]+", $"Host={dbHost}");
resolvedConnectionString = System.Text.RegularExpressions.Regex.Replace(resolvedConnectionString, @"Port=[^;]+", $"Port={dbPort}");
resolvedConnectionString = System.Text.RegularExpressions.Regex.Replace(resolvedConnectionString, @"Database=[^;]+", $"Database={dbName}");

if (!string.IsNullOrEmpty(dbPassword) && !resolvedConnectionString.Contains($"Password={dbPassword}"))
{
    resolvedConnectionString = System.Text.RegularExpressions.Regex.Replace(resolvedConnectionString, @"Password=[^;]*", $"Password={dbPassword}");
}

builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseNpgsql(resolvedConnectionString);
    options.ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
});

// ── JWT Settings ──────────────────────────────────────────────────────────────
builder.Services.Configure<JwtSettings>(
    builder.Configuration.GetSection(JwtSettings.SectionName));

var jwtSettings = builder.Configuration
    .GetSection(JwtSettings.SectionName)
    .Get<JwtSettings>()!;

// ── Authentication — JWT Bearer ───────────────────────────────────────────────
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme    = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer           = true,
        ValidateAudience         = true,
        ValidateLifetime         = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer              = jwtSettings.Issuer,
        ValidAudience            = jwtSettings.Audience,
        IssuerSigningKey         = new SymmetricSecurityKey(
                                       Encoding.UTF8.GetBytes(jwtSettings.Secret)),
        ClockSkew                = TimeSpan.Zero
    };
});

// ── Authorization Policies ────────────────────────────────────────────────────
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("RequireAdmin", policy => policy.RequireRole(AppRoles.Admin));
    options.AddPolicy("RequireManager", policy => policy.RequireRole(AppRoles.Manager, AppRoles.Admin));
    options.AddPolicy("RequireTechnician", policy => policy.RequireRole(AppRoles.Technician, AppRoles.Admin));
    options.AddPolicy("RequireAuditor", policy => policy.RequireRole(AppRoles.Auditor, AppRoles.Admin));
    options.AddPolicy("RequireEvidenceCreator", policy => policy.RequireRole(AppRoles.Technician, AppRoles.Manager, AppRoles.Admin));
});

// ── CORS Configuration ────────────────────────────────────────────────────────
builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendDev", policy =>
    {
        policy.SetIsOriginAllowed(origin =>
        {
            if (string.IsNullOrEmpty(origin)) return false;

            if (Uri.TryCreate(origin, UriKind.Absolute, out var uri))
            {
                var host = uri.Host;
                // Allow localhost and local loopbacks (HTTP and HTTPS)
                if (host == "localhost" || host == "127.0.0.1" || host == "::1")
                    return true;

                // Allow RFC 1918 private development LAN ranges:
                // 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
                if (System.Net.IPAddress.TryParse(host, out var ip))
                {
                    var bytes = ip.GetAddressBytes();
                    if (bytes.Length == 4)
                    {
                        if (bytes[0] == 10) return true;
                        if (bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31) return true;
                        if (bytes[0] == 192 && bytes[1] == 168) return true;
                    }
                }
            }
            return false;
        })
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials();
    });
});

// ── Global Exception Handling ─────────────────────────────────────────────────
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

// ── Application Services ──────────────────────────────────────────────────────
builder.Services.Configure<FileStorageSettings>(
    builder.Configuration.GetSection(FileStorageSettings.SectionName));

builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IAdminService, AdminService>();
builder.Services.AddScoped<IAssetService, AssetService>();
builder.Services.AddScoped<IEvidenceService, EvidenceService>();
builder.Services.AddScoped<IAuditLogService, AuditLogService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddSingleton<IEvidenceHasher, EvidenceHasher>();
builder.Services.AddScoped<IFileStorageService, LocalFileStorageService>();
builder.Services.AddSingleton<IBlockchainAdapter, MockBlockchainAdapter>();

// ── Controllers ───────────────────────────────────────────────────────────────
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });

// ── OpenAPI / Swagger ─────────────────────────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title   = "Industrial Evidence Chain API",
        Version = "v1"
    });

    // JWT Bearer security definition — allows testing authenticated endpoints via Swagger UI
    var jwtScheme = new OpenApiSecurityScheme
    {
        Name         = "Authorization",
        Type         = SecuritySchemeType.Http,
        Scheme       = "bearer",
        BearerFormat = "JWT",
        In           = ParameterLocation.Header,
        Description  = "Enter your JWT token (without 'Bearer ' prefix).",
        Reference    = new OpenApiReference
        {
            Id   = JwtBearerDefaults.AuthenticationScheme,
            Type = ReferenceType.SecurityScheme
        }
    };
    options.AddSecurityDefinition(JwtBearerDefaults.AuthenticationScheme, jwtScheme);
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        { jwtScheme, Array.Empty<string>() }
    });
});

var app = builder.Build();

// ── HTTP Pipeline ─────────────────────────────────────────────────────────────
app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "IEC API v1"));
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

// ── Static Files for Uploaded Evidence Media ──────────────────────────────────
var uploadsPath = Environment.GetEnvironmentVariable("UPLOADED_MEDIA_PATH");
if (string.IsNullOrWhiteSpace(uploadsPath) || !Directory.Exists(uploadsPath))
{
    var candidate = Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, "..", "Uploaded Media"));
    uploadsPath = Directory.Exists(candidate) ? candidate : Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, "Uploaded Media"));
}
if (!Directory.Exists(uploadsPath))
{
    Directory.CreateDirectory(uploadsPath);
}

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(uploadsPath),
    RequestPath = "/uploads",
    ServeUnknownFileTypes = true
});

app.UseCors("FrontendDev");
app.UseAuthentication();
app.UseAuthorization();

// ── Health Check Endpoint ─────────────────────────────────────────────────────
app.MapGet("/health", async (AppDbContext db) =>
{
    try
    {
        var canConnect = await db.Database.CanConnectAsync();
        if (!canConnect)
        {
            return Results.Json(new { status = "unhealthy", database = "disconnected", port = 5433, db = "iec_db" }, statusCode: 503);
        }
        return Results.Ok(new { status = "healthy", database = "connected", port = 5433, db = "iec_db" });
    }
    catch (Exception ex)
    {
        return Results.Json(new { status = "unhealthy", error = ex.Message, port = 5433, db = "iec_db" }, statusCode: 503);
    }
});

app.MapControllers();

// ── Database Auto-Migration & Seeding ─────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var dbContext = services.GetRequiredService<AppDbContext>();
    var config = services.GetRequiredService<IConfiguration>();
    var logger = services.GetRequiredService<ILoggerFactory>().CreateLogger("DbInitializer");
    await DbInitializer.SeedAsync(dbContext, config, logger);
}

app.Run();

