@echo off
setlocal
cd /d "%~dp0mobile"

echo ============================================================
echo Graphene Resonance Studio - build and install on Android
echo ============================================================

if not exist node_modules (
  call npm install
  if errorlevel 1 goto :fail
)

call npm run sync:web
if errorlevel 1 goto :fail

echo.
echo Make sure an Android phone with USB debugging is connected,
echo or an Android emulator is already running.
echo.

call npx expo run:android
if errorlevel 1 goto :fail

pause
exit /b 0

:fail
echo.
echo Build/install failed. See mobile\README_ANDROID_CN.md.
pause
exit /b 1
