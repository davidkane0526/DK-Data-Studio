@echo off
setlocal EnableExtensions
cd /d "%~dp0"

if exist node_modules goto DEPS_OK
call npm install
if errorlevel 1 goto FAILED

:DEPS_OK
if exist dist\latest.yml goto DIST_OK
echo ERROR: dist\latest.yml was not found.
echo Run BUILD_WINDOWS.cmd first.
pause
exit /b 2

:DIST_OK
node update-server\publish-release.js dist
if errorlevel 1 goto FAILED

echo.
echo Release published successfully.
pause
exit /b 0

:FAILED
echo.
echo Publish failed.
pause
exit /b 1
