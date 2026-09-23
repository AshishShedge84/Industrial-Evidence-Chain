@echo off
:: ==============================================================================
:: Industrial Evidence Chain — Development Environment Stopper
:: stop.bat  ·  Windows
:: ==============================================================================

setlocal EnableDelayedExpansion

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

echo.
echo ==================================================
echo IEC STOPPING ALL DEVELOPMENT SERVICES
echo ==================================================
echo.

call :stop_port 3000 "Frontend"
call :stop_port 5000 "Backend"
call :stop_port 5050 "Blockchain Adapter"
call :stop_port 3002 "DB Preview"

if "%1"=="--all" goto :stop_db
if "%1"=="--with-db" goto :stop_db

echo.
echo   Note: PostgreSQL (port 5433) was kept running.
echo   To stop PostgreSQL as well, run: stop.bat --with-db
goto :finish

:stop_db
echo   Stopping PostgreSQL cluster on port 5433...
pg_ctl -D "%ROOT%\db_data\pgdata" -m fast stop >nul 2>&1
echo   PostgreSQL cluster stopped.

:finish
echo.
echo   All requested services stopped cleanly.
echo.
exit /b 0

:stop_port
set "PORT=%~1"
set "NAME=%~2"
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%PORT% " ^| findstr "LISTENING"') do (
  if not "%%a"=="" (
    echo   Stopping %NAME% on port %PORT% (PID: %%a)...
    taskkill /F /PID %%a >nul 2>&1
  )
)
exit /b 0
