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

// ── Database ──────────────────────────────────────────────────────────────────
var rawConnectionString = builder.Configuration.GetConnectionString("DefaultConnection") ?? string.Empty;

// Interpolate environment variables if placeholders exist (e.g. ${DB_USER}, ${DB_PASSWORD})
var dbUser = Environment.GetEnvironmentVariable("DB_USER") ?? "postgres";
var dbPassword = Environment.GetEnvironmentVariable("DB_PASSWORD")
                 ?? Environment.GetEnvironmentVariable("POSTGRES_PASSWORD")
                 ?? string.Empty;
var dbHost = Environment.GetEnvironmentVariable("DB_HOST");
var dbPort = Environment.GetEnvironmentVariable("DB_PORT");
var dbName = Environment.GetEnvironmentVariable("DB_NAME");

var resolvedConnectionString = rawConnectionString
    .Replace("${DB_USER}", dbUser)
    .Replace("${DB_PASSWORD}", dbPassword);

if (!string.IsNullOrEmpty(dbHost))
    resolvedConnectionString = System.Text.RegularExpressions.Regex.Replace(resolvedConnectionString, @"Host=[^;]+", $"Host={dbHost}");
if (!string.IsNullOrEmpty(dbPort))
    resolvedConnectionString = System.Text.RegularExpressions.Regex.Replace(resolvedConnectionString, @"Port=[^;]+", $"Port={dbPort}");
if (!string.IsNullOrEmpty(dbName))
    resolvedConnectionString = System.Text.RegularExpressions.Regex.Replace(resolvedConnectionString, @"Database=[^;]+", $"Database={dbName}");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(resolvedConnectionString));

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
        policy.SetIsOriginAllowed(_ => true)
              .WithMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
              .WithHeaders("Authorization", "Content-Type");
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
builder.Services.AddSingleton<IEvidenceHasher, EvidenceHasher>();
builder.Services.AddScoped<IFileStorageService, LocalFileStorageService>();
builder.Services.AddSingleton<IBlockchainAdapter, MockBlockchainAdapter>();

// ── Controllers ───────────────────────────────────────────────────────────────
builder.Services.AddControllers();

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
var uploadsPath = Path.Combine(app.Environment.ContentRootPath, "uploads");
if (!Directory.Exists(uploadsPath))
{
    Directory.CreateDirectory(uploadsPath);
}
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(uploadsPath),
    RequestPath = "/uploads"
});

app.UseCors("FrontendDev");
app.UseAuthentication();
app.UseAuthorization();
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

