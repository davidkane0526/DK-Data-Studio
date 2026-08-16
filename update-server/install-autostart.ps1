$ErrorActionPreference = "Stop"

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$ServerScript = Join-Path $PSScriptRoot "server.js"
$Node = (Get-Command node -ErrorAction Stop).Source
$TaskName = "GRS LAN Update Server"

$Action = New-ScheduledTaskAction `
  -Execute $Node `
  -Argument ('"' + $ServerScript + '"') `
  -WorkingDirectory $Root

$Trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$Settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -MultipleInstances IgnoreNew

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $Action `
  -Trigger $Trigger `
  -Settings $Settings `
  -Description "Graphene Resonance Studio local LAN update push server" `
  -Force | Out-Null

Start-ScheduledTask -TaskName $TaskName

Write-Host "Installed and started scheduled task: $TaskName"
Write-Host "Server root: $Root"
