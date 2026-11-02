## Direct 4200A hardware diagnosis (preferred while instrument is available)

The independent Windows `diagnose-4200.ps1` runs against the tablet via the existing ADB connection. It does not require the KernelSU background agent or the updater.
It gathers `eth0` link/IPv4, Android ConnectivityManager Ethernet exposure, Wi-Fi IPv4, both root and DKDS app UID route selection, ARP neighbors, TCP port 1225 and a **read-only** `*IDN?` exchange. It also collects a small filtered set of TCP errors.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\diagnose-4200.ps1 -RepairRoute
```

`-RepairRoute` is opt-in and only permitted if `eth0` physically exists and has carrier=1. It may add a missing link-local `169.254.111.115/16` to `eth0`, and replace the **instrument-only** `169.254.111.118/32` route on the tablet. It never changes the default route or instrument output. Addresses are parameters when lab configuration changes. Before contacting the instrument it verifies the root route selects eth0; otherwise TCP/IDN probes are skipped.

The report is written to the Windows working directory as `4200-connection-YYYYMMDD-HHMMSS.txt`. The user can provide this local report for targeted Android connection fixes. No data is automatically uploaded.

## v0.3 GitHub update checker

The helper `java/DkdsUpdater.java` is compiled by GitHub Actions into a DEX jar for Android `app_process` and published as a separate `4200-agent-preview-*` prerelease.
It is **not** a new DK Data Studio APK. The KernelSU script schedules release checks every six hours while retaining five-minute local diagnostics.

For a fresh installation or upgrade, download the latest 4200 branch ZIP, open PowerShell in `tools/4200-agent`, and execute:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\install-updater.ps1
```

The updater installer downloads a pinned GitHub Release JAR, verifies its SHA-256, and installs it to `/data/adb/dkds-agent/dkds-updater.jar` with root-only permissions.
Its `update.mode` remains `observe` (no automatic APK installs).

Check operation without any 4200A instrument:

```powershell
adb shell su -c "sh /data/adb/dkds-agent/agent.sh check-update"
adb shell su -c "tail -n 50 /data/adb/dkds-agent/logs/update.log"
```

The updater accepts only the exact repository GitHub release URL, vetted arm64 APK names and a SHA-256 digest from GitHub metadata.
It downloads over HTTPS with a restricted redirect allowlist. Android Package Manager performs its usual signing compatibility check on install.
It backs up the installed `base.apk` before an opt-in upgrade, but **backing up an APK is not a working automatic rollback**.
Android may reject a lower versionCode downgrade, and an APK that passes Package Manager checks may still crash or fail to render.
Automatic installation is implemented but **disabled by default and not yet validated on this tablet**. Do not enable install mode before health checks and recovery are tested.

No log upload, Root network listener, remote command execution, system route modification, or instrument test is provided.

# DKDS 4200A diagnostic agent v0.3 (local diagnostics + opt-in update helper)

An independent, **read-only** KernelSU service for OPPO Pad Mini (Android 16).
Runs without DK Data Studio, without access to the Keithley instrument, and without Windows ADB remaining connected.

## Scope of v0.1

- Records periodic device version, DKDS process status, Wi-Fi/USB Ethernet interface state, link-local route, and neighbor information.
- Explicitly reports `ETHERNET_WAITING` when no USB Ethernet adapter is attached (expected while the 4200A is occupied) and checks for `ROUTE_WARNING` only once `eth0` exists.
- Validates that its saved PID belongs to the actual agent loop before reporting running or issuing a stop command.
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

## Updating an already installed v0.1 agent

The GitHub repository is newer than files already deployed to a tablet. Updating the GitHub branch **does not** automatically update the installed KernelSU script. To update after refreshing the ZIP or scripts, stop the existing agent safely and rerun the installer:

```powershell
adb shell su -c "sh /data/adb/dkds-agent/agent.sh stop"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
```

The installer is idempotent for files and does not touch the installed DKDS application. Do not reboot or connect the instrument merely to refresh this script.

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
