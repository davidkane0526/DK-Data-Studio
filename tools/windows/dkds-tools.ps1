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

function Get-DeveloperConfigPath {
  if ($env:DKDS_TOOLBOX_CONFIG) { return [IO.Path]::GetFullPath($env:DKDS_TOOLBOX_CONFIG) }
  if ($env:LOCALAPPDATA) { return (Join-Path $env:LOCALAPPDATA 'DKDataStudio\developer-toolbox.json') }
  if ($env:USERPROFILE) { return (Join-Path $env:USERPROFILE '.dkds-developer-toolbox.json') }
  return (Join-Path $Root '.dkds-developer-toolbox.json')
}

function Read-DeveloperConfig {
  $configPath = Get-DeveloperConfigPath
  if (-not (Test-Path -LiteralPath $configPath -PathType Leaf)) { return $null }
  try { return (Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json) }
  catch {
    Write-Host "WARN invalid developer toolbox config: $configPath" -ForegroundColor Yellow
    return $null
  }
}

function Get-DeveloperConfigValue([string]$Name) {
  if (-not $script:DeveloperConfig) { return $null }
  $property = $script:DeveloperConfig.PSObject.Properties[$Name]
  if (-not $property) { return $null }
  $value = [string]$property.Value
  if ([string]::IsNullOrWhiteSpace($value)) { return $null }
  return $value.Trim()
}

function Resolve-ConfiguredPath([string]$Value) {
  if ([string]::IsNullOrWhiteSpace($Value)) { return $null }
  return [IO.Path]::GetFullPath([Environment]::ExpandEnvironmentVariables($Value.Trim()))
}

$script:DeveloperConfig = Read-DeveloperConfig

function Get-SharedToolRoot {
  if ($env:DK_TOOL_ROOT) { return (Resolve-ConfiguredPath $env:DK_TOOL_ROOT) }
  $configured = Get-DeveloperConfigValue 'toolRoot'
  if ($configured) { return (Resolve-ConfiguredPath $configured) }
  if ($env:PYDROID_TOOL_ROOT -and $env:PYDROID_TOOL_ROOT -ine 'D:\Code\Language') { return (Resolve-ConfiguredPath $env:PYDROID_TOOL_ROOT) }
  if (Test-Path 'D:\Code\NodeJs\node.exe') { return 'D:\Code' }
  if ($env:PYDROID_TOOL_ROOT) { return (Resolve-ConfiguredPath $env:PYDROID_TOOL_ROOT) }
  if (Test-Path 'D:\Code') { return 'D:\Code' }
  if ($env:LOCALAPPDATA) { return (Join-Path $env:LOCALAPPDATA 'DKSharedToolchain') }
  if ($env:USERPROFILE) { return (Join-Path $env:USERPROFILE '.dk-toolchain') }
  return $null
}

function Get-SharedCacheRoot {
  if ($env:DK_CACHE_ROOT) { return (Resolve-ConfiguredPath $env:DK_CACHE_ROOT) }
  $configured = Get-DeveloperConfigValue 'cacheRoot'
  if ($configured) { return (Resolve-ConfiguredPath $configured) }
  $toolRoot = Get-SharedToolRoot
  if ($toolRoot) { return (Join-Path $toolRoot 'BuildCache') }
  return $null
}

function Get-SharedNodeModulesRoot {
  if ($env:DK_NODE_MODULES_ROOT) { return (Resolve-ConfiguredPath $env:DK_NODE_MODULES_ROOT) }
  $configured = Get-DeveloperConfigValue 'nodeModulesRoot'
  if ($configured) { return (Resolve-ConfiguredPath $configured) }
  if ($SharedCacheRoot) { return (Join-Path $SharedCacheRoot 'node_modules') }
  return $null
}

$SharedToolRoot = Get-SharedToolRoot
$SharedCacheRoot = Get-SharedCacheRoot
$SharedNodeModulesRoot = Get-SharedNodeModulesRoot

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
    & $FilePath @Arguments | Out-Host
    $exitCode = $LASTEXITCODE
    if ($null -ne $exitCode -and $exitCode -ne 0) {
      throw "$FilePath exited with code $exitCode"
    }
  } finally {
    Pop-Location
  }
}

function Get-NodeModulesSlot([string]$Dir) {
  if ([IO.Path]::GetFullPath($Dir) -ieq [IO.Path]::GetFullPath($Mobile)) { return 'mobile' }
  return 'desktop'
}

function Ensure-SharedNodeModulesLink([string]$Dir=$Root) {
  if (-not $SharedNodeModulesRoot) { return }
  $slot = Get-NodeModulesSlot $Dir
  $target = Join-Path $SharedNodeModulesRoot $slot
  $link = Join-Path $Dir 'node_modules'
  New-Item -ItemType Directory -Force -Path $SharedNodeModulesRoot | Out-Null

  if (Test-Path -LiteralPath $link) {
    $item = Get-Item -LiteralPath $link -Force
    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
      return
    }
    Write-Host "INFO local node_modules already exists; keeping it instead of replacing it with shared path: $link" -ForegroundColor DarkYellow
    Write-Host "     Remove that directory once if you want this project copy to use: $target" -ForegroundColor DarkGray
    return
  }

  New-Item -ItemType Directory -Force -Path $target | Out-Null
  New-Item -ItemType Junction -Path $link -Target $target | Out-Null
  Write-Host "Shared node_modules: $link -> $target" -ForegroundColor DarkGray
}

function Install-NodeDeps([string]$Dir=$Root) {
  [void](Require-Command 'node' 'Install Node.js first.')
  [void](Require-Command 'npm.cmd' 'Install Node.js first.')
  if (-not (Test-Path (Join-Path $Dir 'package.json'))) {
    throw "package.json not found: $Dir"
  }
  Ensure-SharedNodeModulesLink -Dir $Dir
  Write-SectionTitle "Install dependencies · $Dir"
  Invoke-Step -FilePath 'npm.cmd' -Arguments @('install','--prefer-offline') -WorkingDirectory $Dir
}

function Test-NodeDepsReady([string]$Dir=$Root) {
  $modules = Join-Path $Dir 'node_modules'
  if (-not (Test-Path -LiteralPath $modules -PathType Container)) { return $false }
  if (Test-Path -LiteralPath (Join-Path $modules '.package-lock.json') -PathType Leaf) { return $true }
  if ([IO.Path]::GetFullPath($Dir) -ieq [IO.Path]::GetFullPath($Mobile)) {
    return (Test-Path -LiteralPath (Join-Path $modules 'expo\package.json') -PathType Leaf)
  }
  return (Test-Path -LiteralPath (Join-Path $modules 'electron\package.json') -PathType Leaf)
}

function Ensure-NodeDeps([string]$Dir=$Root) {
  [void](Require-Command 'node' 'Install Node.js first.')
  [void](Require-Command 'npm.cmd' 'Install Node.js first.')
  Ensure-SharedNodeModulesLink -Dir $Dir
  if (-not (Test-NodeDepsReady -Dir $Dir)) {
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
  Write-Host "DK_TOOL_ROOT: $SharedToolRoot" -ForegroundColor DarkGray
  Write-Host "DK_CACHE_ROOT: $SharedCacheRoot" -ForegroundColor DarkGray
  Write-Host "DK_NODE_MODULES_ROOT: $SharedNodeModulesRoot" -ForegroundColor DarkGray
  Write-Host "Toolbox config: $(Get-DeveloperConfigPath)" -ForegroundColor DarkGray
  if ($env:ELECTRON_CACHE) { Write-Host "Electron cache: $env:ELECTRON_CACHE" -ForegroundColor DarkGray }
  if ($env:GRADLE_USER_HOME) { Write-Host "Gradle cache: $env:GRADLE_USER_HOME" -ForegroundColor DarkGray }
  if (-not $ok) { return $false }
  return $true
}

function Add-PathEntry([string]$PathEntry) {
  if (-not $PathEntry -or -not (Test-Path $PathEntry)) { return }
  $parts = @($env:PATH -split ';' | Where-Object { $_ })
  if ($parts -notcontains $PathEntry) { $env:PATH = $PathEntry + ';' + $env:PATH }
}

function Initialize-SharedBuildEnvironment {
  if ($SharedToolRoot) {
    foreach ($nodeDir in @(
      (Join-Path $SharedToolRoot 'NodeJs'),
      (Join-Path $SharedToolRoot 'NodeJS'),
      (Join-Path $SharedToolRoot 'node'),
      (Join-Path $SharedToolRoot 'Language\NodeJS')
    )) {
      if (Test-Path (Join-Path $nodeDir 'node.exe')) { Add-PathEntry $nodeDir; break }
    }
  }

  if ($SharedCacheRoot) {
    $configuredNpm = Get-DeveloperConfigValue 'npmCache'
    $configuredElectron = Get-DeveloperConfigValue 'electronCache'
    $configuredBuilder = Get-DeveloperConfigValue 'electronBuilderCache'
    $cacheMap = @{
      Npm = if ($env:DK_NPM_CACHE) { Resolve-ConfiguredPath $env:DK_NPM_CACHE } elseif ($configuredNpm) { Resolve-ConfiguredPath $configuredNpm } else { Join-Path $SharedCacheRoot 'npm' }
      Pnpm = (Join-Path $SharedCacheRoot 'pnpm-store')
      Electron = if ($env:DK_ELECTRON_CACHE) { Resolve-ConfiguredPath $env:DK_ELECTRON_CACHE } elseif ($configuredElectron) { Resolve-ConfiguredPath $configuredElectron } else { Join-Path $SharedCacheRoot 'electron' }
      ElectronBuilder = if ($env:DK_ELECTRON_BUILDER_CACHE) { Resolve-ConfiguredPath $env:DK_ELECTRON_BUILDER_CACHE } elseif ($configuredBuilder) { Resolve-ConfiguredPath $configuredBuilder } else { Join-Path $SharedCacheRoot 'electron-builder' }
      Gradle = (Join-Path $SharedCacheRoot 'gradle')
    }
    foreach ($cachePath in $cacheMap.Values) { New-Item -ItemType Directory -Force -Path $cachePath | Out-Null }
    $env:npm_config_cache = $cacheMap.Npm
    $env:npm_config_prefer_offline = 'true'
    $env:PNPM_STORE_DIR = $cacheMap.Pnpm
    $env:ELECTRON_CACHE = $cacheMap.Electron
    $env:ELECTRON_BUILDER_CACHE = $cacheMap.ElectronBuilder
    $env:GRADLE_USER_HOME = $cacheMap.Gradle
  }
}

Initialize-SharedBuildEnvironment

function Show-SharedToolchain {
  Write-SectionTitle 'Shared toolchain'
  Write-Host "DK_TOOL_ROOT: $SharedToolRoot" -ForegroundColor Cyan
  Write-Host "DK_CACHE_ROOT: $SharedCacheRoot" -ForegroundColor Cyan
  Write-Host "DK_NODE_MODULES_ROOT: $SharedNodeModulesRoot" -ForegroundColor Cyan
  Write-Host "Toolbox config: $(Get-DeveloperConfigPath)" -ForegroundColor DarkGray
  foreach ($pair in @(
    @('node','node.exe'), @('npm','npm.cmd'), @('pnpm','pnpm.cmd'), @('git','git.exe')
  )) {
    $command = Get-Command $pair[1] -ErrorAction SilentlyContinue
    if ($command) { Write-Host ("OK  {0}: {1}" -f $pair[0],$command.Source) -ForegroundColor Green }
    else { Write-Host ("--  {0}: not found" -f $pair[0]) -ForegroundColor DarkYellow }
  }
  $jdk = Resolve-JavaToolchain
  if ($jdk) { Write-Host ("OK  JDK: {0}" -f $jdk.Home) -ForegroundColor Green }
  else { Write-Host '--  JDK: not found (android-build can provision shared Temurin 21)' -ForegroundColor DarkYellow }
  $sdk = Resolve-AndroidSdk
  if ($sdk) { Write-Host ("OK  Android SDK: {0}" -f $sdk) -ForegroundColor Green }
  else { Write-Host '--  Android SDK: not found' -ForegroundColor DarkYellow }
  Write-Host ("npm cache: {0}" -f $env:npm_config_cache) -ForegroundColor DarkGray
  Write-Host ("pnpm store: {0}" -f $env:PNPM_STORE_DIR) -ForegroundColor DarkGray
  Write-Host ("Electron cache: {0}" -f $env:ELECTRON_CACHE) -ForegroundColor DarkGray
  Write-Host ("electron-builder cache: {0}" -f $env:ELECTRON_BUILDER_CACHE) -ForegroundColor DarkGray
  if ($SharedNodeModulesRoot) { Write-Host ("shared node_modules: {0}" -f $SharedNodeModulesRoot) -ForegroundColor DarkGray }
  Write-Host ("Gradle cache: {0}" -f $env:GRADLE_USER_HOME) -ForegroundColor DarkGray
}

function Resolve-AndroidSdk {
  $candidates = @()
  if ($env:ANDROID_HOME) { $candidates += $env:ANDROID_HOME }
  if ($env:ANDROID_SDK_ROOT) { $candidates += $env:ANDROID_SDK_ROOT }
  if ($SharedToolRoot) {
    $candidates += (Join-Path $SharedToolRoot 'Android\Sdk')
    $candidates += (Join-Path $SharedToolRoot 'Android')
    $candidates += (Join-Path $SharedToolRoot 'android-sdk')
  }
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

function Get-DkdsToolchainRoot {
  return $SharedToolRoot
}

function Get-DkdsManagedJdkHome {
  $toolchainRoot = Get-DkdsToolchainRoot
  if (-not $toolchainRoot) { return $null }
  $managedHome = Join-Path $toolchainRoot 'Java\temurin-21\current'
  if ((Test-Path (Join-Path $managedHome 'bin\java.exe')) -and (Test-Path (Join-Path $managedHome 'bin\keytool.exe'))) {
    return $managedHome
  }
  return $null
}

function Resolve-JavaToolchain {
  # Do not use $home here: PowerShell variable names are case-insensitive and
  # $HOME is a read-only automatic variable under Windows PowerShell 5.1.
  # Keep this function pipeline-clean as well: it must return either one
  # toolchain hashtable or $null, never List.Add() indices or discovery noise.
  $javaHomes = @()

  foreach ($configuredJavaHome in @($env:JAVA_HOME,$env:JDK_HOME,$env:STUDIO_JDK)) {
    if ($configuredJavaHome) { $javaHomes += [string]$configuredJavaHome }
  }

  $javaOnPath = Get-Command 'java.exe' -ErrorAction SilentlyContinue
  if ($javaOnPath -and $javaOnPath.Source) {
    try { $javaHomes += (Split-Path (Split-Path $javaOnPath.Source -Parent) -Parent) } catch {}
  }

  $managedJdkHome = Get-DkdsManagedJdkHome
  if ($managedJdkHome) { $javaHomes += $managedJdkHome }

  if ($SharedToolRoot) {
    foreach ($sharedJdk in @(
      'Java\temurin-21\current','Java\jdk-21','JDK\21','jdk-21',
      'Java\temurin-17\current','Java\jdk-17','JDK\17','jdk-17',
      'Language\Java'
    )) { $javaHomes += (Join-Path $SharedToolRoot $sharedJdk) }
  }

  foreach ($programRoot in @($env:ProgramFiles,${env:ProgramFiles(x86)},$env:LOCALAPPDATA)) {
    if (-not $programRoot) { continue }
    $javaHomes += (Join-Path $programRoot 'Android\Android Studio\jbr')
    $javaHomes += (Join-Path $programRoot 'Android\Android Studio\jre')
    $javaHomes += (Join-Path $programRoot 'Programs\Android Studio\jbr')
  }

  $studio = Get-Command 'studio64.exe' -ErrorAction SilentlyContinue
  if ($studio -and $studio.Source) {
    try { $javaHomes += (Join-Path (Split-Path (Split-Path $studio.Source -Parent) -Parent) 'jbr') } catch {}
  }

  foreach ($uninstallRoot in @(
    'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall',
    'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall',
    'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall'
  )) {
    if (-not (Test-Path $uninstallRoot)) { continue }
    foreach ($uninstallEntry in @(Get-ChildItem $uninstallRoot -ErrorAction SilentlyContinue)) {
      try {
        $item = Get-ItemProperty $uninstallEntry.PSPath -ErrorAction Stop
        if ([string]$item.DisplayName -match 'Android Studio') {
          $installLocation = [string]$item.InstallLocation
          if ($installLocation) { $javaHomes += (Join-Path $installLocation 'jbr') }
          $displayIcon = [string]$item.DisplayIcon
          if ($displayIcon) {
            $studioExe = $displayIcon.Trim('"').Split(',')[0]
            $studioRoot = Split-Path (Split-Path $studioExe -Parent) -Parent
            if ($studioRoot) { $javaHomes += (Join-Path $studioRoot 'jbr') }
          }
        }
      } catch {}
    }
  }

  if ($env:ProgramFiles) {
    foreach ($vendorFolder in @('Java','Eclipse Adoptium','Microsoft')) {
      $vendorBase = Join-Path $env:ProgramFiles $vendorFolder
      if (Test-Path $vendorBase) {
        $vendorJdks = @(Get-ChildItem $vendorBase -Directory -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending)
        foreach ($vendorJdk in $vendorJdks) { $javaHomes += $vendorJdk.FullName }
      }
    }
  }

  foreach ($jdkRegistryRoot in @(
    'HKLM:\SOFTWARE\JavaSoft\JDK',
    'HKLM:\SOFTWARE\WOW6432Node\JavaSoft\JDK'
  )) {
    if (-not (Test-Path $jdkRegistryRoot)) { continue }
    foreach ($jdkRegistryEntry in @(Get-ChildItem $jdkRegistryRoot -ErrorAction SilentlyContinue)) {
      try {
        $registryJavaHome = (Get-ItemProperty $jdkRegistryEntry.PSPath -ErrorAction Stop).JavaHome
        if ($registryJavaHome) { $javaHomes += [string]$registryJavaHome }
      } catch {}
    }
  }

  foreach ($javaHomeCandidate in ($javaHomes | Where-Object { $_ } | Select-Object -Unique)) {
    $javaPath = Join-Path $javaHomeCandidate 'bin\java.exe'
    $keytoolPath = Join-Path $javaHomeCandidate 'bin\keytool.exe'
    if ((Test-Path $javaPath) -and (Test-Path $keytoolPath)) {
      $env:JAVA_HOME = $javaHomeCandidate
      Add-PathEntry (Join-Path $javaHomeCandidate 'bin')
      return @{ Home=$javaHomeCandidate; Java=$javaPath; Keytool=$keytoolPath; Managed=$false }
    }
  }
  return $null
}

function Install-DkdsManagedJdk {
  $existingManagedHome = Get-DkdsManagedJdkHome
  if ($existingManagedHome) {
    $env:JAVA_HOME = $existingManagedHome
    Add-PathEntry (Join-Path $existingManagedHome 'bin')
    return @{
      Home = $existingManagedHome
      Java = (Join-Path $existingManagedHome 'bin\java.exe')
      Keytool = (Join-Path $existingManagedHome 'bin\keytool.exe')
      Managed = $true
    }
  }

  $toolchainRoot = Get-DkdsToolchainRoot
  if (-not $toolchainRoot) {
    throw 'Cannot resolve a persistent shared tool directory for JDK provisioning.'
  }

  $architectureName = [string]$env:PROCESSOR_ARCHITECTURE
  if ($env:PROCESSOR_ARCHITEW6432) { $architectureName = [string]$env:PROCESSOR_ARCHITEW6432 }
  switch -Regex ($architectureName.ToUpperInvariant()) {
    'ARM64' { $adoptiumArch = 'aarch64'; break }
    'AMD64|X64' { $adoptiumArch = 'x64'; break }
    default { throw "Unsupported Windows architecture for automatic JDK provisioning: $architectureName" }
  }

  $jdkRoot = Join-Path $toolchainRoot 'Java\temurin-21'
  $currentHome = Join-Path $jdkRoot 'current'
  $downloadPath = Join-Path $jdkRoot 'temurin-21.zip'
  $extractRoot = Join-Path $jdkRoot ('extract-' + [Guid]::NewGuid().ToString('N'))
  $apiUrl = "https://api.adoptium.net/v3/binary/latest/21/ga/windows/$adoptiumArch/jdk/hotspot/normal/eclipse"

  New-Item -ItemType Directory -Force -Path $jdkRoot | Out-Null
  Write-SectionTitle 'Prepare shared JDK 21'
  Write-Host 'No complete JDK was found. DKDS will download Eclipse Temurin JDK 21 once in the shared tool root and reuse it across projects.' -ForegroundColor Yellow
  Write-Host "Managed JDK directory: $currentHome" -ForegroundColor DarkGray

  try {
    try {
      $previousSecurityProtocol = [Net.ServicePointManager]::SecurityProtocol
      [Net.ServicePointManager]::SecurityProtocol = $previousSecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
    } catch {}

    $redirectResponse = $null
    try {
      $redirectResponse = Invoke-WebRequest -Uri $apiUrl -MaximumRedirection 0 -UseBasicParsing -ErrorAction Stop
    } catch {
      if ($_.Exception.Response) { $redirectResponse = $_.Exception.Response }
      else { throw }
    }

    $downloadUrl = $null
    if ($redirectResponse -and $redirectResponse.Headers) {
      try { $downloadUrl = [string]$redirectResponse.Headers['Location'] } catch {}
    }
    if (-not $downloadUrl) {
      throw 'Adoptium API did not return a JDK download redirect.'
    }

    Write-Host 'Downloading Eclipse Temurin JDK 21...' -ForegroundColor Cyan
    Invoke-WebRequest -Uri $downloadUrl -OutFile $downloadPath -UseBasicParsing

    Write-Host 'Verifying JDK SHA-256...' -ForegroundColor Cyan
    $checksumResponse = Invoke-WebRequest -Uri ($downloadUrl + '.sha256.txt') -UseBasicParsing
    $checksumText = [string]$checksumResponse.Content
    $expectedHash = (($checksumText -split '\s+')[0]).Trim().ToUpperInvariant()
    if ($expectedHash -notmatch '^[0-9A-F]{64}$') {
      throw 'Adoptium checksum response was invalid.'
    }
    $actualHash = (Get-FileHash -Path $downloadPath -Algorithm SHA256).Hash.ToUpperInvariant()
    if ($actualHash -ne $expectedHash) {
      throw "Managed JDK checksum verification failed. Expected $expectedHash but got $actualHash."
    }

    New-Item -ItemType Directory -Force -Path $extractRoot | Out-Null
    Expand-Archive -Path $downloadPath -DestinationPath $extractRoot -Force
    $javaExecutable = Get-ChildItem -Path $extractRoot -Filter 'java.exe' -File -Recurse -ErrorAction SilentlyContinue |
      Where-Object { $_.FullName -match '[\\/]bin[\\/]java\.exe$' } |
      Select-Object -First 1
    if (-not $javaExecutable) { throw 'Downloaded JDK archive does not contain bin\java.exe.' }

    $discoveredHome = Split-Path (Split-Path $javaExecutable.FullName -Parent) -Parent
    $discoveredKeytool = Join-Path $discoveredHome 'bin\keytool.exe'
    if (-not (Test-Path $discoveredKeytool)) { throw 'Downloaded JDK archive does not contain bin\keytool.exe.' }

    if (Test-Path $currentHome) { Remove-Item -Recurse -Force $currentHome }
    Move-Item -Path $discoveredHome -Destination $currentHome

    @{
      javaMajor = 21
      distribution = 'Eclipse Temurin'
      source = 'Adoptium API'
      apiUrl = $apiUrl
      sha256 = $actualHash
      installedAt = (Get-Date).ToString('o')
    } | ConvertTo-Json | Set-Content -Path (Join-Path $jdkRoot 'managed-jdk.json') -Encoding UTF8
  } finally {
    if (Test-Path $downloadPath) { Remove-Item -Force $downloadPath -ErrorAction SilentlyContinue }
    if (Test-Path $extractRoot) { Remove-Item -Recurse -Force $extractRoot -ErrorAction SilentlyContinue }
  }

  if (-not ((Test-Path (Join-Path $currentHome 'bin\java.exe')) -and (Test-Path (Join-Path $currentHome 'bin\keytool.exe')))) {
    throw "Managed JDK installation is incomplete: $currentHome"
  }

  $env:JAVA_HOME = $currentHome
  Add-PathEntry (Join-Path $currentHome 'bin')
  Write-Host 'Shared Eclipse Temurin JDK 21 is ready.' -ForegroundColor Green
  return @{
    Home = $currentHome
    Java = (Join-Path $currentHome 'bin\java.exe')
    Keytool = (Join-Path $currentHome 'bin\keytool.exe')
    Managed = $true
  }
}

function Ensure-JavaToolchain([bool]$AutoProvision=$true) {
  $jdk = Resolve-JavaToolchain
  if ($jdk) { return $jdk }
  if (-not $AutoProvision -or $env:DKDS_DISABLE_MANAGED_JDK -eq '1') { return $null }
  return Install-DkdsManagedJdk
}

function Check-AndroidEnvironment {
  param(
    [bool]$RequireJdk = $true,
    [bool]$AutoProvisionJdk = $true
  )

  Write-SectionTitle 'Android environment check'
  $ok = $true
  $sdk = Resolve-AndroidSdk
  $jdk = $null
  $jdkProvisionError = $null
  if ($RequireJdk) {
    try { $jdk = Ensure-JavaToolchain -AutoProvision $AutoProvisionJdk }
    catch { $jdkProvisionError = $_.Exception.Message }
  }

  $node = Get-Command 'node' -ErrorAction SilentlyContinue
  if ($node) { Write-Host ("OK  node: {0}" -f $node.Source) -ForegroundColor Green }
  else { Write-Host 'ERR node: not found' -ForegroundColor Red; $ok=$false }

  if (-not $RequireJdk) {
    Write-Host 'INFO java/keytool: not required for this action.' -ForegroundColor DarkGray
  } elseif ($jdk) {
    Write-Host ("OK  java: {0}" -f $jdk.Java) -ForegroundColor Green
    Write-Host ("OK  keytool: {0}" -f $jdk.Keytool) -ForegroundColor Green
    Write-Host ("JAVA_HOME: {0}" -f $jdk.Home) -ForegroundColor Green
    if ($jdk.Managed) { Write-Host 'OK  JDK source: shared Eclipse Temurin 21' -ForegroundColor Green }
  } else {
    Write-Host 'ERR java/keytool: no complete JDK was found.' -ForegroundColor Red
    if ($jdkProvisionError) { Write-Host ("    Automatic JDK preparation failed: {0}" -f $jdkProvisionError) -ForegroundColor Yellow }
    elseif (-not $AutoProvisionJdk -or $env:DKDS_DISABLE_MANAGED_JDK -eq '1') { Write-Host '    Automatic managed-JDK preparation is disabled for this action.' -ForegroundColor Yellow }
    else { Write-Host '    DKDS could not prepare the shared Eclipse Temurin JDK 21.' -ForegroundColor Yellow }
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
  $jdk = Ensure-JavaToolchain -AutoProvision $true
  if (-not $jdk) { throw 'A complete JDK is required for Android release signing.' }

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
    & $jdk.Keytool @keytoolArgs | Out-Host
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
  $v = Read-Host 'Release version, e.g. 3.22.0'
  if (-not $v) { throw 'A release version is required.' }
  return $v
}

function Show-Menu {
  Write-SectionTitle 'Developer toolbox'
  Write-Host '  1  Start desktop development'
  Write-Host '  2  Install/repair desktop dependencies'
  Write-Host '  3  Run desktop tooling diagnostics'
  Write-Host '  4  Show shared toolchain/cache locations'
  Write-Host '  5  Run complete project check'
  Write-Host '  6  Run regression tests'
  Write-Host '  7  Build Windows Setup + Portable'
  Write-Host '  8  Check Android environment'
  Write-Host '  9  Build Android release APK'
  Write-Host ' 10  Run/install Android on connected device'
  Write-Host ' 11  Install existing Android APK'
  Write-Host ' 12  Start LAN update server'
  Write-Host ' 13  Build + publish LAN update'
  Write-Host ' 14  Publish existing Windows build'
  Write-Host ' 15  Validate plugins'
  Write-Host ' 16  Open project folder'
  Write-Host ' 17  Open documentation'
  Write-Host '  0  Exit'
  $choice = Read-Host 'Select'
  $map = @{
    '1'='dev';'2'='install-deps';'3'='doctor';'4'='toolchain';'5'='check';'6'='test';'7'='build-windows';
    '8'='android-check';'9'='android-build';'10'='android-run';'11'='android-install';'12'='update-server';
    '13'='build-publish-update';'14'='publish-update';'15'='plugin-validate';'16'='open-root';'17'='open-docs';'0'='exit'
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
    'toolchain' { Show-SharedToolchain }
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
      if (-not (Check-AndroidEnvironment -RequireJdk $false -AutoProvisionJdk $false)) { throw 'Android environment is incomplete.' }
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
