param(
  [Parameter(Position=0)][string]$Action = 'menu',
  [string]$Version = '',
  [string]$PluginPath = '',
  [string]$OutputPath = ''
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$Mobile = Join-Path $Root 'mobile'
$UpdateServer = Join-Path $Root 'services\update-server'
$MobileDist = Join-Path $Root 'mobile-dist'

function Write-SectionTitle([string]$Text) {
  Write-Host ''
  Write-Host ('=' * 68) -ForegroundColor DarkGray
  Write-Host (' DKDS · ' + $Text) -ForegroundColor Cyan
  Write-Host ('=' * 68) -ForegroundColor DarkGray
}

function Require-Command([string]$Name,[string]$Hint='') {
  $command = Get-Command $Name -ErrorAction SilentlyContinue
  if (-not $command) {
    throw "$Name not found. $Hint"
  }
  return $command
}

function Invoke-Step {
  param(
    [Parameter(Mandatory=$true)][string]$FilePath,
    [string[]]$Arguments = @(),
    [string]$WorkingDirectory = $Root
  )

  if (-not (Test-Path $WorkingDirectory)) {
    throw "Working directory not found: $WorkingDirectory"
  }

  Push-Location $WorkingDirectory
  try {
    $display = if ($Arguments.Count -gt 0) { $FilePath + ' ' + ($Arguments -join ' ') } else { $FilePath }
    Write-Host ('> ' + $display) -ForegroundColor DarkGray
    & $FilePath @Arguments
    $exitCode = $LASTEXITCODE
    if ($null -ne $exitCode -and $exitCode -ne 0) {
      throw "$FilePath exited with code $exitCode"
    }
  } finally {
    Pop-Location
  }
}

function Install-NodeDeps([string]$Dir=$Root) {
  [void](Require-Command 'node' 'Install Node.js first.')
  [void](Require-Command 'npm.cmd' 'Install Node.js first.')
  if (-not (Test-Path (Join-Path $Dir 'package.json'))) {
    throw "package.json not found: $Dir"
  }
  Write-SectionTitle "Install dependencies · $Dir"
  Invoke-Step -FilePath 'npm.cmd' -Arguments @('install') -WorkingDirectory $Dir
}

function Ensure-NodeDeps([string]$Dir=$Root) {
  [void](Require-Command 'node' 'Install Node.js first.')
  [void](Require-Command 'npm.cmd' 'Install Node.js first.')
  if (-not (Test-Path (Join-Path $Dir 'node_modules'))) {
    Install-NodeDeps -Dir $Dir
  }
}

function Show-DesktopDoctor {
  Write-SectionTitle 'Desktop tooling diagnostics'
  $ok = $true
  foreach ($name in @('node','npm.cmd','git')) {
    $command = Get-Command $name -ErrorAction SilentlyContinue
    if ($command) {
      Write-Host ("OK  {0}: {1}" -f $name,$command.Source) -ForegroundColor Green
    } else {
      Write-Host ("ERR {0}: not found" -f $name) -ForegroundColor Red
      $ok = $false
    }
  }

  if (Get-Command node -ErrorAction SilentlyContinue) {
    Invoke-Step -FilePath 'node' -Arguments @('--version')
  }
  if (Get-Command npm.cmd -ErrorAction SilentlyContinue) {
    Invoke-Step -FilePath 'npm.cmd' -Arguments @('--version')
  }
  if (Get-Command git -ErrorAction SilentlyContinue) {
    Invoke-Step -FilePath 'git' -Arguments @('--version')
  }

  $modules = Join-Path $Root 'node_modules'
  if (Test-Path $modules) {
    Write-Host "OK  dependencies: $modules" -ForegroundColor Green
  } else {
    Write-Host 'WARN node_modules is missing. Run install-deps or start dev to install it.' -ForegroundColor Yellow
  }

  Write-Host "ROOT: $Root" -ForegroundColor DarkGray
  if (-not $ok) { return $false }
  return $true
}

function Add-PathEntry([string]$PathEntry) {
  if (-not $PathEntry -or -not (Test-Path $PathEntry)) { return }
  $parts = @($env:PATH -split ';' | Where-Object { $_ })
  if ($parts -notcontains $PathEntry) { $env:PATH = $PathEntry + ';' + $env:PATH }
}

function Resolve-AndroidSdk {
  $candidates = @()
  if ($env:ANDROID_HOME) { $candidates += $env:ANDROID_HOME }
  if ($env:ANDROID_SDK_ROOT) { $candidates += $env:ANDROID_SDK_ROOT }
  if ($env:LOCALAPPDATA) { $candidates += (Join-Path $env:LOCALAPPDATA 'Android\Sdk') }
  if ($env:USERPROFILE) { $candidates += (Join-Path $env:USERPROFILE 'AppData\Local\Android\Sdk') }

  foreach ($candidate in ($candidates | Select-Object -Unique)) {
    if (-not $candidate -or -not (Test-Path $candidate)) { continue }
    $env:ANDROID_HOME = $candidate
    $env:ANDROID_SDK_ROOT = $candidate
    Add-PathEntry (Join-Path $candidate 'platform-tools')
    Add-PathEntry (Join-Path $candidate 'cmdline-tools\latest\bin')
    return $candidate
  }
  return $null
}

function Resolve-JavaToolchain {
  $homes = New-Object System.Collections.Generic.List[string]
  foreach ($envHome in @($env:JAVA_HOME,$env:JDK_HOME,$env:STUDIO_JDK)) { if ($envHome) { $homes.Add($envHome) } }

  $javaOnPath = Get-Command 'java.exe' -ErrorAction SilentlyContinue
  if ($javaOnPath -and $javaOnPath.Source) {
    try { $homes.Add((Split-Path (Split-Path $javaOnPath.Source -Parent) -Parent)) } catch {}
  }

  foreach ($programRoot in @($env:ProgramFiles,${env:ProgramFiles(x86)},$env:LOCALAPPDATA)) {
    if (-not $programRoot) { continue }
    $homes.Add((Join-Path $programRoot 'Android\Android Studio\jbr'))
    $homes.Add((Join-Path $programRoot 'Android\Android Studio\jre'))
    $homes.Add((Join-Path $programRoot 'Programs\Android Studio\jbr'))
  }

  $studio = Get-Command 'studio64.exe' -ErrorAction SilentlyContinue
  if ($studio -and $studio.Source) {
    try { $homes.Add((Join-Path (Split-Path (Split-Path $studio.Source -Parent) -Parent) 'jbr')) } catch {}
  }

  foreach ($uninstallRoot in @(
    'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall',
    'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall',
    'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall'
  )) {
    if (-not (Test-Path $uninstallRoot)) { continue }
    Get-ChildItem $uninstallRoot -ErrorAction SilentlyContinue | ForEach-Object {
      try {
        $item=Get-ItemProperty $_.PSPath -ErrorAction Stop
        if ([string]$item.DisplayName -match 'Android Studio') {
          $install=[string]$item.InstallLocation
          if ($install) { $homes.Add((Join-Path $install 'jbr')) }
          $icon=[string]$item.DisplayIcon
          if ($icon) {
            $exe=$icon.Trim('"').Split(',')[0]
            $root=Split-Path (Split-Path $exe -Parent) -Parent
            if ($root) { $homes.Add((Join-Path $root 'jbr')) }
          }
        }
      } catch {}
    }
  }

  if ($env:ProgramFiles) {
    foreach ($root in @('Java','Eclipse Adoptium','Microsoft')) {
      $base = Join-Path $env:ProgramFiles $root
      if (Test-Path $base) {
        Get-ChildItem $base -Directory -ErrorAction SilentlyContinue |
          Sort-Object LastWriteTime -Descending |
          ForEach-Object { $homes.Add($_.FullName) }
      }
    }
  }

  foreach ($regPath in @(
    'HKLM:\SOFTWARE\JavaSoft\JDK',
    'HKLM:\SOFTWARE\WOW6432Node\JavaSoft\JDK'
  )) {
    if (-not (Test-Path $regPath)) { continue }
    Get-ChildItem $regPath -ErrorAction SilentlyContinue | ForEach-Object {
      try {
        $home=(Get-ItemProperty $_.PSPath -ErrorAction Stop).JavaHome
        if ($home) { $homes.Add([string]$home) }
      } catch {}
    }
  }

  foreach ($home in ($homes | Select-Object -Unique)) {
    if (-not $home) { continue }
    $java = Join-Path $home 'bin\java.exe'
    $keytool = Join-Path $home 'bin\keytool.exe'
    if ((Test-Path $java) -and (Test-Path $keytool)) {
      $env:JAVA_HOME = $home
      Add-PathEntry (Join-Path $home 'bin')
      return @{ Home=$home; Java=$java; Keytool=$keytool }
    }
  }
  return $null
}

function Check-AndroidEnvironment {
  Write-SectionTitle 'Android environment check'
  $ok = $true
  $sdk = Resolve-AndroidSdk
  $jdk = Resolve-JavaToolchain

  $node = Get-Command 'node' -ErrorAction SilentlyContinue
  if ($node) { Write-Host ("OK  node: {0}" -f $node.Source) -ForegroundColor Green }
  else { Write-Host 'ERR node: not found' -ForegroundColor Red; $ok=$false }

  if ($jdk) {
    Write-Host ("OK  java: {0}" -f $jdk.Java) -ForegroundColor Green
    Write-Host ("OK  keytool: {0}" -f $jdk.Keytool) -ForegroundColor Green
    Write-Host ("JAVA_HOME: {0}" -f $jdk.Home) -ForegroundColor Green
  } else {
    Write-Host 'ERR java/keytool: no complete JDK was found.' -ForegroundColor Red
    Write-Host '    DKDS automatically checks JAVA_HOME, PATH, Android Studio\jbr, Java, Eclipse Adoptium and Microsoft JDK folders.' -ForegroundColor Yellow
    $ok=$false
  }

  $adb = Get-Command 'adb.exe' -ErrorAction SilentlyContinue
  if ($adb) { Write-Host ("OK  adb: {0}" -f $adb.Source) -ForegroundColor Green }
  elseif ($sdk -and (Test-Path (Join-Path $sdk 'platform-tools\adb.exe'))) {
    $adbPath=Join-Path $sdk 'platform-tools\adb.exe'
    Add-PathEntry (Split-Path $adbPath -Parent)
    Write-Host ("OK  adb: {0}" -f $adbPath) -ForegroundColor Green
  } else {
    Write-Host 'ERR adb: Android SDK Platform-Tools is missing.' -ForegroundColor Red
    $ok=$false
  }

  if ($node) { Invoke-Step -FilePath $node.Source -Arguments @('--version') }
  if ($jdk) { Invoke-Step -FilePath $jdk.Java -Arguments @('-version') }

  if ($sdk) {
    Write-Host "ANDROID_HOME: $sdk" -ForegroundColor Green
    if (Test-Path (Join-Path $sdk 'platforms\android-36')) { Write-Host 'OK  Android SDK Platform 36' -ForegroundColor Green }
    else { Write-Host 'ERR Android SDK Platform 36 is missing.' -ForegroundColor Red; $ok=$false }
  } else {
    Write-Host 'ERR Android SDK was not found.' -ForegroundColor Red
    $ok=$false
  }

  if (-not $ok) {
    Write-Host ''
    Write-Host 'See docs\guides\ANDROID_QUICK_START_CN.txt and mobile\README_ANDROID_CN.md.' -ForegroundColor Yellow
    return $false
  }
  return $true
}


function Initialize-AndroidReleaseSigning {
  [void](Require-Command 'keytool' 'Install a JDK, not only a JRE.')

  $base = if ($env:LOCALAPPDATA) {
    Join-Path $env:LOCALAPPDATA 'DKDataStudio\android-signing'
  } elseif ($env:USERPROFILE) {
    Join-Path $env:USERPROFILE '.dkds\android-signing'
  } else {
    throw 'Cannot resolve a persistent user directory for Android release signing.'
  }

  New-Item -ItemType Directory -Force -Path $base | Out-Null
  $keystore = Join-Path $base 'dkds-release.jks'
  $metadata = Join-Path $base 'signing.json'
  $alias = 'dkdsrelease'

  if ((Test-Path $keystore) -xor (Test-Path $metadata)) {
    throw "Incomplete Android release signing state in $base. Restore both dkds-release.jks and signing.json, or remove both to generate a new signing identity."
  }

  if (-not (Test-Path $keystore)) {
    Write-SectionTitle 'Create local Android release signing key'
    $password = ([Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N'))
    $keytoolArgs = @(
      '-genkeypair','-noprompt',
      '-keystore',$keystore,
      '-storetype','JKS',
      '-storepass',$password,
      '-alias',$alias,
      '-keypass',$password,
      '-keyalg','RSA',
      '-keysize','4096',
      '-validity','10000',
      '-dname','CN=DK Data Studio, OU=Local Release, O=DK Data Studio'
    )
    & keytool @keytoolArgs
    $exitCode = $LASTEXITCODE
    if ($null -ne $exitCode -and $exitCode -ne 0) {
      throw "keytool exited with code $exitCode"
    }
    @{
      storePassword = $password
      keyAlias = $alias
      keyPassword = $password
    } | ConvertTo-Json | Set-Content -Path $metadata -Encoding UTF8
    Write-Host "Created persistent release signing identity: $keystore" -ForegroundColor Green
    Write-Host 'Back up this signing directory if you need future APKs to update the same installed app.' -ForegroundColor Yellow
  }

  $signing = Get-Content -Raw -Path $metadata | ConvertFrom-Json
  if (-not $signing.storePassword -or -not $signing.keyAlias -or -not $signing.keyPassword) {
    throw "Invalid Android signing metadata: $metadata"
  }

  $env:DKDS_LOCAL_RELEASE_SIGNING = '1'
  $env:DKDS_ANDROID_RELEASE_STORE_FILE = $keystore
  $env:DKDS_ANDROID_RELEASE_STORE_PASSWORD = [string]$signing.storePassword
  $env:DKDS_ANDROID_RELEASE_KEY_ALIAS = [string]$signing.keyAlias
  $env:DKDS_ANDROID_RELEASE_KEY_PASSWORD = [string]$signing.keyPassword
  Write-Host "Release signing: $keystore" -ForegroundColor DarkGray
}

function Write-AndroidSigningMigrationHint {
  Write-Host ''
  Write-Host 'If an older DKDS Android build with a different signing identity is already installed, Android cannot replace it in place.' -ForegroundColor Yellow
  Write-Host 'One-time migration command: adb uninstall com.dk.datastudio' -ForegroundColor Yellow
  Write-Host 'Then run DKDS.cmd android-install again. This uninstall removes the old app data.' -ForegroundColor Yellow
}

function Build-AndroidRelease {
  if (-not (Check-AndroidEnvironment)) { throw 'Android environment is incomplete.' }
  Ensure-NodeDeps -Dir $Mobile
  Initialize-AndroidReleaseSigning
  Write-SectionTitle 'Prepare Android offline renderer'
  Invoke-Step -FilePath 'npm.cmd' -Arguments @('run','sync:web') -WorkingDirectory $Mobile
  Write-SectionTitle 'Expo prebuild'
  Invoke-Step -FilePath 'npx.cmd' -Arguments @('expo','prebuild','--platform','android','--clean') -WorkingDirectory $Mobile
  Write-SectionTitle 'Build release APK'
  Invoke-Step -FilePath '.\gradlew.bat' -Arguments @('assembleRelease') -WorkingDirectory (Join-Path $Mobile 'android')
  New-Item -ItemType Directory -Force -Path $MobileDist | Out-Null
  $src = Join-Path $Mobile 'android\app\build\outputs\apk\release\app-release.apk'
  if (-not (Test-Path $src)) { throw "Release APK was not generated: $src" }
  $dst = Join-Path $MobileDist 'DK-Data-Studio.apk'
  Copy-Item -Force $src $dst
  Write-Host "APK: $dst" -ForegroundColor Green
}

function Install-UpdateServerAutostart {
  $node = (Require-Command 'node' 'Install Node.js first.').Source
  $serverScript = Join-Path $UpdateServer 'server.js'
  $taskName = 'DKDS LAN Update Server'
  $taskAction = New-ScheduledTaskAction -Execute $node -Argument ('"' + $serverScript + '"') -WorkingDirectory $Root
  $trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
  $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew
  Register-ScheduledTask -TaskName $taskName -Action $taskAction -Trigger $trigger -Settings $settings -Description 'DK Data Studio local LAN update push server' -Force | Out-Null
  Start-ScheduledTask -TaskName $taskName
  Write-Host "Installed and started scheduled task: $taskName" -ForegroundColor Green
}

function Remove-UpdateServerAutostart {
  $taskName = 'DKDS LAN Update Server'
  Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
  Write-Host "Removed scheduled task: $taskName" -ForegroundColor Green
}

function Resolve-ReleaseVersion {
  if ($Version) { return $Version }
  $v = Read-Host 'Release version, e.g. 3.21.0'
  if (-not $v) { throw 'A release version is required.' }
  return $v
}

function Show-Menu {
  Write-SectionTitle 'Developer toolbox'
  Write-Host '  1  Start desktop development'
  Write-Host '  2  Install/repair desktop dependencies'
  Write-Host '  3  Run desktop tooling diagnostics'
  Write-Host '  4  Run complete project check'
  Write-Host '  5  Run regression tests'
  Write-Host '  6  Build Windows Setup + Portable'
  Write-Host '  7  Check Android environment'
  Write-Host '  8  Build Android release APK'
  Write-Host '  9  Run/install Android on connected device'
  Write-Host ' 10  Install existing Android APK'
  Write-Host ' 11  Start LAN update server'
  Write-Host ' 12  Build + publish LAN update'
  Write-Host ' 13  Publish existing Windows build'
  Write-Host ' 14  Validate plugins'
  Write-Host ' 15  Open project folder'
  Write-Host ' 16  Open documentation'
  Write-Host '  0  Exit'
  $choice = Read-Host 'Select'
  $map = @{
    '1'='dev';'2'='install-deps';'3'='doctor';'4'='check';'5'='test';'6'='build-windows';
    '7'='android-check';'8'='android-build';'9'='android-run';'10'='android-install';'11'='update-server';
    '12'='build-publish-update';'13'='publish-update';'14'='plugin-validate';'15'='open-root';'16'='open-docs';'0'='exit'
  }
  if ($map.ContainsKey($choice)) { return $map[$choice] }
  return 'menu'
}

try {
  if (-not $Action -or $Action -eq 'menu') { $Action = Show-Menu }
  switch ($Action.ToLowerInvariant()) {
    'exit' { exit 0 }
    'install-deps' { Install-NodeDeps -Dir $Root }
    'doctor' { if (-not (Show-DesktopDoctor)) { exit 2 } }
    'dev' { Ensure-NodeDeps -Dir $Root; Write-SectionTitle 'Desktop development'; Invoke-Step -FilePath 'npm.cmd' -Arguments @('start') }
    'check' { Ensure-NodeDeps -Dir $Root; Write-SectionTitle 'Complete project check'; Invoke-Step -FilePath 'npm.cmd' -Arguments @('run','check') }
    'test' { Ensure-NodeDeps -Dir $Root; Write-SectionTitle 'Regression tests'; Invoke-Step -FilePath 'npm.cmd' -Arguments @('test') }
    'build-windows' { Ensure-NodeDeps -Dir $Root; Write-SectionTitle 'Windows build'; Invoke-Step -FilePath 'npm.cmd' -Arguments @('run','dist') }
    'android-check' { if (-not (Check-AndroidEnvironment)) { exit 2 } }
    'android-build' { Build-AndroidRelease }
    'android-run' {
      if (-not (Check-AndroidEnvironment)) { throw 'Android environment is incomplete.' }
      Ensure-NodeDeps -Dir $Mobile
      Initialize-AndroidReleaseSigning
      Invoke-Step -FilePath 'npm.cmd' -Arguments @('run','sync:web') -WorkingDirectory $Mobile
      Invoke-Step -FilePath 'npx.cmd' -Arguments @('expo','prebuild','--platform','android','--clean') -WorkingDirectory $Mobile
      try {
        Invoke-Step -FilePath 'npx.cmd' -Arguments @('expo','run:android','--variant','release') -WorkingDirectory $Mobile
      } catch {
        Write-AndroidSigningMigrationHint
        throw
      }
    }
    'android-install' {
      if (-not (Check-AndroidEnvironment)) { throw 'Android environment is incomplete.' }
      [void](Require-Command 'adb' 'Install Android SDK Platform Tools.')
      $apk = Join-Path $MobileDist 'DK-Data-Studio.apk'
      if (-not (Test-Path $apk)) { throw "APK not found: $apk. Run android-build first." }
      Invoke-Step -FilePath 'adb' -Arguments @('devices')
      try {
        Invoke-Step -FilePath 'adb' -Arguments @('install','-r',$apk)
      } catch {
        Write-AndroidSigningMigrationHint
        throw
      }
    }
    'update-server' { Ensure-NodeDeps -Dir $Root; Write-SectionTitle 'LAN update server'; Invoke-Step -FilePath 'node' -Arguments @('services/update-server/server.js') }
    'build-publish-update' {
      Ensure-NodeDeps -Dir $Root
      $release = Resolve-ReleaseVersion
      Write-SectionTitle "Build + publish $release"
      Invoke-Step -FilePath 'node' -Arguments @('scripts/set-version.js',$release)
      Invoke-Step -FilePath 'npm.cmd' -Arguments @('run','dist')
      Invoke-Step -FilePath 'node' -Arguments @('services/update-server/publish-release.js','dist')
    }
    'publish-update' {
      Ensure-NodeDeps -Dir $Root
      if (-not (Test-Path (Join-Path $Root 'dist\latest.yml'))) { throw 'dist\latest.yml not found. Build Windows first.' }
      Write-SectionTitle 'Publish existing Windows build'
      Invoke-Step -FilePath 'node' -Arguments @('services/update-server/publish-release.js','dist')
    }
    'update-autostart-install' { Ensure-NodeDeps -Dir $Root; Install-UpdateServerAutostart }
    'update-autostart-remove' { Remove-UpdateServerAutostart }
    'plugin-index' { Write-SectionTitle 'Generate plugin index'; Invoke-Step -FilePath 'node' -Arguments @('scripts/generate-plugin-index.js') }
    'plugin-validate' { Write-SectionTitle 'Validate plugins'; Invoke-Step -FilePath 'node' -Arguments @('scripts/generate-plugin-index.js'); Invoke-Step -FilePath 'node' -Arguments @('scripts/validate-plugins.js') }
    'plugin-package' {
      if (-not $PluginPath) { throw 'Use -PluginPath <folder>.' }
      $pluginArguments = @('scripts/package-plugin.js',$PluginPath)
      if ($OutputPath) { $pluginArguments += $OutputPath }
      Invoke-Step -FilePath 'node' -Arguments $pluginArguments
    }
    'open-root' { Start-Process explorer.exe -ArgumentList ('"' + $Root + '"') }
    'open-docs' { Start-Process explorer.exe -ArgumentList ('"' + (Join-Path $Root 'docs') + '"') }
    'open-examples' { Start-Process explorer.exe -ArgumentList ('"' + (Join-Path $Root 'examples\external-plugins') + '"') }
    'open-dist' { $d=Join-Path $Root 'dist'; New-Item -ItemType Directory -Force -Path $d|Out-Null; Start-Process explorer.exe -ArgumentList ('"' + $d + '"') }
    'open-mobile-dist' { New-Item -ItemType Directory -Force -Path $MobileDist|Out-Null; Start-Process explorer.exe -ArgumentList ('"' + $MobileDist + '"') }
    'git-status' { Invoke-Step -FilePath 'git' -Arguments @('status','--short','--branch') }
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
