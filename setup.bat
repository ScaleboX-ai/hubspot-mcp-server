@echo off
chcp 65001 > nul
cls
echo Запуск авто-настройки HubSpot MCP сервера...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1"
echo.
echo Нажмите любую клавишу для выхода...
pause > nul
