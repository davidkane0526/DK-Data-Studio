@echo off
setlocal
echo ============================================================
echo Graphene Resonance Studio - Android environment check
echo ============================================================
echo.
echo [Node]
node --version 2>nul || echo ERROR: Node.js not found. Install Node.js 22.13+.
echo.
echo [Java]
java -version 2>&1 || echo ERROR: Java not found. Install JDK 17.
echo.
echo [ANDROID_HOME]
if "%ANDROID_HOME%"=="" (
  echo ERROR: ANDROID_HOME is not set.
  echo Typical Windows value: %%LOCALAPPDATA%%\Android\Sdk
) else (
  echo %ANDROID_HOME%
)
echo.
echo [adb]
adb --version 2>nul || echo ERROR: adb not found. Add %%ANDROID_HOME%%\platform-tools to PATH.
echo.
echo [SDK platform 36]
if not "%ANDROID_HOME%"=="" (
  if exist "%ANDROID_HOME%\platforms\android-36" (
    echo OK: Android SDK Platform 36 found.
  ) else (
    echo ERROR: Android SDK Platform 36 not found. Install Android 16 / API 36 in Android Studio.
  )
)
echo.
echo See mobile\README_ANDROID_CN.md for setup and APK build steps.
pause
EOF
# normalize CRLF while keeping ASCII
python - <<'PY'
from pathlib import Path
p=Path('CHECK_ANDROID_ENV.cmd')
t=p.read_text(encoding='ascii').replace('\r\n','\n').replace('\r','\n')
p.write_text(t,encoding='ascii',newline='\r\n')
PY
