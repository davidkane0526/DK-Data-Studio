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

## First deployment

On Windows with ADB connected, run `tools/4200-agent/install.ps1` from PowerShell. It checks exactly one attached device, verifies root and existing app, transfers the fixed scripts, and installs a KernelSU boot entry. Installation does not reboot the tablet or alter the DKDS app.

After installation:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\4200-agent\install.ps1
adb shell su -c "sh /data/adb/dkds-agent/agent.sh once"
adb shell su -c "tail -n 70 /data/adb/dkds-agent/logs/diagnostics.log"
```

To stop the current service: `adb shell su -c "sh /data/adb/dkds-agent/agent.sh stop"`.
To disable boot start: `adb shell su -c "rm -f /data/adb/service.d/dkds-agent.sh"`.
The agent deliberately does not upload diagnostic logs: future HTTPS upload will require a separately configured, authenticated destination.
