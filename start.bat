@echo off
:: ==============================================================================
:: Industrial Evidence Chain — Development Environment Launcher
:: start.bat  ·  Windows
:: ==============================================================================
:: Starts all IEC services in separate Command Prompt windows:
::   ● Backend          ASP.NET Core   →  http://localhost:5000
::   ● Frontend         Vite / React   →  http://localhost:3000
::   ● Blockchain       Node.js        →  http://localhost:5050
::   ● DB Preview       Node.js        →  http://localhost:3002   (dev tool only)
::
:: PostgreSQL password is prompted once and passed to services via env vars.
:: The password is NEVER written to disk, history, or any file.
::
:: On macOS / Linux: run ./start.sh instead (this file is for Windows).
:: ==============================================================================

setlocal EnableDelayedExpansion

set "ROOT=%~dp0"
:: Remove trailing backslash
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

echo.
echo  +============================================================+
echo  ^|   Industrial Evidence Chain -- Dev Environment Launcher   ^|
echo  +============================================================+
echo.

:: ── 1. Dependency checks ─────────────────────────────────────────────────────
echo  ── Checking dependencies
echo.

where dotnet >nul 2>&1
if errorlevel 1 (
  echo   [ERROR] 'dotnet' not found. Install .NET SDK from https://dotnet.microsoft.com/download
  goto :error_exit
)
for /f "tokens=*" %%v in ('dotnet --version 2^>nul') do echo   OK  dotnet %%v

where node >nul 2>&1
if errorlevel 1 (
  echo   [ERROR] 'node' not found. Install Node.js from https://nodejs.org
  goto :error_exit
)
for /f "tokens=*" %%v in ('node --version 2^>nul') do echo   OK  node %%v

where npm >nul 2>&1
if errorlevel 1 (
  echo   [ERROR] 'npm' not found. Install Node.js from https://nodejs.org
  goto :error_exit
)
for /f "tokens=*" %%v in ('npm --version 2^>nul') do echo   OK  npm %%v

:: Check node_modules for each service
if not exist "%ROOT%\frontend\node_modules" (
  echo   [WARN] frontend\node_modules missing. Running npm install...
  pushd "%ROOT%\frontend"
  npm install --prefer-offline
  popd
  if errorlevel 1 goto :error_exit
  echo   OK  Frontend dependencies installed.
)

if not exist "%ROOT%\blockchain\node_modules" (
  echo   [WARN] blockchain\node_modules missing. Running npm install...
  pushd "%ROOT%\blockchain"
  npm install --prefer-offline
  popd
  if errorlevel 1 goto :error_exit
  echo   OK  Blockchain dependencies installed.
)

if not exist "%ROOT%\tools\db-preview\node_modules" (
  echo   [WARN] tools\db-preview\node_modules missing. Running npm install...
  pushd "%ROOT%\tools\db-preview"
  npm install --prefer-offline
  popd
  if errorlevel 1 goto :error_exit
  echo   OK  DB Preview dependencies installed.
)

echo.

:: ── 2. Prompt for PostgreSQL password ────────────────────────────────────────
echo  ── PostgreSQL Authentication
echo.
echo   The following services connect to PostgreSQL (iec_db @ localhost:5433):
echo     * Backend (ASP.NET Core)
echo     * DB Preview (localhost:3002)
echo.
echo   [NOTE] Your password will NOT be saved to any file.
echo          It is passed to services as an in-memory environment variable.
echo.
set /p "DB_PASSWORD=  PostgreSQL password for 'postgres': "
echo.

if "!DB_PASSWORD!"=="" (
  echo   [ERROR] Password cannot be empty.
  goto :error_exit
)

:: Verify password using psql if available (optional)
where psql >nul 2>&1
if not errorlevel 1 (
  echo   Verifying password against iec_db...
  set "PGPASSWORD=!DB_PASSWORD!"
  psql -h localhost -p 5433 -U postgres -d iec_db -c "SELECT 1" >nul 2>&1
  if errorlevel 1 (
    echo   [ERROR] PostgreSQL authentication failed. Check credentials and try again.
    goto :error_exit
  )
  echo   OK  Connected to iec_db successfully.
) else (
  echo   [WARN] psql not found -- skipping password verification.
)

:: ── 3. Build backend if needed ───────────────────────────────────────────────
echo.
echo  ── Backend Build Check
echo.

if not exist "%ROOT%\backend\bin\Debug\net10.0\backend.dll" (
  echo   First run -- building backend (this may take ~30s)...
  dotnet build "%ROOT%\backend\backend.csproj" --nologo -v quiet
  if errorlevel 1 goto :error_exit
  echo   OK  Backend built.
) else (
  echo   OK  Backend binary found. Skipping build.
)

:: ── 4. Build connection string ───────────────────────────────────────────────
set "DB_HOST=%DB_HOST%"
if "!DB_HOST!"=="" set "DB_HOST=localhost"
set "DB_PORT_VAL=%DB_PORT%"
if "!DB_PORT_VAL!"=="" set "DB_PORT_VAL=5433"
set "DB_NAME=%DB_NAME%"
if "!DB_NAME!"=="" set "DB_NAME=iec_db"
set "DB_USER=%DB_USER%"
if "!DB_USER!"=="" set "DB_USER=postgres"

set "CONN_STR=Host=!DB_HOST!;Port=!DB_PORT_VAL!;Database=!DB_NAME!;Username=!DB_USER!;Password=!DB_PASSWORD!"

:: ── 5. Kill existing processes on required ports ──────────────────────────────
echo.
echo  ── Freeing ports
echo.

call :kill_port 5000 "Backend"
call :kill_port 3000 "Frontend"
call :kill_port 5050 "Blockchain"
call :kill_port 3002 "DB Preview"

:: ── 6. Launch services in separate windows ────────────────────────────────────
echo.
echo  ── Launching services
echo.

:: Backend
start "IEC Backend :5000" cmd /k "title IEC Backend :5000 && set ConnectionStrings__DefaultConnection=!CONN_STR! && set DB_PASSWORD=!DB_PASSWORD! && set DB_HOST=!DB_HOST! && set DB_PORT=!DB_PORT_VAL! && set DB_NAME=!DB_NAME! && set DB_USER=!DB_USER! && cd /d "%ROOT%\backend" && dotnet run --project backend.csproj --no-build"
echo   OK  Backend window opened     ^-^>  http://localhost:5000
timeout /t 1 /nobreak >nul

:: Frontend (no DB dependency)
start "IEC Frontend :3000" cmd /k "title IEC Frontend :3000 && cd /d "%ROOT%\frontend" && npm run dev"
echo   OK  Frontend window opened    ^-^>  http://localhost:3000
timeout /t 1 /nobreak >nul

:: Blockchain Adapter (no DB dependency)
start "IEC Blockchain :5050" cmd /k "title IEC Blockchain :5050 && cd /d "%ROOT%\blockchain" && npm start"
echo   OK  Blockchain window opened  ^-^>  http://localhost:5050
timeout /t 1 /nobreak >nul

:: DB Preview
start "IEC DB Preview :3002" cmd /k "title IEC DB Preview :3002 && set DB_PASSWORD=!DB_PASSWORD! && set DB_HOST=!DB_HOST! && set DB_PORT=!DB_PORT_VAL! && set DB_NAME=!DB_NAME! && set DB_USER=!DB_USER! && node "%ROOT%\tools\db-preview\server.js""
echo   OK  DB Preview window opened  ^-^>  http://localhost:3002  (dev-only)

:: ── 7. Summary ───────────────────────────────────────────────────────────────
echo.
echo  +============================================================+
echo  ^|   All services launched in separate windows               ^|
echo  +------------------------------------------------------------+
echo  ^|   Frontend    -^>  http://localhost:3000                   ^|
echo  ^|   Backend     -^>  http://localhost:5000                   ^|
echo  ^|   Blockchain  -^>  http://localhost:5050                   ^|
echo  ^|   DB Preview  -^>  http://localhost:3002  (dev only)      ^|
echo  +------------------------------------------------------------+
echo  ^|   DB password was entered but NOT saved anywhere.         ^|
echo  ^|   Each service window shows its own logs.                 ^|
echo  +============================================================+
echo.
echo   To stop all services: close each command window.
echo.

endlocal
goto :eof

:: ── Helper: kill processes on a port ────────────────────────────────────────
:kill_port
set "_port=%~1"
set "_name=%~2"
for /f "tokens=5" %%p in ('netstat -aon 2^>nul ^| findstr ":%_port% " ^| findstr "LISTENING"') do (
  echo   [WARN] Port %_port% in use (%_name%). Killing PID %%p...
  taskkill /F /PID %%p >nul 2>&1
)
echo   OK  Port %_port% checked (%_name%)
goto :eof

:error_exit
echo.
echo   [FATAL] Startup failed. See errors above.
echo.
pause
endlocal
exit /b 1
