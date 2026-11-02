# Exercise both installers through a fake *native* adb.exe under Windows PowerShell 5.1.
# Ensures compound su -c commands are passed as a single remote argument.
$ErrorActionPreference = "Stop"
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$temporary = Join-Path $env:TEMP ("dkds-adb-test-" + [Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $temporary | Out-Null
$mock = Join-Path $temporary "adb-mock.exe"
$env:MOCK_ADB_TRACE = Join-Path $temporary "adb.trace"
$env:MOCK_AGENT_HASH = (Get-FileHash -LiteralPath (Join-Path $dir "agent.sh") -Algorithm SHA256).Hash.ToLowerInvariant()
$env:MOCK_SERVICE_HASH = (Get-FileHash -LiteralPath (Join-Path $dir "service.sh") -Algorithm SHA256).Hash.ToLowerInvariant()
# SHA of the pinned Android updater JAR. The updater download step still runs.
$env:MOCK_UPDATER_HASH = "86c62b1d95745c61aca439cfa850a9a270b65f9d83e0f34ca172c8176cf2a268"

$source = @'
using System;
using System.IO;
public static class MockAdb {
    public static int Main(string[] args) {
        File.AppendAllText(Environment.GetEnvironmentVariable("MOCK_ADB_TRACE"), String.Join("|", args) + "\n");
        if (args.Length >= 1 && args[0] == "devices") {
            Console.WriteLine("List of devices attached");
            string offlineFlag = Environment.GetEnvironmentVariable("MOCK_ADB_START_DISCONNECTED");
            string onlineMarker = Environment.GetEnvironmentVariable("MOCK_ADB_ONLINE_MARKER");
            if (offlineFlag != "1" || File.Exists(onlineMarker))
                Console.WriteLine("10.87.70.190:26461 device product:OPD2515 model:OPD2515");
            return 0;
        }
        if (args.Length == 2 && args[0] == "connect" && args[1] == "10.87.70.190:26461") {
            File.WriteAllText(Environment.GetEnvironmentVariable("MOCK_ADB_ONLINE_MARKER"), "connected");
            Console.WriteLine("connected to 10.87.70.190:26461");
            return 0;
        }
        if (args.Length < 4 || args[0] != "-s" || args[1] != "10.87.70.190:26461")
            return 2;
        if (args[2] == "push" && args.Length == 5) {
            Console.Error.WriteLine("1 file pushed, 0 skipped. 3.2 MB/s");
            return 0;
        }
        if (args[2] != "shell") return 3;
        if (args[3] == "pm" && args.Length >= 7 && args[4] == "list" && args[5] == "packages") {
            Console.WriteLine("package:com.dk.datastudio");
            return 0;
        }
        if (args.Length != 4 || !args[3].StartsWith("su -c '") || !args[3].EndsWith("'"))
            return 4;
        string command = args[3].Substring(7, args[3].Length - 8);
        if (command == "id") {
            Console.WriteLine("uid=0(root) gid=0(root)");
            return 0;
        }
        if (command.StartsWith("sha256sum /data/adb/dkds-agent/agent.sh")) {
            Console.WriteLine(Environment.GetEnvironmentVariable("MOCK_AGENT_HASH") + "  /data/adb/dkds-agent/agent.sh");
            Console.WriteLine(Environment.GetEnvironmentVariable("MOCK_SERVICE_HASH") + "  /data/adb/service.d/dkds-agent.sh");
            return 0;
        }
        if (command.StartsWith("umask 077; mkdir -p /data/adb/dkds-agent/logs") || command.StartsWith("if [ -f /data/adb/dkds-agent/agent.sh ]")) return 0;
        if (command == "sh /data/adb/dkds-agent/agent.sh stop") return 0;
        if (command == "sh /data/adb/dkds-agent/agent.sh once") {
            Console.WriteLine("Saved diagnostic snapshot to /data/adb/dkds-agent/logs/diagnostics.log");
            return 0;
        }
        if (command == "sh /data/adb/dkds-agent/agent.sh start") {
            Console.WriteLine("Agent started (background)");
            return 0;
        }
        if (command.StartsWith("grep -q check-update ")) {
            Console.WriteLine("ready");
            return 0;
        }
        if (command.StartsWith("umask 077; cp /data/local/tmp/dkds-updater.jar.stage")) {
            Console.WriteLine(Environment.GetEnvironmentVariable("MOCK_UPDATER_HASH") + "  /data/adb/dkds-agent/dkds-updater.jar");
            return 0;
        }
        if (command == "sh /data/adb/dkds-agent/agent.sh check-update") {
            Console.WriteLine("CURRENT 4200-preview-mocked checksum matches");
            return 0;
        }
        if (command == "getprop ro.product.model") { Console.WriteLine("OPD2515"); return 0; }
        if (command == "dumpsys connectivity | grep -i eth0 | head -n 20") { Console.WriteLine("InterfaceName: eth0"); return 0; }
        if (command.StartsWith("dumpsys package com.dk.datastudio")) { Console.WriteLine("versionName=3.71.138"); return 0; }
        if (command == "ip -4 -o addr show dev wlan0") { Console.WriteLine("wlan0 inet 10.87.70.190/16"); return 0; }
        if (command.StartsWith("if [ -d /sys/class/net/eth0 ]")) { Console.WriteLine("ethernet-present"); return 0; }
        if (command == "cat /sys/class/net/eth0/carrier") { Console.WriteLine("1"); return 0; }
        if (command == "ip -4 -o addr show dev eth0") {
            string trace = File.ReadAllText(Environment.GetEnvironmentVariable("MOCK_ADB_TRACE"));
            if (trace.Contains("ip addr add 169.254.111.115/16 dev eth0") &&
                !trace.Contains("ip -4 addr del 169.254.111.115/16 dev eth0"))
                Console.WriteLine("20: eth0 inet 169.254.111.115/16 scope global eth0");
            return 0;
        }
        if (command == "pm list packages -U com.dk.datastudio") { Console.WriteLine("package:com.dk.datastudio uid:10256"); return 0; }
        if (command == "ip -4 rule show") {
            Console.WriteLine("0: from all lookup local");
            string trace = File.ReadAllText(Environment.GetEnvironmentVariable("MOCK_ADB_TRACE"));
            if (trace.Contains("ip -4 rule add pref 9000 to 169.254.111.118/32 lookup 4200") &&
                !trace.Contains("ip -4 rule del pref 9000 to 169.254.111.118/32 lookup 4200")) {
                Console.WriteLine("9000: from all to 169.254.111.118 lookup 4200");
            }
            Console.WriteLine("18000: from all lookup wlan0");
            Console.WriteLine("32766: from all lookup main");
            return 0;
        }
        if (command == "ip -4 route show table main") {
            Console.WriteLine("default via 10.87.255.254 dev wlan0");
            string trace = File.ReadAllText(Environment.GetEnvironmentVariable("MOCK_ADB_TRACE"));
            if (trace.Contains("ip route replace 169.254.111.118/32 dev eth0") &&
                !trace.Contains("ip -4 route del 169.254.111.118/32 dev eth0"))
                Console.WriteLine("169.254.111.118/32 dev eth0 src 169.254.111.115");
            return 0;
        }
        if (command == "ip -4 route show table 4200") {
            string trace = File.ReadAllText(Environment.GetEnvironmentVariable("MOCK_ADB_TRACE"));
            if (trace.Contains("ip -4 route replace 169.254.111.118/32 dev eth0 src 169.254.111.115 table 4200") &&
                !trace.Contains("ip -4 route del 169.254.111.118/32 dev eth0 table 4200"))
                Console.WriteLine("169.254.111.118/32 dev eth0 src 169.254.111.115");
            return 0;
        }
        if (command.StartsWith("ip -4 route get 169.254.111.118")) {
            string trace = File.ReadAllText(Environment.GetEnvironmentVariable("MOCK_ADB_TRACE"));
            bool hasRule = trace.Contains("ip -4 rule add pref 9000 to 169.254.111.118/32 lookup 4200") &&
                !trace.Contains("ip -4 rule del pref 9000 to 169.254.111.118/32 lookup 4200");
            bool hasCustomTableRoute = trace.Contains("ip -4 route replace 169.254.111.118/32 dev eth0 src 169.254.111.115 table 4200");
            if (hasRule && hasCustomTableRoute) {
                Console.WriteLine("169.254.111.118 dev eth0 table 4200 src 169.254.111.115");
            } else {
                Console.WriteLine("169.254.111.118 via 10.87.255.254 dev wlan0 table wlan0 src 10.87.70.190");
            }
            return 0;
        }
        if (command == "ip -4 route replace 169.254.111.118/32 dev eth0 src 169.254.111.115 table 4200") { return 0; }
        if (command == "ip -4 rule add pref 9000 to 169.254.111.118/32 lookup 4200") { return 0; }
        if (command == "ip -4 rule del pref 9000 to 169.254.111.118/32 lookup 4200") { return 0; }
        if (command == "ip -4 route del 169.254.111.118/32 dev eth0 table 4200") { return 0; }
        if (command == "ip -4 route del 169.254.111.118/32 dev eth0") { return 0; }
        if (command == "ip -4 addr del 169.254.111.115/16 dev eth0") { return 0; }
        if (command == "ip neigh show dev eth0") { return 0; }
        if (command == "ip addr add 169.254.111.115/16 dev eth0") { return 0; }
        if (command == "ip route replace 169.254.111.118/32 dev eth0 src 169.254.111.115") { return 0; }
        if (command == "nc -z -w 3 169.254.111.118 1225") { return 0; }
        if (command == "echo 2a49444e3f00 | xxd -r -p | xxd -p") {
            Console.WriteLine("2a49444e3f00");
            return 0;
        }
        if (command == "toybox timeout -s KILL 1 true") { return 0; }
        if (command == "echo 2a49444e3f00 | xxd -r -p | toybox timeout -s KILL 8 nc -w 3 169.254.111.118 1225 | xxd -p") {
            Console.WriteLine("4b454954484c455920494e535452554d454e54532c4b4934323030412c313439383337372c56312e31340d00");
            return 0;
        }
        if (command.StartsWith("logcat -d -t")) { return 0; }
        Console.Error.WriteLine("Unexpected root command: " + command);
        return 5;
    }
}
'@
try {
    Add-Type -TypeDefinition $source -OutputAssembly $mock -OutputType ConsoleApplication

    Write-Host "Testing installation with simulated native adb.exe"
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $dir "install.ps1") -AdbPath $mock
    if ($LASTEXITCODE -ne 0) { throw "install.ps1 failed with fake ADB." }

    Write-Host "Testing updater installation with simulated native adb.exe"
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $dir "install-updater.ps1") -AdbPath $mock
    if ($LASTEXITCODE -ne 0) { throw "install-updater.ps1 failed with fake ADB." }

    # Simulate ADB disappearing from the server while tablet Wi-Fi stays online.
    $env:MOCK_ADB_START_DISCONNECTED = "1"
    $env:MOCK_ADB_ONLINE_MARKER = Join-Path $temporary "wireless-adb-online"
    Write-Host "Testing Keithley 4200A read-only diagnosis and targeted repair with fake ADB"
    Push-Location $temporary
    try {
        & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $dir "diagnose-4200.ps1") -AdbPath $mock -RepairRoute
        if ($LASTEXITCODE -ne 0) { throw "diagnose-4200.ps1 failed with fake ADB." }
        $reports = @(Get-ChildItem -LiteralPath $temporary -Filter "4200-connection-*.txt")
        if ($reports.Count -ne 1) { throw "Expected one generated diagnostic report." }
        $body = Get-Content -LiteralPath $reports[0].FullName -Raw
        if ($body -notmatch "KXCI \*IDN\? responds") { throw "Identity report missing." }
        if ($body -notmatch "Root route changed during this run: True") { throw "Route fix not tested." }
    } finally { Pop-Location }

    Write-Host "Testing scoped cleanup of Android policy rules and eth0 address"
    Push-Location $temporary
    try {
        & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $dir "diagnose-4200.ps1") -AdbPath $mock -CleanupRoute
        if ($LASTEXITCODE -ne 0) { throw "diagnose-4200.ps1 -CleanupRoute failed." }
        $latest = Get-ChildItem -LiteralPath $temporary -Filter "4200-connection-*.txt" |
            Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if (!(Select-String -LiteralPath $latest.FullName -Pattern "CLEANUP DONE" -Quiet)) {
            throw "Cleanup report missing its completion status."
        }
    } finally { Pop-Location }

    $trace = Get-Content -LiteralPath $env:MOCK_ADB_TRACE -Raw
    if (!$trace.Contains("connect|10.87.70.190:26461")) {
        throw "Diagnostic did not attempt wireless ADB reconnection."
    }
    if ($trace -notmatch "shell\|su -c 'if \[ -f ") { throw "Compound shell command lost its quoting." }
    if ($trace -notmatch "shell\|su -c 'umask 077; ") { throw "Root installation command lost its quoting." }
    if ($trace -notmatch "shell\|su -c 'grep -q check-update ") { throw "Updater root command lost its quoting." }
    if (!$trace.Contains("echo 2a49444e3f00 | xxd -r -p | toybox timeout -s KILL 8 nc -w 3 169.254.111.118 1225 | xxd -p")) {
        throw "Instrument identity probe was not sent with verifiable NUL terminator."
    }
    if ($trace -notmatch "shell\|su -c 'ip route replace 169\.254\.111\.118/32 dev eth0 src 169\.254\.111\.115'") {
        throw "Instrument-only /32 route repair was not sent as one quoted command."
    }
    if ($trace -notmatch "shell\|su -c 'ip -4 route replace 169\.254\.111\.118/32 dev eth0 src 169\.254\.111\.115 table 4200'") {
        throw "Instrument-only policy table route was not installed."
    }
    if ($trace -notmatch "shell\|su -c 'ip -4 rule add pref 9000 to 169\.254\.111\.118/32 lookup 4200'") {
        throw "Android destination-only policy rule was not installed."
    }
    foreach ($expectedRoot in @(
        "ip -4 rule del pref 9000 to 169.254.111.118/32 lookup 4200",
        "ip -4 route del 169.254.111.118/32 dev eth0 table 4200",
        "ip -4 route del 169.254.111.118/32 dev eth0",
        "ip -4 addr del 169.254.111.115/16 dev eth0"
    )) {
        if (!$trace.Contains($expectedRoot)) { throw "Cleanup missed: $expectedRoot" }
    }
    if ($trace -match 'ip route (replace|add) default') { throw "Test observed an unexpected default-route change." }
    Write-Host "Windows PowerShell ADB native argument and stderr simulation passed."
} finally {
    Remove-Item -LiteralPath $temporary -Recurse -Force -ErrorAction SilentlyContinue
}
