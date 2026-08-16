@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "GRS_VERSION=%~1"

if defined GRS_VERSION goto HAVE_VERSION

echo.
echo Enter a release version.
echo Examples:
echo   3.14.1 = exact version
echo   3.14   = next patch in the 3.14.x series
echo.
set /p "GRS_VERSION=Version: "

:HAVE_VERSION
if defined GRS_VERSION goto VERSION_OK

echo.
echo ERROR: No version was provided.
echo Use a version such as 3.14.1, or use 3.14 to auto-increment the patch.
pause
exit /b 2

:VERSION_OK
if exist node_modules goto DEPS_OK

echo.
echo ===== Installing Node dependencies =====
call npm install
if errorlevel 1 goto FAILED

:DEPS_OK
echo.
echo ===== Resolving release version =====
node scripts\set-version.js "%GRS_VERSION%"
if errorlevel 1 goto FAILED

echo.
echo ===== Building NSIS + Portable =====
call npm run dist
if errorlevel 1 goto FAILED

echo.
echo ===== Publishing LAN release =====
node update-server\publish-release.js dist
if errorlevel 1 goto FAILED

echo.
echo ===== SUCCESS =====
node -p "\"Published version: \" + require('./package.json').version"
echo Running LAN update servers will push this release automatically.
pause
exit /b 0

:FAILED
echo.
echo ===== FAILED =====
echo The build or publish step returned an error.
pause
exit /b 1
