param(
  [string]$PluginPath = '',
  [string]$ServerBaseUrl = 'http://127.0.0.1:45880',
  [string]$OutputPath = ''
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'

function Resolve-ProjectRoot {
  $candidate = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
  if (Test-Path -LiteralPath (Join-Path $candidate 'package.json') -PathType Leaf) { return $candidate }
  if (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'package.json') -PathType Leaf) { return $PSScriptRoot }
  return $null
}

function Get-Health([string]$BaseUrl) {
  try { return Invoke-RestMethod -Method Get -Uri ($BaseUrl.TrimEnd('/') + '/health') -TimeoutSec 2 }
  catch { return $null }
}

function Ensure-UpdateServer([string]$BaseUrl,[string]$ProjectRoot) {
  $health = Get-Health $BaseUrl
  if ($health -and $health.ok -and $health.pluginPublishApi) { return $health }

  $serverScript = $null
  $workingDirectory = $null
  if ($ProjectRoot) {
    $candidate = Join-Path $ProjectRoot 'services\update-server\server.js'
    if (Test-Path -LiteralPath $candidate -PathType Leaf) {
      $serverScript = $candidate
      $workingDirectory = Join-Path $ProjectRoot 'services\update-server'
    }
  }
  if (-not $serverScript) {
    $candidate = Join-Path $PSScriptRoot 'update-server\server.js'
    if (Test-Path -LiteralPath $candidate -PathType Leaf) {
      $serverScript = $candidate
      $workingDirectory = Split-Path -Parent $candidate
    }
  }
  if (-not $serverScript) { throw 'LAN update server is not running and no local server.js was found.' }

  $node = Get-Command node -ErrorAction SilentlyContinue
  if (-not $node) { throw 'node was not found; start the LAN update server manually or install Node.js.' }
  Start-Process -FilePath $node.Source -ArgumentList ('"' + $serverScript + '"') -WorkingDirectory $workingDirectory -WindowStyle Hidden | Out-Null
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Milliseconds 300
    $health = Get-Health $BaseUrl
    if ($health -and $health.ok -and $health.pluginPublishApi) { return $health }
  }
  throw 'LAN update server did not become ready or does not support plugin publishing.'
}

function Select-BuiltinPlugin([string]$ProjectRoot) {
  if (-not $ProjectRoot) { throw 'PluginPath is required when this script is not run from a project source tree.' }
  $rows = @()
  Get-ChildItem -LiteralPath (Join-Path $ProjectRoot 'src\plugins') -Directory | Where-Object { -not $_.Name.StartsWith('_') } | ForEach-Object {
    $manifestPath = Join-Path $_.FullName 'plugin.json'
    if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) { return }
    try {
      $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
      $rows += [PSCustomObject]@{ Folder=$_.FullName; Id=[string]$manifest.id; Name=[string]$manifest.name; Version=[string]$manifest.version }
    } catch {}
  }
  if ($rows.Count -eq 0) { throw 'No built-in plugins were found.' }
  Write-Host ''
  Write-Host '选择要推送的插件：' -ForegroundColor Cyan
  for ($i=0; $i -lt $rows.Count; $i++) {
    Write-Host (" {0,2}. {1}  {2}  v{3}" -f ($i+1),$rows[$i].Name,$rows[$i].Id,$rows[$i].Version)
  }
  $choice = Read-Host '序号'
  $index = 0
  if (-not [int]::TryParse($choice,[ref]$index) -or $index -lt 1 -or $index -gt $rows.Count) { throw '无效的插件序号。' }
  return $rows[$index-1].Folder
}

$projectRoot = Resolve-ProjectRoot
if ([string]::IsNullOrWhiteSpace($PluginPath)) { $PluginPath = Select-BuiltinPlugin $projectRoot }
$resolved = [IO.Path]::GetFullPath([Environment]::ExpandEnvironmentVariables($PluginPath))
$packagePath = $null

if (Test-Path -LiteralPath $resolved -PathType Container) {
  if (-not $projectRoot) { throw 'Packaging a plugin folder requires a DK Data Studio project source tree.' }
  $manifestPath = Join-Path $resolved 'plugin.json'
  if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) { throw "plugin.json not found: $resolved" }
  $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
  $safeId = ([string]$manifest.id) -replace '[^A-Za-z0-9._-]','_'
  if (-not $OutputPath) { $OutputPath = Join-Path $projectRoot ("plugin-dist\{0}-{1}.dkplugin" -f $safeId,[string]$manifest.version) }
  $packagePath = [IO.Path]::GetFullPath($OutputPath)
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $packagePath) | Out-Null
  $arguments = @((Join-Path $projectRoot 'scripts\package-plugin.js'))
  if (([string]$manifest.id).StartsWith('builtin.')) { $arguments += '--allow-builtin' }
  $arguments += @($resolved,$packagePath)
  & node @arguments | Out-Host
  if ($LASTEXITCODE -ne 0) { throw "Plugin packaging failed with exit code $LASTEXITCODE" }
} elseif (Test-Path -LiteralPath $resolved -PathType Leaf) {
  if ([IO.Path]::GetExtension($resolved) -ine '.dkplugin') { throw 'PluginPath must be a plugin folder or a .dkplugin package.' }
  $packagePath = $resolved
} else {
  throw "Plugin path not found: $resolved"
}

$health = Ensure-UpdateServer $ServerBaseUrl $projectRoot
$publishUri = $ServerBaseUrl.TrimEnd('/') + '/api/plugins/publish'
Write-Host "Publishing plugin package: $packagePath" -ForegroundColor Cyan
$response = Invoke-RestMethod -Method Put -Uri $publishUri -InFile $packagePath -ContentType 'application/json; charset=utf-8' -TimeoutSec 30
if (-not $response.ok) { throw 'Plugin publish failed.' }
Write-Host ("Published {0} v{1}" -f $response.plugin.id,$response.plugin.version) -ForegroundColor Green
Write-Host ("SHA256: {0}" -f $response.plugin.sha256) -ForegroundColor DarkGray
Write-Host ("Connected clients: {0}" -f $response.connectedClients) -ForegroundColor DarkGray
Write-Host '客户端会自动下载该插件包；当前版本重启 DK Data Studio 后启用新插件代码。' -ForegroundColor Yellow
