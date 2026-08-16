@echo off
setlocal EnableExtensions
cd /d "%~dp0"

if exist node_modules goto DEPS_OK
echo Installing Node dependencies...
call npm install
if errorlevel 1 goto FAILED

:DEPS_OK
call npm run dist
if errorlevel 1 goto FAILED

echo.
echo Build completed successfully.
pause
exit /b 0

:FAILED
echo.
echo Build failed.
pause
exit /b 1
