@echo off
setlocal EnableDelayedExpansion

:: Always ensure working directory is the script directory (frontend)
cd /d "%~dp0"

title Industrial Evidence Chain - Startup Script

echo ==================================================
echo INDUSTRIAL EVIDENCE CHAIN - FRONTEND
echo ==================================================
echo.

:: 1. Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is required to run Industrial Evidence Chain.
    echo Node.js is currently not installed on this system.
    echo.
    set /p "INSTALL_CONFIRM=Would you like to try installing Node.js LTS automatically? (Y/N): "
    if /i "!INSTALL_CONFIRM!"=="Y" (
        where winget >nul 2>nul
        if !ERRORLEVEL! EQU 0 (
            echo.
            echo [INFO] Installing Node.js LTS using winget...
            winget install OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements
            if !ERRORLEVEL! EQU 0 (
                echo [SUCCESS] Node.js installed successfully.
                echo [ACTION REQUIRED] Please restart your computer or command prompt for the changes to take effect.
                pause
                exit /b 0
            ) else (
                echo [ERROR] Failed to install Node.js via winget. Please download and install it manually from https://nodejs.org/
                pause
                exit /b 1
            )
        ) else (
            echo [ERROR] 'winget' is not available on this system.
            echo Please download and install Node.js LTS manually from https://nodejs.org/
            pause
            exit /b 1
        )
    ) else (
        echo Startup cancelled by user.
        pause
        exit /b 1
    )
)

:: 2. Check npm
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm is missing. Node.js might not be installed correctly.
    echo Please reinstall Node.js.
    pause
    exit /b 1
)

:: 3. Check for package.json
if not exist "package.json" (
    echo [ERROR] package.json not found!
    echo Please ensure you are running this script from the root of the project.
    pause
    exit /b 1
)

:: 4. Install dependencies if needed
if not exist "node_modules\" (
    echo [INFO] First time setup detected. Installing dependencies...
    echo This may take a few minutes.
    call npm install
    if !ERRORLEVEL! NEQ 0 (
        echo [ERROR] Failed to install dependencies. Please check the errors above.
        pause
        exit /b 1
    )
    echo [SUCCESS] Dependencies installed successfully.
    echo.
) else (
    echo [INFO] Dependencies found. Skipping install...
    echo.
)

:: 5. Start development server
echo ==================================================
echo STARTING INDUSTRIAL EVIDENCE CHAIN
echo ==================================================
echo.
echo The frontend development server is starting up...
echo Please wait for Vite to initialize.
echo Once ready, use the localhost URL shown below.
echo.
echo NOTE: Do not close this terminal window while using the application.
echo To stop the server, press Ctrl+C in this window.
echo ==================================================
echo.

call npm run dev
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Failed to start the development server.
    echo There might be a port conflict or syntax error.
    pause
    exit /b 1
)

pause
exit /b 0
