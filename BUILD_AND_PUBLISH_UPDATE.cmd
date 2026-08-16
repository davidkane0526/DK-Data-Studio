@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "GRS_VERSION=%~1"

if defined GRS_VERSION goto HAVE_VERSION

echo.
echo PLUGIN BRANCH: do not publish this build to the stable main channel by accident.
echo Enter a release version.
echo Example:
echo   3.15.0-plugin.2 = exact plugin prerelease version
echo.
set /p "GRS_VERSION=Version: "

:HAVE_VERSION
if defined GRS_VERSION goto VERSION_OK

echo.
echo ERROR: No version was provided.
echo Use an explicit prerelease version such as 3.15.0-plugin.2.
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
