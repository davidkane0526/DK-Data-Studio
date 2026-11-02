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
            Console.WriteLine("10.87.70.190:26461 device product:OPD2515 model:OPD2515");
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
        if (command.StartsWith("umask 077;") || command.StartsWith("if [ -f /data/adb/dkds-agent/agent.sh ]")) return 0;
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

    $trace = Get-Content -LiteralPath $env:MOCK_ADB_TRACE -Raw
    if ($trace -notmatch "shell\|su -c 'if \[ -f ") { throw "Compound shell command lost its quoting." }
    if ($trace -notmatch "shell\|su -c 'umask 077; ") { throw "Root installation command lost its quoting." }
    if ($trace -notmatch "shell\|su -c 'grep -q check-update ") { throw "Updater root command lost its quoting." }
    Write-Host "Windows PowerShell ADB native argument and stderr simulation passed."
} finally {
    Remove-Item -LiteralPath $temporary -Recurse -Force -ErrorAction SilentlyContinue
}
