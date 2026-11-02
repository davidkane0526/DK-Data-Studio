# One-time installation of the standalone DEX release checker.
# Default mode remains "observe": never installs an APK automatically.
[CmdletBinding()]
param([string]$AdbPath = "")
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$release = "4200-agent-preview-41402285251"
$expected = "ba8f562ff25f4baef9c5db31dd7b33b8a88b7a1bd7e1d54e36b98c04160a4724"
$url = "https://github.com/davidkane0526/DK-Data-Studio/releases/download/$release/dkds-updater.jar"

if ($AdbPath -eq "") {
    $found = Get-Command adb.exe -CommandType Application -ErrorAction SilentlyContinue
    if ($found) { $AdbPath = $found.Source }
    elseif (Test-Path "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe") {
        $AdbPath = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
    }
}
if (!(Test-Path -LiteralPath $AdbPath -PathType Leaf)) {
    throw "adb.exe missing; supply -AdbPath with the full path."
}

function ADB([string[]]$Args) {
    $old = $ErrorActionPreference
    try {
        $ErrorActionPreference = "Continue"
        $result = & $script:AdbPath @Args 2>&1 | Out-String
        $code = $LASTEXITCODE
    } finally { $ErrorActionPreference = $old }
    if ($code -ne 0) { throw "adb exit=$code; $result" }
    return $result.Trim()
}
$listing = ADB @("devices","-l")
$connected = @($listing -split "\r?\n" | Where-Object { $_ -match '^\S+\s+device(\s|$)' })
if ($connected.Count -ne 1) { throw "Expected exactly one connected and authorized ADB device." }
$id = ($connected[0] -split '\s+')[0]
if ((ADB @("-s",$id,"shell","su","-c","id")) -notmatch 'uid=0\(root\)') {
    throw "KernelSU uid=0 required."
}
$exists = ADB @("-s",$id,"shell","su","-c","grep -q check-update /data/adb/dkds-agent/agent.sh && echo ready")
if ($exists -notmatch "ready") {
    throw "Install current v0.3 agent.sh first using install.ps1."
}
$temp = Join-Path ([System.IO.Path]::GetTempPath()) "dkds-updater-$expected.jar"
Write-Host "Downloading pinned updater release..."
Invoke-WebRequest -Uri $url -UseBasicParsing -OutFile $temp
$actual = (Get-FileHash -LiteralPath $temp -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actual -ne $expected) { throw "Updater binary checksum mismatch; no device change." }
Write-Host "SHA-256 verified."
ADB @("-s",$id,"push",$temp,"/data/local/tmp/dkds-updater.jar.stage") | Out-Null
$script = "umask 077; cp /data/local/tmp/dkds-updater.jar.stage /data/adb/dkds-agent/dkds-updater.jar; chmod 600 /data/adb/dkds-agent/dkds-updater.jar; if [ ! -f /data/adb/dkds-agent/update.mode ]; then printf observe > /data/adb/dkds-agent/update.mode; fi; chmod 600 /data/adb/dkds-agent/update.mode; sha256sum /data/adb/dkds-agent/dkds-updater.jar"
$verify = ADB @("-s",$id,"shell","su","-c",$script)
if (!$verify.ToLowerInvariant().Contains($expected)) {
    throw "Tablet updater checksum mismatch. Do not enable updates."
}
Write-Host "Standalone updater installed; mode remains observe (no APK installs)."
try {
    ADB @("-s",$id,"shell","su","-c","sh /data/adb/dkds-agent/agent.sh check-update") | Write-Host
} catch {
    Write-Warning "Initial check failed (network/Android app_process). Inspect the output before enabling update mode."
    Write-Warning $_.Exception.Message
}
Write-Host 'Log: adb shell su -c "tail -n 50 /data/adb/dkds-agent/logs/update.log"'
