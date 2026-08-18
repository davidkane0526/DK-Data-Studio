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

function Resolve-ArtifactRoot([string]$PathValue) {
  if ([string]::IsNullOrWhiteSpace($PathValue)) {
    $PathValue = $PSScriptRoot
  }

  # Native command-line parsing can leave a stray quote when a quoted path
  # ends in a backslash. Quotes are invalid inside Windows paths, so remove
  # only surrounding quotes before resolving the path.
  $clean = $PathValue.Trim().Trim('"')
  if ([string]::IsNullOrWhiteSpace($clean)) {
    Fail 'ArtifactRoot is empty.'
  }

  try {
    return [System.IO.Path]::GetFullPath($clean)
  } catch {
    Fail "ArtifactRoot is not a valid path: $PathValue. $($_.Exception.Message)"
  }
}

function Get-ServerHealth {
  try {
    $health = Invoke-RestMethod -Method Get -Uri "$ServerBaseUrl/health" -TimeoutSec 2
    if ($health.ok -and $health.localPublishApi) { return $health }
  } catch {}
  return $null
}

function Start-BundledUpdateServer {
  $serverDir = Join-Path $ArtifactRoot 'update-server'
  $serverScript = Join-Path $serverDir 'server.js'
  $runtimeDir = Join-Path $ArtifactRoot 'win-unpacked'
  $runtime = Join-Path $runtimeDir 'DK Data Studio.exe'

  if (-not (Test-Path -LiteralPath $serverScript -PathType Leaf)) {
    Fail "Bundled LAN update server is missing: $serverScript"
  }
  if (-not (Test-Path -LiteralPath (Join-Path $serverDir 'config.json') -PathType Leaf)) {
    Fail "Bundled LAN update server config is missing: $serverDir\config.json"
  }
  if (-not (Test-Path -LiteralPath (Join-Path $serverDir 'node_modules\ws\package.json') -PathType Leaf)) {
    Fail "Bundled LAN update server dependency is missing: $serverDir\node_modules\ws"
  }

  if (-not (Test-Path -LiteralPath $runtime -PathType Leaf)) {
    $runtime = Get-ChildItem -LiteralPath $runtimeDir -File -Filter '*.exe' -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -notmatch '(?i)elevate|uninstall' } |
      Select-Object -First 1 -ExpandProperty FullName
  }
  if (-not $runtime -or -not (Test-Path -LiteralPath $runtime -PathType Leaf)) {
    Fail "Bundled Electron runtime was not found under $runtimeDir"
  }

  try {
    $serverUri = [uri]$ServerBaseUrl
  } catch {
    Fail "ServerBaseUrl is invalid: $ServerBaseUrl"
  }
  if ($serverUri.Port -ne 45880 -or $serverUri.Host -notin @('127.0.0.1','localhost','::1')) {
    Fail "The bundled server can only auto-start for the local default endpoint http://127.0.0.1:45880. Current endpoint: $ServerBaseUrl"
  }

  Write-Host 'LAN update server is not running. Starting bundled server...'
  Write-Host "Runtime  : $runtime"
  Write-Host "Server   : $serverScript"

  $hadElectronRunAsNode = Test-Path Env:ELECTRON_RUN_AS_NODE
  $previousElectronRunAsNode = $env:ELECTRON_RUN_AS_NODE
  try {
    $env:ELECTRON_RUN_AS_NODE = '1'
    Start-Process -FilePath $runtime `
      -ArgumentList ('"' + $serverScript + '"') `
      -WorkingDirectory $serverDir `
      -WindowStyle Hidden | Out-Null
  } catch {
    Fail "Unable to start bundled LAN update server. $($_.Exception.Message)"
  } finally {
    if ($hadElectronRunAsNode) {
      $env:ELECTRON_RUN_AS_NODE = $previousElectronRunAsNode
    } else {
      Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
    }
  }

  for ($attempt = 1; $attempt -le 40; $attempt++) {
    Start-Sleep -Milliseconds 500
    $health = Get-ServerHealth
    if ($health) {
      Write-Host 'Bundled LAN update server is ready.' -ForegroundColor Green
      return $health
    }
  }

  $logPath = Join-Path $serverDir 'server.log'
  if (Test-Path -LiteralPath $logPath -PathType Leaf) {
    Write-Host ''
    Write-Host "Server log: $logPath" -ForegroundColor Yellow
    Get-Content -LiteralPath $logPath -Tail 12 -ErrorAction SilentlyContinue | ForEach-Object { Write-Host $_ }
  }
  Fail "Bundled LAN update server did not become ready at $ServerBaseUrl within 20 seconds."
}

$ArtifactRoot = Resolve-ArtifactRoot $ArtifactRoot
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

$health = Get-ServerHealth
if (-not $health) {
  $health = Start-BundledUpdateServer
}
if (-not $health -or -not $health.ok -or -not $health.localPublishApi) {
  Fail "LAN update server health check failed at $ServerBaseUrl."
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
Write-Host "Dashboard   : $ServerBaseUrl/"
Write-Host ''
Write-Host 'The bundled LAN update server remains running in the background so clients can receive this release.'
Write-Host 'win-unpacked is for direct local use only; it is not uploaded to the update server.'
exit 0
