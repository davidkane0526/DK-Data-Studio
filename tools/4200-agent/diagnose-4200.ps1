# DKDS / Keithley 4200A one-run physical connection diagnostic.
# Performs no installation, no KXCI output-producing commands, and no default-route changes.
# With -RepairRoute, only an eth0 link-local IP and a target-specific /32 route may be added.
[CmdletBinding()]
param(
    [string]$AdbPath = "",
    [string]$InstrumentIP = "169.254.111.118",
    [string]$PreferredSourceIP = "169.254.111.115",
    [int]$Port = 1225,
    [switch]$RepairRoute,
    [switch]$CleanupRoute
)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
if ($RepairRoute -and $CleanupRoute) { throw "Choose only -RepairRoute or -CleanupRoute." }
if ($InstrumentIP -notmatch '^169\.254\.(\d{1,3})\.(\d{1,3})$' -or
    [int]$Matches[1] -gt 255 -or [int]$Matches[2] -gt 255) {
    throw "InstrumentIP must be a valid link-local 169.254.x.y address."
}
if ($PreferredSourceIP -notmatch '^169\.254\.(\d{1,3})\.(\d{1,3})$' -or
    [int]$Matches[1] -gt 255 -or [int]$Matches[2] -gt 255) {
    throw "PreferredSourceIP must be a valid link-local 169.254.x.y address."
}
if ($Port -lt 1 -or $Port -gt 65535) { throw "Invalid port." }
if ($InstrumentIP -eq $PreferredSourceIP) { throw "Instrument and tablet must have distinct IPv4 addresses." }

if ([string]::IsNullOrWhiteSpace($AdbPath)) {
    $found = Get-Command adb.exe -CommandType Application -ErrorAction SilentlyContinue
    if ($null -ne $found) { $AdbPath = $found.Source }
    else {
        $AdbPath = Join-Path $env:LOCALAPPDATA "Android\Sdk\platform-tools\adb.exe"
    }
}
if (!(Test-Path -LiteralPath $AdbPath -PathType Leaf)) { throw "Cannot locate adb.exe: $AdbPath" }

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$reportFile = Join-Path (Get-Location).Path ("4200-connection-" + $timestamp + ".txt")
$script:serial = ""
$script:modified = $false
function Note {
    param([string]$Message)
    Write-Host $Message
    Add-Content -LiteralPath $script:reportFile -Value $Message -Encoding UTF8
}
function Call-Adb {
    param([string[]]$Arguments, [switch]$AllowFailure)
    $old = $ErrorActionPreference
    try {
        $ErrorActionPreference = "Continue"
        $raw = & $script:AdbPath @Arguments 2>&1 | Out-String
        $exit = $LASTEXITCODE
    } finally { $ErrorActionPreference = $old }
    $result = [pscustomobject]@{ ExitCode = [int]$exit; Output = $raw.Trim() }
    if (!$AllowFailure -and $result.ExitCode -ne 0) {
        throw ("ADB exit=" + $exit + " " + ($Arguments -join " ") + [Environment]::NewLine + $raw)
    }
    return $result
}
function Root {
    param([string]$Command, [switch]$AllowFailure)
    if ($Command.Contains("'") -or $Command.Contains([char]10) -or $Command.Contains([char]13)) {
        throw "Unsafe remote shell quotation/control character."
    }
    # One ADB remote argument, quoted for the Android shell around su -c.
    $remote = "su -c '" + $Command + "'"
    return (Call-Adb -Arguments @("-s", $script:serial, "shell", $remote) -AllowFailure:$AllowFailure)
}
function Inspect {
    param([string]$Label, [string]$Command)
    $res = Root -Command $Command -AllowFailure
    Note ("[" + $Label + "] exit=" + $res.ExitCode)
    if ($res.Output) { Note $res.Output }
    return $res
}
$devices = Call-Adb -Arguments @("devices","-l")
$ready = @($devices.Output -split "\r?\n" | Where-Object { $_ -match '^\S+\s+device(\s|$)' })
if ($ready.Count -ne 1) { throw "Expected exactly one authorized ADB tablet; connected count=$($ready.Count)." }
$script:serial = ($ready[0] -split '\s+')[0]
$root = Root -Command "id"
if ($root.Output -notmatch 'uid=0\(root\)') { throw "KernelSU root is not active." }
Note "DKDS Keithley 4200A one-click diagnostics"
Note ("Timestamp(local): " + (Get-Date -Format s))
Note ("Device: " + $script:serial)
Note ("Instrument: " + $InstrumentIP + ":" + $Port)
Note ("Repair requested: " + [bool]$RepairRoute)
Note "No default route or instrument output settings will be changed."
if ($CleanupRoute) {
    Note "CLEANUP: removing only DKDS 4200A-specific network adjustments"
    $rules = Inspect -Label "rules before cleanup" -Command "ip -4 rule show"
    $rulePattern = "(?m)^\\s*9000:.*to\\s+" + [regex]::Escape($InstrumentIP) + "(?:/32)?\\s+lookup\\s+4200(?:\\s|$)"
    if ($rules.Output -match $rulePattern) {
        $res = Root -Command ("ip -4 rule del pref 9000 to " + $InstrumentIP + "/32 lookup 4200") -AllowFailure
        Note ("Removed instrument-only rule: exit=" + $res.ExitCode + " " + $res.Output)
    }
    $table = Inspect -Label "table 4200 before cleanup" -Command "ip -4 route show table 4200"
    if ($table.Output -match [regex]::Escape($InstrumentIP) -and $table.Output -match "dev eth0") {
        $res = Root -Command ("ip -4 route del " + $InstrumentIP + "/32 dev eth0 table 4200") -AllowFailure
        Note ("Removed instrument-only table route: exit=" + $res.ExitCode + " " + $res.Output)
    }
    $main = Inspect -Label "main table before cleanup" -Command "ip -4 route show table main"
    if ($main.Output -match ([regex]::Escape($InstrumentIP) + "/32.*dev eth0")) {
        $res = Root -Command ("ip -4 route del " + $InstrumentIP + "/32 dev eth0") -AllowFailure
        Note ("Removed instrument-only main route: exit=" + $res.ExitCode + " " + $res.Output)
    }
    $eth = Inspect -Label "eth0 before cleanup" -Command "ip -4 -o addr show dev eth0"
    if ($eth.Output -match ([regex]::Escape($PreferredSourceIP) + "/16")) {
        $res = Root -Command ("ip -4 addr del " + $PreferredSourceIP + "/16 dev eth0") -AllowFailure
        Note ("Removed exact 4200 test source address: exit=" + $res.ExitCode + " " + $res.Output)
    }
    $null = Inspect -Label "route after cleanup" -Command ("ip -4 route get " + $InstrumentIP)
    Note "CLEANUP DONE: DKDS APK, Wi-Fi, default route and KernelSU remain unchanged."
    Note ("REPORT: " + $reportFile)
    exit 0
}

$null = Inspect -Label "Android Ethernet transport registry" -Command "dumpsys connectivity | grep -i eth0 | head -n 20"
$null = Inspect -Label "device" -Command "getprop ro.product.model"
$null = Inspect -Label "dkds version" -Command "dumpsys package com.dk.datastudio | grep versionName="
$null = Inspect -Label "wifi IPv4" -Command "ip -4 -o addr show dev wlan0"
$check = Inspect -Label "eth0 exists" -Command "if [ -d /sys/class/net/eth0 ]; then echo ethernet-present; else echo ethernet-missing; fi"
if ($check.Output -notmatch 'ethernet-present') {
    Note "RESULT: eth0 is missing. Check USB-C Ethernet adapter, cable, and USB host mode."
    Note ("REPORT: " + $reportFile)
    exit 0
}
$carrier = Inspect -Label "eth0 link carrier" -Command "cat /sys/class/net/eth0/carrier"
$address = Inspect -Label "eth0 IPv4" -Command "ip -4 -o addr show dev eth0"
$rulesBefore = Inspect -Label "Android IPv4 policy rules (before)" -Command "ip -4 rule show"
$null = Inspect -Label "Android main IPv4 routes" -Command "ip -4 route show table main"
$rootRoute = Inspect -Label "root route before" -Command ("ip -4 route get " + $InstrumentIP)
$appInfo = Inspect -Label "DKDS UID" -Command "pm list packages -U com.dk.datastudio"
$uid = ""
if ($appInfo.Output -match 'uid:(\d+)') { $uid = $Matches[1] }
if ($uid) {
    $null = Inspect -Label "DKDS UID route before" -Command ("ip -4 route get " + $InstrumentIP + " uid " + $uid)
}
$null = Inspect -Label "eth0 neighbor cache" -Command "ip neigh show dev eth0"
$ipv4 = ""
if ($address.Output -match '(169\.254\.\d{1,3}\.\d{1,3})/\d+') { $ipv4 = $Matches[1] }
if ($RepairRoute) {
    if ($carrier.Output.Trim() -ne "1") {
        Note "REPAIR SKIPPED: Ethernet carrier is not 1."
    } else {
        if (!$ipv4) {
            Note ("REPAIR: add only eth0 link-local address " + $PreferredSourceIP + "/16")
            $add = Root -Command ("ip addr add " + $PreferredSourceIP + "/16 dev eth0") -AllowFailure
            Note ("  exit=" + $add.ExitCode + " " + $add.Output)
            if ($add.ExitCode -eq 0) { $script:modified = $true; $ipv4 = $PreferredSourceIP }
        }
        if ($ipv4) {
            Note ("REPAIR: update only host route " + $InstrumentIP + "/32 via eth0 src " + $ipv4)
            $route = Root -Command ("ip route replace " + $InstrumentIP + "/32 dev eth0 src " + $ipv4) -AllowFailure
            Note ("  exit=" + $route.ExitCode + " " + $route.Output)
            if ($route.ExitCode -eq 0) { $script:modified = $true }
            # Android selects per-network tables via ip rule. A route in 'main'
            # alone does NOT override the wlan0 rule observed on OPD2515.
            $priority = 9000
            $customTable = 4200
            $currentRules = Inspect -Label "policy rules before targeted fix" -Command "ip -4 rule show"
            $priorityLine = @($currentRules.Output -split "\r?\n" | Where-Object { $_ -match '^\s*9000:\s' })
            $expectedRule = "to " + $InstrumentIP
            $priorityRule = ($priorityLine -join " ")
            if ($priorityLine.Count -gt 0 -and
                (!$priorityRule.Contains($expectedRule) -or !$priorityRule.Contains("lookup 4200"))) {
                Note "POLICY SKIPPED: rule priority 9000 belongs to another Android rule; not replacing it."
            } else {
                $existingTable = Inspect -Label "reserved 4200 routing table" -Command "ip -4 route show table 4200"
                $tableText = $existingTable.Output.Trim()
                $usableTable = !$tableText -or $tableText -match '^Error: ipv4: FIB table does not exist' -or
                    $tableText -match '^Error: FIB table does not exist' -or
                    ($tableText -match [regex]::Escape($InstrumentIP) -and $tableText -match 'dev eth0')
                if (!$usableTable) {
                    Note "POLICY SKIPPED: table 4200 already contains unknown routes; will not overwrite them."
                } else {
                    Note ("POLICY: install instrument-only /32 route in table " + $customTable)
                    $tableResult = Root -Command ("ip -4 route replace " + $InstrumentIP + "/32 dev eth0 src " + $ipv4 + " table " + $customTable) -AllowFailure
                    Note ("  table exit=" + $tableResult.ExitCode + " " + $tableResult.Output)
                    if ($tableResult.ExitCode -eq 0) {
                        $script:modified = $true
                        if ($priorityLine.Count -eq 0) {
                            Note "POLICY: add priority-9000 destination-only rule (no default-route modification)"
                            $policyResult = Root -Command ("ip -4 rule add pref 9000 to " + $InstrumentIP + "/32 lookup 4200") -AllowFailure
                            Note ("  rule exit=" + $policyResult.ExitCode + " " + $policyResult.Output)
                            if ($policyResult.ExitCode -eq 0) {
                                $script:modified = $true
                            }
                        } else {
                            Note "POLICY: matching priority 9000 rule already exists"
                        }
                    }
                }
            }
        }
    }
    $null = Inspect -Label "Android IPv4 policy rules (after)" -Command "ip -4 rule show"
    $rootRoute = Inspect -Label "root route after" -Command ("ip -4 route get " + $InstrumentIP)
    if ($uid) { $null = Inspect -Label "DKDS UID route after" -Command ("ip -4 route get " + $InstrumentIP + " uid " + $uid) }
}
$appRoute = $null
if ($uid) { $appRoute = Inspect -Label "DKDS UID route final verification" -Command ("ip -4 route get " + $InstrumentIP + " uid " + $uid) }
if ($rootRoute.ExitCode -ne 0 -or $rootRoute.Output -notmatch ' dev eth0( |$)' -or
    ($appRoute -and ($appRoute.ExitCode -ne 0 -or $appRoute.Output -notmatch ' dev eth0( |$)'))) {
    Note "RESULT: root route does not select eth0; skip instrument TCP and *IDN? to avoid wrong-network requests."
    Note "Next diagnostic target: inspect priority-9000 rule, table 4200 and Android per-UID routing."
    Note ("REPORT: " + $reportFile)
    exit 0
}
$null = Inspect -Label "KXCI TCP port (read-only handshake)" -Command ("nc -z -w 3 " + $InstrumentIP + " " + $Port)
$id = Inspect -Label "KXCI identity (read-only *IDN?)" -Command ('printf "*IDN?\000" | nc -w 3 ' + $InstrumentIP + ' ' + $Port)
if ($id.Output -match 'KEITHLEY INSTRUMENTS,KI4200A') {
    Note "RESULT: KXCI *IDN? responds from the tablet root environment."
} else {
    Note "RESULT: no recognized KXCI identity. Check root route, port, Ethernet link and instrument KXCI mode."
}
$null = Inspect -Label "recent DKDS TCP exceptions (filtered)" -Command "logcat -d -t 1200 | grep -i tcp | tail -n 70"
Note ("Root route changed during this run: " + $script:modified)
Note "NOTE: Root and app UID routes can differ under Android policy routing. Socket source binding alone does not prove eth0 use."
Note ("REPORT: " + $reportFile)
