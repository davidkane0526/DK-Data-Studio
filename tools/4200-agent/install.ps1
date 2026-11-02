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
    # On Windows PowerShell 5.1 adb writes successful transfer progress to
    # stderr. Under ErrorActionPreference=Stop this becomes NativeCommandError
    # even when adb exits 0. Evaluate native exit code instead.
    $oldPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = "Continue"
        $output = & $script:adb @Arguments 2>&1 | Out-String
        $exitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $oldPreference
    }
    if ($exitCode -ne 0) { throw ("ADB failed (exit " + $exitCode + "): " + ($Arguments -join ' ') + [Environment]::NewLine + $output) }
    return $output.Trim()
}

function Call-Root {
    param([Parameter(Mandatory=$true)][string]$Command)
    # ADB shell joins its argument list, therefore pass the entire remote
    # command as ONE argument, including literal single quotes protecting
    # the su -c payload from the Android remote shell.
    if ($Command.Contains("'") -or $Command.Contains("`n") -or $Command.Contains("`r")) {
        throw "Unsafe quotation/control character in fixed root command."
    }
    $remote = "su -c '" + $Command + "'"
    return (Call-Adb -Arguments @("-s", $script:serial, "shell", $remote))
}
$deviceOutput = Call-Adb -Arguments @("devices", "-l")
$devices = @($deviceOutput -split "\r?\n" | Where-Object { $_ -match '^\S+\s+device(\s|$)' })
if ($devices.Count -ne 1) {
    throw "Expected exactly one authorized ADB device; found $($devices.Count). Reconnect wireless debugging first."
}
$serial = ($devices[0] -split '\s+')[0]
Write-Host "ADB target: $serial"

$rootId = Call-Root -Command "id"
if ($rootId -notmatch 'uid=0\(root\)') { throw "KernelSU root access was not granted. No files changed." }

$packages = Call-Adb -Arguments @("-s", $serial, "shell", "pm", "list", "packages", "com.dk.datastudio")
if ($packages -notmatch '(?m)^package:com\.dk\.datastudio$') {
    throw "DK Data Studio is not installed. No files changed."
}

Write-Host "Uploading two fixed diagnostic scripts..."
Call-Adb -Arguments @("-s", $serial, "push", $agentFile, "/data/local/tmp/dkds-agent.sh.stage") | Out-Null
Call-Adb -Arguments @("-s", $serial, "push", $serviceFile, "/data/local/tmp/dkds-agent-service.sh.stage") | Out-Null
# Restart the loop when upgrading the agent; merely replacing files leaves the old process running.
Call-Root -Command "if [ -f /data/adb/dkds-agent/agent.sh ]; then sh /data/adb/dkds-agent/agent.sh stop; fi" | Out-Null

$install = "umask 077; mkdir -p /data/adb/dkds-agent/logs; chmod 700 /data/adb/dkds-agent /data/adb/dkds-agent/logs; cp /data/local/tmp/dkds-agent.sh.stage /data/adb/dkds-agent/agent.sh; chmod 700 /data/adb/dkds-agent/agent.sh; cp /data/local/tmp/dkds-agent-service.sh.stage /data/adb/service.d/dkds-agent.sh; chmod 700 /data/adb/service.d/dkds-agent.sh"
Call-Root -Command $install | Out-Null
# The previous shell loop can remain blocked in a foreground sleep after TERM.
# Invoke the new bounded stop implementation before the new loop is started.
Call-Root -Command "sh /data/adb/dkds-agent/agent.sh stop" | Out-Null

$remoteHashes = Call-Root -Command "sha256sum /data/adb/dkds-agent/agent.sh /data/adb/service.d/dkds-agent.sh"
$agentHash = (Get-FileHash -LiteralPath $agentFile -Algorithm SHA256).Hash.ToLowerInvariant()
$serviceHash = (Get-FileHash -LiteralPath $serviceFile -Algorithm SHA256).Hash.ToLowerInvariant()
if (!$remoteHashes.Contains($agentHash) -or !$remoteHashes.Contains($serviceHash)) {
    throw "Remote SHA-256 mismatch. The new service must NOT be started."
}

Write-Host "Running a one-shot read-only diagnosis..."
Call-Root -Command "sh /data/adb/dkds-agent/agent.sh once" | Write-Host
Call-Root -Command "sh /data/adb/dkds-agent/agent.sh start" | Write-Host

Write-Host "Agent installed. It records snapshots every five minutes, locally only."
Write-Host 'Read latest log with: adb shell su -c "tail -n 70 /data/adb/dkds-agent/logs/diagnostics.log"'
Write-Host "No reboot required. Boot startup is enabled through KernelSU service.d."
