param(
  [string]$ArtifactRoot = $PSScriptRoot,
  [string]$ServerBaseUrl = 'http://127.0.0.1:45880'
)

$ErrorActionPreference = 'Stop'

function Fail([string]$Message) {
  Write-Host ''
  Write-Host "ERROR: $Message" -ForegroundColor Red
  exit 2
}

$ArtifactRoot = [System.IO.Path]::GetFullPath($ArtifactRoot)
$latestPath = Join-Path $ArtifactRoot 'latest.yml'
if (-not (Test-Path -LiteralPath $latestPath -PathType Leaf)) {
  Fail "latest.yml not found in $ArtifactRoot"
}

$latestText = Get-Content -LiteralPath $latestPath -Raw -Encoding UTF8
$versionMatch = [regex]::Match($latestText, '(?m)^version:\s*["'']?([^"''\s]+)["'']?\s*$')
if (-not $versionMatch.Success) {
  Fail 'Unable to parse version from latest.yml.'
}
$version = $versionMatch.Groups[1].Value

$setup = Get-ChildItem -LiteralPath $ArtifactRoot -File -Filter '*.exe' |
  Where-Object { $_.Name -match '(?i)setup' } |
  Select-Object -First 1
if (-not $setup) {
  Fail 'NSIS Setup EXE not found. LAN auto-update requires the Setup installer payload.'
}

$files = @()
$files += Get-Item -LiteralPath $latestPath
$files += $setup
$files += Get-ChildItem -LiteralPath $ArtifactRoot -File -Filter '*.blockmap'
$files = $files | Sort-Object FullName -Unique

Write-Host '============================================================'
Write-Host ' DK Data Studio - Publish GitHub Artifact to LAN'
Write-Host '============================================================'
Write-Host "Artifact : $ArtifactRoot"
Write-Host "Version  : $version"
Write-Host "Server   : $ServerBaseUrl"
Write-Host "Files    : $($files.Count)"
Write-Host ''

try {
  $health = Invoke-RestMethod -Method Get -Uri "$ServerBaseUrl/health" -TimeoutSec 5
} catch {
  Fail "LAN update server is not reachable at $ServerBaseUrl. Start DKDS LAN Update Server on this PC first. $($_.Exception.Message)"
}
if (-not $health.ok) {
  Fail 'LAN update server health check did not return ok=true.'
}

$startBody = @{ version = $version; replace = $false } | ConvertTo-Json -Compress
try {
  $sessionInfo = Invoke-RestMethod -Method Post -Uri "$ServerBaseUrl/api/publish/start" -ContentType 'application/json; charset=utf-8' -Body $startBody -TimeoutSec 10
} catch {
  $message = $_.ErrorDetails.Message
  if (-not $message) { $message = $_.Exception.Message }
  Fail "Unable to start publish session. $message"
}
$session = [string]$sessionInfo.session
if ([string]::IsNullOrWhiteSpace($session)) {
  Fail 'Server did not return a publish session id.'
}

try {
  foreach ($file in $files) {
    $encodedSession = [uri]::EscapeDataString($session)
    $encodedName = [uri]::EscapeDataString($file.Name)
    $uri = "$ServerBaseUrl/api/publish/file?session=$encodedSession&name=$encodedName"
    Write-Host "Uploading : $($file.Name)"
    Invoke-WebRequest -UseBasicParsing -Method Put -Uri $uri -InFile $file.FullName -ContentType 'application/octet-stream' -TimeoutSec 900 | Out-Null
  }

  $commitBody = @{ session = $session } | ConvertTo-Json -Compress
  $result = Invoke-RestMethod -Method Post -Uri "$ServerBaseUrl/api/publish/commit" -ContentType 'application/json; charset=utf-8' -Body $commitBody -TimeoutSec 30
} catch {
  $message = $_.ErrorDetails.Message
  if (-not $message) { $message = $_.Exception.Message }
  Fail "Publish failed. $message"
}

Write-Host ''
Write-Host 'LAN update published successfully.' -ForegroundColor Green
Write-Host "Version     : $($result.version)"
Write-Host "Published at: $($result.publishedAt)"
Write-Host "Clients     : $($result.connectedClients)"
Write-Host ''
Write-Host 'win-unpacked is for direct local use only; it is not uploaded to the update server.'
exit 0
