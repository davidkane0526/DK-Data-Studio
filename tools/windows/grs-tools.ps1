param(
  [Parameter(Position=0)][string]$Action = 'menu',
  [string]$Version = '',
  [string]$PluginPath = '',
  [string]$OutputPath = ''
)

$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$Mobile = Join-Path $Root 'mobile'
$UpdateServer = Join-Path $Root 'services\update-server'
$MobileDist = Join-Path $Root 'mobile-dist'

function Title([string]$Text) {
  Write-Host ''
  Write-Host ('=' * 68) -ForegroundColor DarkGray
  Write-Host (' GRS · ' + $Text) -ForegroundColor Cyan
  Write-Host ('=' * 68) -ForegroundColor DarkGray
}

function Require-Command([string]$Name,[string]$Hint='') {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "$Name not found. $Hint"
  }
}

function Invoke-Step([string]$File,[string[]]$Args=@(),[string]$WorkingDirectory=$Root) {
  Push-Location $WorkingDirectory
  try {
    Write-Host ('> ' + $File + ' ' + ($Args -join ' ')) -ForegroundColor DarkGray
    & $File @Args
    if ($LASTEXITCODE -ne 0) { throw "$File exited with code $LASTEXITCODE" }
  } finally { Pop-Location }
}

function Ensure-NodeDeps([string]$Dir=$Root) {
  Require-Command 'node' 'Install Node.js first.'
  Require-Command 'npm.cmd' 'Install Node.js first.'
  if (-not (Test-Path (Join-Path $Dir 'node_modules'))) {
    Title "Install dependencies · $Dir"
    Invoke-Step 'npm.cmd' @('install') $Dir
  }
}

function Check-AndroidEnvironment {
  Title 'Android environment check'
  $ok = $true
  foreach ($name in @('node','java','adb')) {
    $cmd = Get-Command $name -ErrorAction SilentlyContinue
    if ($cmd) { Write-Host ("OK  {0}: {1}" -f $name,$cmd.Source) -ForegroundColor Green }
    else { Write-Host ("ERR {0}: not found" -f $name) -ForegroundColor Red; $ok=$false }
  }
  if (Get-Command node -ErrorAction SilentlyContinue) { & node --version }
  if (Get-Command java -ErrorAction SilentlyContinue) { & java -version }
  $sdk = $env:ANDROID_HOME
  if (-not $sdk -and $env:LOCALAPPDATA) {
    $candidate = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
    if (Test-Path $candidate) { $sdk = $candidate }
  }
  if ($sdk) {
    Write-Host "ANDROID_HOME: $sdk" -ForegroundColor Green
    if (Test-Path (Join-Path $sdk 'platforms\android-36')) { Write-Host 'OK  Android SDK Platform 36' -ForegroundColor Green }
    else { Write-Host 'ERR Android SDK Platform 36 is missing.' -ForegroundColor Red; $ok=$false }
  } else {
    Write-Host 'ERR ANDROID_HOME is not set and default Android Studio SDK was not found.' -ForegroundColor Red
    $ok=$false
  }
  if (-not $ok) {
    Write-Host ''
    Write-Host 'See docs\guides\ANDROID_QUICK_START_CN.txt and mobile\README_ANDROID_CN.md.' -ForegroundColor Yellow
    return $false
  }
  return $true
}

function Build-AndroidDebug {
  if (-not (Check-AndroidEnvironment)) { throw 'Android environment is incomplete.' }
  Ensure-NodeDeps $Mobile
  Title 'Prepare Android offline renderer'
  Invoke-Step 'npm.cmd' @('run','sync:web') $Mobile
  Title 'Expo prebuild'
  Invoke-Step 'npx.cmd' @('expo','prebuild','--platform','android','--clean') $Mobile
  Title 'Build debug APK'
  Invoke-Step '.\gradlew.bat' @('assembleDebug') (Join-Path $Mobile 'android')
  New-Item -ItemType Directory -Force -Path $MobileDist | Out-Null
  $src = Join-Path $Mobile 'android\app\build\outputs\apk\debug\app-debug.apk'
  $dst = Join-Path $MobileDist 'Graphene-Resonance-Studio-debug.apk'
  Copy-Item -Force $src $dst
  Write-Host "APK: $dst" -ForegroundColor Green
}

function Install-UpdateServerAutostart {
  $node = (Get-Command node -ErrorAction Stop).Source
  $serverScript = Join-Path $UpdateServer 'server.js'
  $taskName = 'GRS LAN Update Server'
  $taskAction = New-ScheduledTaskAction -Execute $node -Argument ('"' + $serverScript + '"') -WorkingDirectory $Root
  $trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
  $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew
  Register-ScheduledTask -TaskName $taskName -Action $taskAction -Trigger $trigger -Settings $settings -Description 'Graphene Resonance Studio local LAN update push server' -Force | Out-Null
  Start-ScheduledTask -TaskName $taskName
  Write-Host "Installed and started scheduled task: $taskName" -ForegroundColor Green
}

function Remove-UpdateServerAutostart {
  $taskName = 'GRS LAN Update Server'
  Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
  Write-Host "Removed scheduled task: $taskName" -ForegroundColor Green
}

function Resolve-ReleaseVersion {
  if ($Version) { return $Version }
  $v = Read-Host 'Release version, e.g. 3.20.0-plugin.2'
  if (-not $v) { throw 'A release version is required.' }
  return $v
}

function Show-Menu {
  Title 'Developer toolbox'
  Write-Host '  1  Start desktop development'
  Write-Host '  2  Run complete project check'
  Write-Host '  3  Run regression tests'
  Write-Host '  4  Build Windows Setup + Portable'
  Write-Host '  5  Check Android environment'
  Write-Host '  6  Build Android debug APK'
  Write-Host '  7  Run/install Android on connected device'
  Write-Host '  8  Install existing Android APK'
  Write-Host '  9  Start LAN update server'
  Write-Host ' 10  Build + publish LAN update'
  Write-Host ' 11  Publish existing Windows build'
  Write-Host ' 12  Validate plugins'
  Write-Host ' 13  Open project folder'
  Write-Host ' 14  Open documentation'
  Write-Host '  0  Exit'
  $choice = Read-Host 'Select'
  $map = @{
    '1'='dev';'2'='check';'3'='test';'4'='build-windows';'5'='android-check';'6'='android-build';
    '7'='android-run';'8'='android-install';'9'='update-server';'10'='build-publish-update';'11'='publish-update';
    '12'='plugin-validate';'13'='open-root';'14'='open-docs';'0'='exit'
  }
  if ($map.ContainsKey($choice)) { return $map[$choice] }
  return 'menu'
}

try {
  if (-not $Action -or $Action -eq 'menu') { $Action = Show-Menu }
  switch ($Action.ToLowerInvariant()) {
    'exit' { exit 0 }
    'dev' { Ensure-NodeDeps; Title 'Desktop development'; Invoke-Step 'npm.cmd' @('start') }
    'check' { Ensure-NodeDeps; Title 'Complete project check'; Invoke-Step 'npm.cmd' @('run','check') }
    'test' { Ensure-NodeDeps; Title 'Regression tests'; Invoke-Step 'npm.cmd' @('test') }
    'build-windows' { Ensure-NodeDeps; Title 'Windows build'; Invoke-Step 'npm.cmd' @('run','dist') }
    'android-check' { if (-not (Check-AndroidEnvironment)) { exit 2 } }
    'android-build' { Build-AndroidDebug }
    'android-run' {
      if (-not (Check-AndroidEnvironment)) { throw 'Android environment is incomplete.' }
      Ensure-NodeDeps $Mobile
      Invoke-Step 'npm.cmd' @('run','sync:web') $Mobile
      Invoke-Step 'npx.cmd' @('expo','run:android') $Mobile
    }
    'android-install' {
      Require-Command 'adb' 'Install Android SDK Platform Tools.'
      $apk = Join-Path $MobileDist 'Graphene-Resonance-Studio-debug.apk'
      if (-not (Test-Path $apk)) { throw "APK not found: $apk. Run android-build first." }
      Invoke-Step 'adb' @('devices')
      Invoke-Step 'adb' @('install','-r',$apk)
    }
    'update-server' { Ensure-NodeDeps; Title 'LAN update server'; Invoke-Step 'node' @('services/update-server/server.js') }
    'build-publish-update' {
      Ensure-NodeDeps
      $release = Resolve-ReleaseVersion
      Title "Build + publish $release"
      Invoke-Step 'node' @('scripts/set-version.js',$release)
      Invoke-Step 'npm.cmd' @('run','dist')
      Invoke-Step 'node' @('services/update-server/publish-release.js','dist')
    }
    'publish-update' {
      Ensure-NodeDeps
      if (-not (Test-Path (Join-Path $Root 'dist\latest.yml'))) { throw 'dist\latest.yml not found. Build Windows first.' }
      Title 'Publish existing Windows build'
      Invoke-Step 'node' @('services/update-server/publish-release.js','dist')
    }
    'update-autostart-install' { Ensure-NodeDeps; Install-UpdateServerAutostart }
    'update-autostart-remove' { Remove-UpdateServerAutostart }
    'plugin-index' { Title 'Generate plugin index'; Invoke-Step 'node' @('scripts/generate-plugin-index.js') }
    'plugin-validate' { Title 'Validate plugins'; Invoke-Step 'node' @('scripts/generate-plugin-index.js'); Invoke-Step 'node' @('scripts/validate-plugins.js') }
    'plugin-package' {
      if (-not $PluginPath) { throw 'Use -PluginPath <folder>.' }
      $args=@('scripts/package-plugin.js',$PluginPath)
      if ($OutputPath) { $args += $OutputPath }
      Invoke-Step 'node' $args
    }
    'open-root' { Start-Process explorer.exe $Root }
    'open-docs' { Start-Process explorer.exe (Join-Path $Root 'docs') }
    'open-examples' { Start-Process explorer.exe (Join-Path $Root 'examples\external-plugins') }
    'open-dist' { $d=Join-Path $Root 'dist'; New-Item -ItemType Directory -Force -Path $d|Out-Null; Start-Process explorer.exe $d }
    'open-mobile-dist' { New-Item -ItemType Directory -Force -Path $MobileDist|Out-Null; Start-Process explorer.exe $MobileDist }
    'git-status' { Invoke-Step 'git' @('status','--short','--branch') }
    default { throw "Unknown action: $Action" }
  }
  if ($Action -ne 'dev' -and $Action -ne 'update-server') {
    Write-Host ''
    Write-Host 'Done.' -ForegroundColor Green
  }
} catch {
  Write-Host ''
  Write-Host ('FAILED: ' + $_.Exception.Message) -ForegroundColor Red
  exit 1
}
