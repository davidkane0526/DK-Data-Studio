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

if (-not $OutputPath) {
  $OutputPath = Join-Path (Split-Path $SourceRoot -Parent) 'DK-Data-Studio-clean.zip'
}
$OutputPath = [IO.Path]::GetFullPath($OutputPath)
$OutputDir = Split-Path $OutputPath -Parent
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$stamp = [Guid]::NewGuid().ToString('N')
$tempRoot = Join-Path ([IO.Path]::GetTempPath()) "dkds-clean-$stamp"
$stage = Join-Path $tempRoot 'DK-Data-Studio'

try {
  New-Item -ItemType Directory -Force -Path $stage | Out-Null

  $excludeDirs = @(
    'node_modules',
    'dist',
    'artifact-windows',
    'artifact-project',
    'mobile-dist',
    '.expo',
    '.cache',
    'coverage'
  )

  $roboArgs = @(
    $SourceRoot,
    $stage,
    '/E',
    '/COPY:DAT',
    '/DCOPY:DAT',
    '/R:1',
    '/W:1',
    '/NFL',
    '/NDL',
    '/NJH',
    '/NJS',
    '/NP'
  )
  foreach ($dir in $excludeDirs) {
    $roboArgs += '/XD'
    $roboArgs += (Join-Path $SourceRoot $dir)
  }
  $roboArgs += '/XD'
  $roboArgs += (Join-Path $SourceRoot 'mobile\node_modules')
  $roboArgs += '/XD'
  $roboArgs += (Join-Path $SourceRoot 'mobile\android\.gradle')
  $roboArgs += '/XD'
  $roboArgs += (Join-Path $SourceRoot 'mobile\android\app\build')
  $roboArgs += '/XD'
  $roboArgs += (Join-Path $SourceRoot 'mobile\android\build')

  & robocopy @roboArgs | Out-Null
  $rc = $LASTEXITCODE
  if ($rc -gt 7) { throw "robocopy failed with exit code $rc" }

  foreach ($required in @(
    '.git\HEAD',
    'package.json',
    'DKDS.cmd',
    'DKDS_GUI.cmd',
    'tools\windows\dkds-tools.ps1',
    'tools\windows\dkds-gui.ps1',
    'tools\windows\package-clean-project.ps1'
  )) {
    if (-not (Test-Path -LiteralPath (Join-Path $stage $required))) {
      throw "Clean package is missing required file: $required"
    }
  }

  $dirty = @(& git -C $stage status --porcelain --untracked-files=all)
  if ($LASTEXITCODE -ne 0) { throw 'git status failed inside the staged clean project.' }
  if ($dirty.Count -gt 0) {
    throw "Staged project is not Git-clean:`n$($dirty -join "`n")"
  }

  $head = (& git -C $stage rev-parse HEAD).Trim()
  if ($LASTEXITCODE -ne 0 -or -not $head) { throw 'Unable to resolve staged repository HEAD.' }
  Write-Host "Clean project HEAD: $head"

  if (Test-Path -LiteralPath $OutputPath) { Remove-Item -LiteralPath $OutputPath -Force }

  $sevenZip = Get-Command 7z.exe -ErrorAction SilentlyContinue
  if ($sevenZip) {
    Push-Location $tempRoot
    try {
      & $sevenZip.Source a -tzip -mx=7 $OutputPath 'DK-Data-Studio' | Out-Host
      if ($LASTEXITCODE -ne 0) { throw "7z failed with exit code $LASTEXITCODE" }
    } finally { Pop-Location }
  } else {
    $tar = Get-Command tar.exe -ErrorAction SilentlyContinue
    if (-not $tar) { throw 'Neither 7z.exe nor tar.exe is available to create the ZIP.' }
    & $tar.Source -a -c -f $OutputPath -C $tempRoot 'DK-Data-Studio'
    if ($LASTEXITCODE -ne 0) { throw "tar failed with exit code $LASTEXITCODE" }
  }

  if (-not (Test-Path -LiteralPath $OutputPath -PathType Leaf)) {
    throw 'Clean project ZIP was not created.'
  }
  $size = (Get-Item -LiteralPath $OutputPath).Length
  if ($size -lt 1024) { throw "Clean project ZIP is unexpectedly small: $size bytes" }
  Write-Host "Clean project ZIP: $OutputPath"
  Write-Host "Size: $size bytes"
} finally {
  Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
}
