# DKDS 4200 Agent v0.1. Safe one-time installation over an existing ADB connection.
# No APK replacement, no route changes, no instrument commands.
[CmdletBinding()]
param(
    [string]$AdbPath = ""
)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$agentFile = Join-Path $root "agent.sh"
$serviceFile = Join-Path $root "service.sh"
foreach ($file in @($agentFile, $serviceFile)) {
    if (!(Test-Path -LiteralPath $file -PathType Leaf)) { throw "Missing file: $file. Download the full tools/4200-agent directory." }
}
# Resolve the Android platform-tools executable without relying on the current directory.
# Use -AdbPath "C:\path\to\adb.exe" when ADB is distributed in a portable folder.
function Resolve-Adb {
    param([string]$ExplicitPath)
    if (![string]::IsNullOrWhiteSpace($ExplicitPath)) {
        $candidate = [System.IO.Path]::GetFullPath($ExplicitPath)
        if (!(Test-Path -LiteralPath $candidate -PathType Leaf)) {
            throw "Specified ADB executable not found: $candidate"
        }
        return $candidate
    }
    $found = Get-Command "adb.exe" -CommandType Application -ErrorAction SilentlyContinue
    if ($null -ne $found) { return $found.Source }

    $candidates = @(
        (Join-Path $root "adb.exe"),
        (Join-Path (Get-Location).Path "adb.exe")
    )
    foreach ($key in @("ANDROID_HOME", "ANDROID_SDK_ROOT")) {
        $sdk = [Environment]::GetEnvironmentVariable($key)
        if (![string]::IsNullOrWhiteSpace($sdk)) {
            $candidates += Join-Path $sdk "platform-tools\adb.exe"
        }
    }
    if (![string]::IsNullOrWhiteSpace($env:LOCALAPPDATA)) {
        $candidates += Join-Path $env:LOCALAPPDATA "Android\Sdk\platform-tools\adb.exe"
    }
    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate -PathType Leaf) {
            return (Resolve-Path -LiteralPath $candidate).ProviderPath
        }
    }
    throw "adb.exe not found. Pass -AdbPath 'C:\your\platform-tools\adb.exe' or add its folder to PATH."
}
$adb = Resolve-Adb -ExplicitPath $AdbPath
Write-Host "Using ADB: $adb"

function Call-Adb {
    param([string[]]$Arguments)
    $output = & $script:adb @Arguments 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0) { throw ("ADB failed: " + ($Arguments -join ' ') + [Environment]::NewLine + $output) }
    return $output.Trim()
}

$deviceOutput = Call-Adb -Arguments @("devices", "-l")
$devices = @($deviceOutput -split "\r?\n" | Where-Object { $_ -match '^\S+\s+device(\s|$)' })
if ($devices.Count -ne 1) {
    throw "Expected exactly one authorized ADB device; found $($devices.Count). Reconnect wireless debugging first."
}
$serial = ($devices[0] -split '\s+')[0]
Write-Host "ADB target: $serial"

$rootId = Call-Adb -Arguments @("-s", $serial, "shell", "su", "-c", "id")
if ($rootId -notmatch 'uid=0\(root\)') { throw "KernelSU root access was not granted. No files changed." }

$packages = Call-Adb -Arguments @("-s", $serial, "shell", "pm", "list", "packages", "com.dk.datastudio")
if ($packages -notmatch '(?m)^package:com\.dk\.datastudio$') {
    throw "DK Data Studio is not installed. No files changed."
}

Write-Host "Uploading two fixed diagnostic scripts..."
Call-Adb -Arguments @("-s", $serial, "push", $agentFile, "/data/local/tmp/dkds-agent.sh.stage") | Out-Null
Call-Adb -Arguments @("-s", $serial, "push", $serviceFile, "/data/local/tmp/dkds-agent-service.sh.stage") | Out-Null

$install = "umask 077; mkdir -p /data/adb/dkds-agent/logs; chmod 700 /data/adb/dkds-agent /data/adb/dkds-agent/logs; cp /data/local/tmp/dkds-agent.sh.stage /data/adb/dkds-agent/agent.sh; chmod 700 /data/adb/dkds-agent/agent.sh; cp /data/local/tmp/dkds-agent-service.sh.stage /data/adb/service.d/dkds-agent.sh; chmod 700 /data/adb/service.d/dkds-agent.sh"
Call-Adb -Arguments @("-s", $serial, "shell", "su", "-c", $install) | Out-Null

$remoteHashes = Call-Adb -Arguments @("-s", $serial, "shell", "su", "-c",
    "sha256sum /data/adb/dkds-agent/agent.sh /data/adb/service.d/dkds-agent.sh")
$agentHash = (Get-FileHash -LiteralPath $agentFile -Algorithm SHA256).Hash.ToLowerInvariant()
$serviceHash = (Get-FileHash -LiteralPath $serviceFile -Algorithm SHA256).Hash.ToLowerInvariant()
if (!$remoteHashes.Contains($agentHash) -or !$remoteHashes.Contains($serviceHash)) {
    throw "Remote SHA-256 mismatch. The new service must NOT be started."
}

Write-Host "Running a one-shot read-only diagnosis..."
Call-Adb -Arguments @("-s", $serial, "shell", "su", "-c",
    "sh /data/adb/dkds-agent/agent.sh once") | Write-Host
Call-Adb -Arguments @("-s", $serial, "shell", "su", "-c",
    "sh /data/adb/dkds-agent/agent.sh start") | Write-Host

Write-Host "Agent installed. It records snapshots every five minutes, locally only."
Write-Host 'Read latest log with: adb shell su -c "tail -n 70 /data/adb/dkds-agent/logs/diagnostics.log"'
Write-Host "No reboot required. Boot startup is enabled through KernelSU service.d."
