# DKDS 4200A diagnostic agent v0.1

An independent, **read-only** KernelSU service for OPPO Pad Mini (Android 16).
Runs without DK Data Studio, without access to the Keithley instrument, and without Windows ADB remaining connected.

## Scope of v0.1

- Records periodic device version, DKDS process status, Wi-Fi/USB Ethernet interface state, link-local route, and neighbor information.
- Saves local rotating logs under `/data/adb/dkds-agent/logs/` (root-only, mode 0700).
- Survives Wi-Fi ADB disconnections and starts at boot through `/data/adb/service.d/`.
- Supports on-demand one-shot diagnostics through ADB.
- Does **not** update the DKDS APK, upload logs, open any TCP listener, modify routes, send KXCI commands or accept remote commands.

Manual APK updates remain via the existing validated ADB `install -r` procedure. Later phases may add an authenticated, explicitly enabled updater after verifying signing stability and a safe recovery path.

## Windows PowerShell 5.1 / ADB stderr

Some ADB builds print successful `adb push` progress to stderr. Earlier v0.1 installers with `$ErrorActionPreference = "Stop"` could treat that as `NativeCommandError` even when the file was pushed correctly. The installer now temporarily downgrades the preference only while executing ADB and **always checks its exit code**; real nonzero exits still fail.

If you already downloaded the repository ZIP, refresh only the bootstrap script while in `tools/4200-agent`:

```powershell
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/davidkane0526/DK-Data-Studio/4200/tools/4200-agent/install.ps1" -OutFile ".\install.ps1"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
```

An interrupted initial `adb push` does not mean the KernelSU boot service has been installed. Rerun the corrected installer to finish installing and verifying both files.

## First deployment

On Windows with ADB connected, run `tools/4200-agent/install.ps1` from PowerShell. It checks exactly one attached device, verifies root and existing app, transfers the fixed scripts, and installs a KernelSU boot entry. Installation does not reboot the tablet or alter the DKDS app.

If PowerShell cannot find `adb.exe`, locate your existing Android platform-tools executable and pass it explicitly instead of reinstalling ADB:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\4200-agent\install.ps1 -AdbPath "C:\path\to\adb.exe"
```

The installer also searches `PATH`, the current directory, and the usual Android SDK locations.

After installation:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\4200-agent\install.ps1
adb shell su -c "sh /data/adb/dkds-agent/agent.sh once"
adb shell su -c "tail -n 70 /data/adb/dkds-agent/logs/diagnostics.log"
```

To stop the current service: `adb shell su -c "sh /data/adb/dkds-agent/agent.sh stop"`.
To disable boot start: `adb shell su -c "rm -f /data/adb/service.d/dkds-agent.sh"`.
The agent deliberately does not upload diagnostic logs: future HTTPS upload will require a separately configured, authenticated destination.
