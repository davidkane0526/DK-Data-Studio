@echo off
setlocal EnableExtensions
cd /d "%~dp0"

if exist node_modules goto DEPS_OK
call npm install
if errorlevel 1 goto FAILED

:DEPS_OK
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0update-server\install-autostart.ps1"
if errorlevel 1 goto FAILED
exit /b 0

:FAILED
echo.
echo Failed to install update-server autostart.
pause
exit /b 1
