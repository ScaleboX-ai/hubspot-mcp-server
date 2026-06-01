@echo off
cls
echo ===================================================
echo   HubSpot MCP Setup Wizard
echo ===================================================
echo.

:: 1. Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js was not found on your computer.
    echo.
    echo Opening https://nodejs.org/ in your browser...
    echo Please download and install the LTS version of Node.js.
    echo After installing, please run this setup.bat again!
    echo.
    start https://nodejs.org/
    pause
    exit
)

:: 2. Install dependencies silently if node_modules is missing
if not exist node_modules (
    echo Installing required libraries. This will take a few seconds...
    call npm install --no-audit --no-fund --quiet
)

:: 3. Run setup script directly using Node
node build/setup-mcp.js

echo.
echo Setup finished. Press any key to exit...
pause > nul
