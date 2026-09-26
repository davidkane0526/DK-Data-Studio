param(
  [Parameter(Mandatory=$true)][string]$ExecutablePath,
  [int]$StartupTimeoutSeconds = 25,
  [int]$ExitTimeoutSeconds = 12
)

$ErrorActionPreference = 'Stop'
$exe = (Resolve-Path -LiteralPath $ExecutablePath).Path
$knownIds = [System.Collections.Generic.HashSet[int]]::new()

function Get-ProcessSnapshot {
  @(Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name,ExecutablePath,CommandLine)
}

function Get-TreeRows([int]$RootPid) {
  [void]$knownIds.Add($RootPid)
  $all = Get-ProcessSnapshot
  $changed = $true
  while ($changed) {
    $changed = $false
    foreach ($row in $all) {
      if ($knownIds.Contains([int]$row.ParentProcessId) -and -not $knownIds.Contains([int]$row.ProcessId)) {
        [void]$knownIds.Add([int]$row.ProcessId)
        $changed = $true
      }
    }
  }
  @($all | Where-Object { $knownIds.Contains([int]$_.ProcessId) })
}

function Stop-Tree([int]$RootPid) {
  $rows = @(Get-TreeRows $RootPid | Sort-Object ProcessId -Descending)
  foreach ($row in $rows) {
    try { Stop-Process -Id ([int]$row.ProcessId) -Force -ErrorAction SilentlyContinue } catch {}
  }
}

$root = $null
try {
  Write-Host "Launching packaged Desktop runtime: $exe"
  $root = Start-Process -FilePath $exe -WorkingDirectory (Split-Path -Parent $exe) -PassThru
  [void]$knownIds.Add([int]$root.Id)
  Write-Host "Root PID=$($root.Id)"

  $windowProcess = $null
  $deadline = (Get-Date).AddSeconds($StartupTimeoutSeconds)
  while ((Get-Date) -lt $deadline -and -not $windowProcess) {
    Start-Sleep -Milliseconds 250
    foreach ($row in @(Get-TreeRows $root.Id)) {
      try {
        $candidate = Get-Process -Id ([int]$row.ProcessId) -ErrorAction Stop
        if ($candidate.MainWindowHandle -ne 0) {
          $windowProcess = $candidate
          break
        }
      } catch {}
    }
  }

  if (-not $windowProcess) {
    $rows = @(Get-TreeRows $root.Id)
    $rows | Format-Table ProcessId,ParentProcessId,Name,ExecutablePath,CommandLine -AutoSize | Out-String | Write-Host
    throw 'Packaged Desktop runtime did not expose a main window within the startup deadline.'
  }

  # Refresh once more before closing so short-lived launchers/intermediate
  # processes remain part of the known process lineage even after they exit.
  [void](Get-TreeRows $root.Id)

  Write-Host "Closing main window PID=$($windowProcess.Id) HWND=$($windowProcess.MainWindowHandle)"
  if (-not $windowProcess.CloseMainWindow()) {
    throw 'Windows CloseMainWindow returned false for the packaged Desktop main window.'
  }

  $exitDeadline = (Get-Date).AddSeconds($ExitTimeoutSeconds)
  $remaining = @()
  do {
    Start-Sleep -Milliseconds 250
    $remaining = @(Get-TreeRows $root.Id)
    if ($remaining.Count -eq 0) { break }
  } while ((Get-Date) -lt $exitDeadline)

  if ($remaining.Count -gt 0) {
    Write-Host 'Residual process tree after normal main-window close:'
    $remaining | Format-Table ProcessId,ParentProcessId,Name,ExecutablePath,CommandLine -AutoSize | Out-String | Write-Host
    throw "Packaged Desktop process tree did not fully exit within $ExitTimeoutSeconds seconds."
  }

  Write-Host 'Packaged Desktop normal-close process tree reached zero.'
}
finally {
  if ($root) { Stop-Tree $root.Id }
}
