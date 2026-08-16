@echo off
setlocal
set "APK=%~dp0mobile-dist\Graphene-Resonance-Studio-debug.apk"
if not exist "%APK%" (
  echo APK not found:
  echo   %APK%
  echo.
  echo Run BUILD_ANDROID_DEBUG.cmd first.
  pause
  exit /b 1
)
adb devices
echo.
adb install -r "%APK%"
if errorlevel 1 (
  echo.
  echo Installation failed. Enable USB debugging and authorize this computer.
  pause
  exit /b 1
)
echo.
echo Installation complete.
pause
