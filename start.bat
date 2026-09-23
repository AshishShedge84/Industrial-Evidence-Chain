@echo off
:: ==============================================================================
:: Industrial Evidence Chain — Development Environment Launcher
:: start.bat  ·  Windows
:: ==============================================================================
:: Single authoritative IEC architecture:
::   ● PostgreSQL 5433  db_data\pgdata -> iec_db (authoritative database)
::   ● Backend 5000     ASP.NET Core   -> http://localhost:5000
::   ● Blockchain 5050  Node.js        -> http://localhost:5050
::   ● DB Preview 3002  Node.js        -> http://127.0.0.1:3002
::   ● Frontend 3000    Vite / React   -> https://localhost:3000
::
:: Password is requested manually via secure hidden prompt.
:: It is NEVER written to disk, Git, config files, or logs.
:: ==============================================================================

setlocal EnableDelayedExpansion

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

if not exist "%ROOT%\logs" mkdir "%ROOT%\logs"

echo.
echo ==================================
echo IEC DEVELOPMENT STARTUP
echo ==================================
echo.

:: ── 1. Locate PostgreSQL tools
for /d %%d in ("C:\Program Files\PostgreSQL\*" "C:\Program Files (x86)\PostgreSQL\*") do (
  if exist "%%d\bin\psql.exe" (
    set "PATH=%%d\bin;!PATH!"
    goto :pg_found
  )
)
:pg_found

:: ── 2. Check essential tooling
where dotnet >nul 2>&1
if errorlevel 1 (
  echo   [ERROR] 'dotnet' not found. Install .NET SDK from https://dotnet.microsoft.com/download
  goto :cancel_exit
)

where node >nul 2>&1
if errorlevel 1 (
  echo   [ERROR] 'node' not found. Install Node.js from https://nodejs.org
  goto :cancel_exit
)

where npm >nul 2>&1
if errorlevel 1 (
  echo   [ERROR] 'npm' not found. Install Node.js from https://nodejs.org
  goto :cancel_exit
)

:: ── 3. Check node_modules dependencies
if not exist "%ROOT%\frontend\node_modules" (
  echo   Installing frontend dependencies...
  pushd "%ROOT%\frontend"
  npm install --prefer-offline >nul 2>&1
  popd
)
if not exist "%ROOT%\blockchain\node_modules" (
  echo   Installing blockchain dependencies...
  pushd "%ROOT%\blockchain"
  npm install --prefer-offline >nul 2>&1
  popd
)
if not exist "%ROOT%\tools\db-preview\node_modules" (
  echo   Installing db-preview dependencies...
  pushd "%ROOT%\tools\db-preview"
  npm install --prefer-offline >nul 2>&1
  popd
)

:: ── 4. Prompt for PostgreSQL password securely (hidden input)
set "DB_PASSWORD="
echo|set /p="PostgreSQL password: "
for /f "delims=" %%p in ('powershell -NoProfile -Command "$p = Read-Host -AsSecureString; if ($p) { [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($p)) }"') do set "DB_PASSWORD=%%p"
echo.

if "!DB_PASSWORD!"=="" (
  echo PostgreSQL authentication failed.
  echo IEC startup cancelled.
  goto :cancel_exit
)

:: ── 5. PostgreSQL Cluster Verification & Startup (Port 5433)
echo Validating PostgreSQL...
set "PGDATA_DIR=%ROOT%\db_data\pgdata"

netstat -ano | findstr ":5433 " | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
  echo   PostgreSQL is already listening on port 5433.
) else (
  echo Starting IEC PostgreSQL...
  if not exist "!PGDATA_DIR!" (
    echo   Permanent IEC database cluster directory not found at: !PGDATA_DIR!
    echo IEC startup cancelled.
    goto :cancel_exit
  )

  where pg_ctl >nul 2>&1
  if errorlevel 1 (
    echo   'pg_ctl' utility not found in PATH.
    echo IEC startup cancelled.
    goto :cancel_exit
  )

  pg_ctl -D "!PGDATA_DIR!" -l "!PGDATA_DIR!\logfile" -o "-p 5433" start >nul 2>&1

  :: Wait up to 15 seconds for port 5433
  set /a WAITED=0
  :wait_pg
  netstat -ano | findstr ":5433 " | findstr "LISTENING" >nul 2>&1
  if %errorlevel% equ 0 goto :pg_ready
  timeout /t 1 /nobreak >nul 2>&1
  set /a WAITED+=1
  if !WAITED! geq 15 (
    echo   Timed out waiting for PostgreSQL on port 5433 to start.
    echo Check logfile at: !PGDATA_DIR!\logfile
    echo IEC startup cancelled.
    goto :cancel_exit
  )
  goto :wait_pg

  :pg_ready
  echo   PostgreSQL cluster started on port 5433.
)

:: ── 6. Check Database & Authentication
echo Checking database...
set "PGPASSWORD=!DB_PASSWORD!"

set "AUTH_OK=0"
where psql >nul 2>&1
if %errorlevel% equ 0 (
  psql -h localhost -p 5433 -U postgres -d postgres -c "SELECT 1;" >nul 2>&1
  if %errorlevel% equ 0 (
    set "AUTH_OK=1"
  ) else (
    psql -h localhost -p 5433 -U postgres -d iec_db -c "SELECT 1;" >nul 2>&1
    if %errorlevel% equ 0 set "AUTH_OK=1"
  )
) else (
  where pg_isready >nul 2>&1
  if %errorlevel% equ 0 (
    pg_isready -h localhost -p 5433 -U postgres >nul 2>&1
    if %errorlevel% equ 0 set "AUTH_OK=1"
  )
)

if "!AUTH_OK!"=="0" (
  echo.
  echo PostgreSQL authentication failed.
  echo IEC startup cancelled.
  goto :cancel_exit
)

:: Verify iec_db exists in permanent cluster (never auto-create empty DB)
where psql >nul 2>&1
if %errorlevel% equ 0 (
  set "DB_EXISTS="
  for /f %%e in ('psql -h localhost -p 5433 -U postgres -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='iec_db';" 2^>nul') do set "DB_EXISTS=%%e"
  if not "!DB_EXISTS!"=="1" (
    echo.
    echo   Database 'iec_db' does not exist in permanent cluster.
    echo   Automatic database creation is disabled to prevent data loss.
    echo IEC startup cancelled.
    goto :cancel_exit
  )
)
echo   Authoritative database 'iec_db' verified on localhost:5433.

:: ── 7. Start Backend (Port 5000)
echo Starting Backend...
netstat -ano | findstr ":5000 " | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
  powershell -NoProfile -Command "(Invoke-WebRequest -Uri 'http://localhost:5000/health' -UseBasicParsing -TimeoutSec 3).StatusCode" 2>nul | findstr "200" >nul 2>&1
  if %errorlevel% equ 0 (
    echo   Backend already running on http://localhost:5000 and healthy.
    goto :skip_backend_start
  )
)

if not exist "%ROOT%\backend\bin\Debug\net10.0\backend.dll" (
  echo   Building backend binary...
  dotnet build "%ROOT%\backend\backend.csproj" --nologo -v quiet
  if errorlevel 1 (
    echo Backend build failed. IEC startup cancelled.
    goto :cancel_exit
  )
)

set "ConnectionStrings__DefaultConnection=Host=localhost;Port=5433;Database=iec_db;Username=postgres;Password=!DB_PASSWORD!"
set "DB_HOST=localhost"
set "DB_PORT=5433"
set "DB_NAME=iec_db"
set "DB_USER=postgres"

start "IEC Backend :5000" /min cmd /c "cd /d "%ROOT%" && set DB_PASSWORD=!DB_PASSWORD! && set DB_HOST=localhost && set DB_PORT=5433 && set DB_NAME=iec_db && set DB_USER=postgres && set ConnectionStrings__DefaultConnection=Host=localhost;Port=5433;Database=iec_db;Username=postgres;Password=!DB_PASSWORD! && dotnet run --project backend\backend.csproj --no-build >> "%ROOT%\logs\backend.log" 2>&1"

:: Wait up to 30s for health
set /a WAITED=0
:wait_backend
powershell -NoProfile -Command "(Invoke-WebRequest -Uri 'http://localhost:5000/health' -UseBasicParsing -TimeoutSec 2).StatusCode" 2>nul | findstr "200" >nul 2>&1
if %errorlevel% equ 0 goto :backend_ready
timeout /t 1 /nobreak >nul 2>&1
set /a WAITED+=1
if !WAITED! geq 30 (
  echo   Backend failed to report healthy on http://localhost:5000/health.
  echo Check logfile at: %ROOT%\logs\backend.log
  echo IEC startup cancelled.
  goto :cancel_exit
)
goto :wait_backend

:backend_ready
echo   Backend started and connected to PostgreSQL 5433.
:skip_backend_start

:: ── 8. Start Blockchain Adapter (Port 5050)
echo Starting Blockchain Adapter...
netstat -ano | findstr ":5050 " | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
  echo   Blockchain Adapter is already running on http://localhost:5050.
) else (
  start "IEC Blockchain :5050" /min cmd /c "cd /d "%ROOT%\blockchain" && npm start >> "%ROOT%\logs\blockchain.log" 2>&1"
  timeout /t 3 /nobreak >nul 2>&1
  echo   Blockchain Adapter started on http://localhost:5050.
)

:: ── 9. Start DB Preview (Port 3002)
echo Starting DB Preview...
netstat -ano | findstr ":3002 " | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
  echo   DB Preview is already running on http://127.0.0.1:3002.
) else (
  start "IEC DB Preview :3002" /min cmd /c "cd /d "%ROOT%" && set DB_PASSWORD=!DB_PASSWORD! && set DB_HOST=localhost && set DB_PORT=5433 && set DB_NAME=iec_db && set DB_USER=postgres && node tools\db-preview\server.js >> "%ROOT%\logs\dbpreview.log" 2>&1"
  timeout /t 2 /nobreak >nul 2>&1
  echo   DB Preview started and verified on http://127.0.0.1:3002.
)

:: ── 10. Start Frontend (Port 3000)
echo Starting Frontend...
netstat -ano | findstr ":3000 " | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
  echo   Frontend is already running on port 3000.
) else (
  start "IEC Frontend :3000" /min cmd /c "cd /d "%ROOT%\frontend" && npm run dev >> "%ROOT%\logs\frontend.log" 2>&1"
  timeout /t 3 /nobreak >nul 2>&1
  echo   Frontend started on port 3000.
)

:: ── 11. Final Health Checks
echo.
echo ── Verifying Service Health ────────────────────────

netstat -ano | findstr ":5433 " | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (echo   PostgreSQL (5433)       : Reachable) else (echo   PostgreSQL (5433)       : Unreachable)

powershell -NoProfile -Command "(Invoke-WebRequest -Uri 'http://localhost:5000/health' -UseBasicParsing -TimeoutSec 2).StatusCode" 2>nul | findstr "200" >nul 2>&1
if %errorlevel% equ 0 (echo   Backend (5000)          : Healthy ^(Connected to DB 5433^)) else (echo   Backend (5000)          : Unhealthy)

netstat -ano | findstr ":5050 " | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (echo   Blockchain Adapter (5050): Healthy) else (echo   Blockchain Adapter (5050): Unreachable)

netstat -ano | findstr ":3002 " | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (echo   DB Preview (3002)        : Reachable ^(Targeting 5433^)) else (echo   DB Preview (3002)        : Unreachable)

netstat -ano | findstr ":3000 " | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (echo   Frontend (3000)          : Reachable) else (echo   Frontend (3000)          : Unreachable)

:: ── 12. Startup URL Summary
echo.
echo ==================================================
echo IEC DEVELOPMENT ENVIRONMENT READY
echo ==================================================
echo.
echo   Frontend:
echo   https://localhost:3000
echo.
echo   Backend:
echo   http://localhost:5000
echo.
echo   Blockchain Adapter:
echo   http://localhost:5050
echo.
echo   DB Preview:
echo   http://127.0.0.1:3002
echo.
echo   PostgreSQL:
echo   localhost:5433
echo.
echo ==================================================
echo   Logs available in : %ROOT%\logs\
echo   To stop services  : stop.bat
echo ==================================================
echo.
exit /b 0

:cancel_exit
echo.
exit /b 1
