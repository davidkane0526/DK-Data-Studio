param(
  [string]$SourceRoot = '',
  [string]$OutputPath = ''
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'

if (-not $SourceRoot) {
  $SourceRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
}
$SourceRoot = [IO.Path]::GetFullPath($SourceRoot)

if (-not (Test-Path -LiteralPath (Join-Path $SourceRoot '.git'))) {
  throw "A complete .git directory is required: $SourceRoot"
}
if (-not (Test-Path -LiteralPath (Join-Path $SourceRoot 'package.json'))) {
  throw "package.json not found: $SourceRoot"
}

$dirty = @(& git -C $SourceRoot status --porcelain --untracked-files=all)
if ($LASTEXITCODE -ne 0) { throw 'git status failed.' }
if ($dirty.Count -gt 0) {
  throw "Source repository must be clean before a Source Release is created:`n$($dirty -join "`n")"
}

$pkg = Get-Content -LiteralPath (Join-Path $SourceRoot 'package.json') -Raw | ConvertFrom-Json
$version = [string]$pkg.version
if (-not $version) { throw 'Unable to resolve package version.' }

if (-not $OutputPath) {
  $OutputPath = Join-Path (Split-Path $SourceRoot -Parent) "DK-Data-Studio-v$version-Source-Release.zip"
}
$OutputPath = [IO.Path]::GetFullPath($OutputPath)
$OutputDir = Split-Path $OutputPath -Parent
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
if (Test-Path -LiteralPath $OutputPath) { Remove-Item -LiteralPath $OutputPath -Force }

$prefix = "DK-Data-Studio-v$version-Source/"
& git -C $SourceRoot archive --format=zip "--prefix=$prefix" -o $OutputPath HEAD
if ($LASTEXITCODE -ne 0) { throw "git archive failed with exit code $LASTEXITCODE" }
if (-not (Test-Path -LiteralPath $OutputPath -PathType Leaf)) { throw 'Source Release ZIP was not created.' }

$size = (Get-Item -LiteralPath $OutputPath).Length
if ($size -lt 1024) { throw "Source Release ZIP is unexpectedly small: $size bytes" }
Write-Host "Source Release ZIP: $OutputPath"
Write-Host "Version: $version"
Write-Host "Size: $size bytes"
Write-Host 'Git history: excluded (tracked HEAD only)'
