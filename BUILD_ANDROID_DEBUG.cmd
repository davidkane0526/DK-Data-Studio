@echo off
setlocal
cd /d "%~dp0mobile"

echo ============================================================
echo Graphene Resonance Studio - Android debug APK
echo ============================================================
echo.
echo Requirements:
echo   - Node.js 20.19+ recommended
echo   - JDK 17
echo   - Android Studio / Android SDK
echo   - ANDROID_HOME configured
echo.

if not exist node_modules (
  echo [1/4] Installing React Native / Expo dependencies...
  call npm install
  if errorlevel 1 goto :fail
) else (
  echo [1/4] node_modules already exists.
)

echo [2/4] Preparing the complete offline Graphene Resonance Studio web bundle...
call npm run sync:web
if errorlevel 1 goto :fail

echo [3/4] Generating Android native project with Expo Prebuild...
call npx expo prebuild --platform android --clean
if errorlevel 1 goto :fail

echo [4/4] Building installable debug APK...
cd android
call gradlew.bat assembleDebug
if errorlevel 1 goto :fail

cd ..
if not exist "..\mobile-dist" mkdir "..\mobile-dist"
copy /Y "android\app\build\outputs\apk\debug\app-debug.apk" "..\mobile-dist\Graphene-Resonance-Studio-debug.apk" >nul

echo.
echo SUCCESS
echo APK:
echo   %~dp0mobile-dist\Graphene-Resonance-Studio-debug.apk
echo.
echo You can install it with:
echo   adb install -r "%~dp0mobile-dist\Graphene-Resonance-Studio-debug.apk"
echo.
pause
exit /b 0

:fail
echo.
echo Android build failed. Review the error above.
echo See mobile\README_ANDROID_CN.md for environment setup.
pause
exit /b 1
