@echo off
setlocal EnableExtensions
cd /d "%~dp0"

if exist node_modules goto DEPS_OK
echo Installing Node dependencies...
call npm install
if errorlevel 1 goto FAILED

:DEPS_OK
node update-server\server.js
if errorlevel 1 goto FAILED
exit /b 0

:FAILED
echo.
echo Update server failed to start.
pause
exit /b 1
