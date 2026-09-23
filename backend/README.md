# ASP.NET Core Backend — Secrets & Configuration Guide

## Database Secrets Configuration

To maintain strict security compliance (**SEC-04**), plaintext database credentials are never committed to version control. Configuration is loaded from environment variables, User Secrets, or template parameters.

### Option 1: Environment Variables (Recommended for CLI & CI/CD)

Set your PostgreSQL credentials via environment variables:

#### PowerShell:
```powershell
$env:DB_USER="postgres"
$env:DB_PASSWORD="YourActualPassword"
dotnet run --project backend
```

#### Bash / Linux / macOS:
```bash
export DB_USER="postgres"
export DB_PASSWORD="YourActualPassword"
dotnet run --project backend
```

Alternatively, supply the standard ASP.NET Core connection string environment variable:
```powershell
$env:ConnectionStrings__DefaultConnection="Host=localhost;Port=5433;Database=iec_db;Username=postgres;Password=YourPassword"
```

---

### Option 2: .NET User Secrets (Recommended for Local Visual Studio / VS Code Development)

Store your local developer password securely in your local user profile outside the repository:

```powershell
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5433;Database=iec_db;Username=postgres;Password=YourPassword" --project backend
```

---

### Option 3: Local Unversioned Configuration File

Create a local override file `backend/appsettings.Development.local.json` (ignored by `.gitignore`):

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5433;Database=iec_db;Username=postgres;Password=YourPassword"
  }
}
```
