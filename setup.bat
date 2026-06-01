@echo off
cls
echo Starting HubSpot MCP Setup Wizard...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1"
echo.
echo Setup finished. Press any key to exit...
pause > nul
