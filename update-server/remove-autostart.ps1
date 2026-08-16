$ErrorActionPreference = "SilentlyContinue"
$TaskName = "GRS LAN Update Server"
Stop-ScheduledTask -TaskName $TaskName
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
Write-Host "Removed scheduled task: $TaskName"
