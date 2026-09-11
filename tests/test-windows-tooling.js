const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const backendPath = path.join(root, 'tools', 'windows', 'dkds-tools.ps1');
const guiPath = path.join(root, 'tools', 'windows', 'dkds-gui.ps1');
const cmdPath = path.join(root, 'DKDS.cmd');
const guiCmdPath = path.join(root, 'DKDS_GUI.cmd');
const pluginPublisherPath = path.join(root,'tools','windows','publish-plugin-to-lan.ps1');
const updateServerPath = path.join(root,'services','update-server','server.js');
const windowsWorkflowPath = path.join(root,'.github','workflows','build-windows.yml');
const mobilePackagePath = path.join(root, 'mobile', 'package.json');
const easPath = path.join(root, 'mobile', 'eas.json');
const mobileAppPath = path.join(root, 'mobile', 'app.json');
const releaseSigningPluginPath = path.join(root, 'mobile', 'plugins', 'withDkdsReleaseSigning.js');

function read(file) {
  return fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const backend = read(backendPath);
const gui = read(guiPath);
const cmd = read(cmdPath);
const guiCmd = read(guiCmdPath);
const pluginPublisher = read(pluginPublisherPath);
const updateServer = read(updateServerPath);
const windowsWorkflow = read(windowsWorkflowPath);
const mobilePackage = JSON.parse(read(mobilePackagePath));
const eas = JSON.parse(read(easPath));
const mobileApp = JSON.parse(read(mobileAppPath));
const releaseSigningPluginSource = read(releaseSigningPluginPath);

// PowerShell reserves $args as an automatic variable. Using it as a formal
// parameter caused npm arguments to disappear under Windows PowerShell 5.1.
assert(!/\[string\[\]\]\s*\$Args\b/i.test(backend), 'Backend must not declare $Args as a parameter.');
assert(!/@Args\b/i.test(backend), 'Backend must not splat the automatic $Args variable.');
assert(/\[string\[\]\]\s*\$Arguments\s*=\s*@\(\)/.test(backend), 'Invoke-Step must use an explicit $Arguments parameter.');
assert(/\$installArguments\s*=\s*@\('install','--ignore-scripts','--prefer-offline','--no-audit','--no-fund'\)/.test(backend) && /--cache/.test(backend), 'npm install must prefer offline data, suppress binary postinstall/audit side effects, and pass the selected cache explicitly.');
assert(/&\s+\$FilePath\s+@Arguments\s+\|\s+Out-Host/.test(backend), 'Invoke-Step must keep native stdout visible without leaking it into function return values.');

// PowerShell variable names are case-insensitive. Names such as $HOME are
// automatic/read-only in Windows PowerShell 5.1, so even a local `$home =`
// assignment crashes before Android discovery can run. Guard writable forms
// of the automatic variables that have caused or could cause toolbox failures.
const protectedPsVars = [
  'HOME','Host','PID','PSHOME','PWD','ShellId','Args','Input','Matches',
  'MyInvocation','ExecutionContext','PSVersionTable','NestedPromptLevel','StackTrace',
];
const protectedAlternation = protectedPsVars.join('|');
const protectedAssignment = new RegExp(`\\$(?:${protectedAlternation})\\b\\s*(?:=|\\+=|-=|\\*=|/=)`, 'i');
const protectedForeach = new RegExp(`foreach\\s*\\(\\s*\\$(?:${protectedAlternation})\\b`, 'i');
const protectedParameter = new RegExp(`\\[[^\\]]+\\]\\s*\\$(?:${protectedAlternation})\\b`, 'i');
for (const [name, source] of [['dkds-tools.ps1', backend], ['dkds-gui.ps1', gui]]) {
  assert(!protectedAssignment.test(source), `${name} must not assign to a PowerShell automatic/read-only variable.`);
  assert(!protectedForeach.test(source), `${name} must not use a PowerShell automatic/read-only variable as a foreach iterator.`);
  assert(!protectedParameter.test(source), `${name} must not declare a PowerShell automatic/read-only variable as a typed parameter.`);
}
assert(!/\$homes\.Add\(/i.test(backend), 'Java discovery must not leak List.Add() return values into the PowerShell pipeline.');
assert(/\$javaHomeCandidate\b/.test(backend), 'Java discovery should use an explicit non-reserved candidate variable.');

// Geometry must use typed constructors instead of New-Object overload syntax;
// expressions such as ($Y + 42) were parsed as extra constructor arguments.
assert(!/New-Object\s+System\.Drawing\./i.test(gui), 'GUI contains fragile System.Drawing New-Object constructor syntax.');
assert(/\[System\.Drawing\.Point\]::new\(/.test(gui), 'GUI should use typed Point constructors.');
assert(/FlowLayoutPanel/.test(gui) && /Resize-ActionCards/.test(gui), 'GUI should retain responsive card layout.');
assert(/install-deps/.test(gui) && /doctor/.test(gui) && /toolchain/.test(gui), 'GUI should expose dependency repair, diagnostics and shared-toolchain inspection.');
assert(/\[switch\]\$KeepConsoleOpen/.test(backend), 'Toolbox backend must expose a GUI-only keep-console-open switch so startup failures remain readable.');
assert(/-NoExit[\s\S]*-KeepConsoleOpen/.test(gui), 'Developer GUI actions must preserve their diagnostics console even when the backend action fails.');
assert(/if \(\$KeepConsoleOpen\)[\s\S]*?return[\s\S]*?exit 1/.test(backend), 'GUI failure handling must return without terminating the PowerShell host while CLI/CI failures retain a non-zero exit.');

// Android packaging exposed by the toolbox must produce the final release APK,
// not a debug build or a debug-suffixed artifact.
assert(/assembleRelease/.test(backend), 'Android build must use Gradle assembleRelease.');
assert(/'assembleRelease'[\s\S]*?'--no-daemon'[\s\S]*?'--max-workers=4'[\s\S]*?'-PreactNativeArchitectures=arm64-v8a'[\s\S]*?'--stacktrace'/.test(backend), 'Android release build must be non-persistent, bounded, arm64-targeted and retain stack traces.');
assert(/Enable-AndroidGradleDirectNoDaemon[\s\S]*?\$env:JAVA_OPTS=\$jvmArgs[\s\S]*?'org\.gradle\.jvmargs'\s+\$jvmArgs[\s\S]*?'org\.gradle\.internal\.instrumentation\.agent'\s+'false'[\s\S]*?'org\.gradle\.daemon'\s+'false'/.test(backend), 'Android release builds must align both immutable JVM options and Gradle instrumentation-agent status before requesting an in-process --no-daemon build.');
assert(/Test-AndroidGradleInProcess[\s\S]*?'help'[\s\S]*?'--no-daemon'[\s\S]*?'--info'/.test(backend), 'Android release builds must runtime-probe the no-fork contract before expensive APK compilation.');
assert(!/'-Dorg\.gradle\.jvmargs='/.test(backend), 'Android release tooling must not revive the ineffective empty-jvmargs retry that still spawned a single-use daemon.');
assert(!/assembleDebug/.test(backend), 'Android toolbox must not build the debug variant.');
assert(/DK-Data-Studio\.apk/.test(backend), 'Android output must use the final DK Data Studio APK name.');
assert(!/-debug\.apk/i.test(backend + gui), 'Android tooling must not expose a debug APK artifact.');
assert(/'android-run'[\s\S]*?Invoke-AndroidReleaseGradleBuild[\s\S]*?'adb'[\s\S]*?'install','-r'/.test(backend), 'Connected-device Android run must consume the same signed release Gradle process owner and install it with adb.');
assert(/Initialize-AndroidReleaseSigning/.test(backend), 'Android build must initialize persistent local release signing.');
assert(/Resolve-AndroidSdk/.test(backend) && /platform-tools/.test(backend), 'Android toolbox must auto-discover the SDK and adb from standard Windows locations.');
assert(/Ensure-AndroidSdkComponents/.test(backend) && /sdkmanager\.bat/.test(backend), 'Android builds must provision pinned SDK components through the official SDK manager.');
assert(/'platforms;android-36'[\s\S]*?'build-tools;36\.0\.0'[\s\S]*?'ndk;27\.1\.12297006'[\s\S]*?'cmake;3\.22\.1'/.test(backend), 'Android SDK provisioning must pin the platform, build-tools, NDK and CMake required by the project.');
assert(/Resolve-JavaToolchain/.test(backend) && /Android Studio\\jbr/.test(backend), 'Android toolbox must auto-discover Android Studio bundled JDK/JBR.');
assert(/DisplayName.*Android Studio/.test(backend), 'Android JDK discovery should also consult Windows install metadata for custom Android Studio paths.');
assert(/Install-DkdsManagedJdk/.test(backend) && /Ensure-JavaToolchain/.test(backend), 'Android tooling must be able to provision a managed JDK when the machine has none.');
assert(/api\.adoptium\.net\/v3\/binary\/latest\/21\/ga\/windows/.test(backend), 'Shared JDK provisioning must use the official Adoptium stable JDK 21 binary API.');
assert(/(?:Get-FileHash|Get-FileSha256)[\s\S]*SHA256/.test(backend) && /sha256\.txt/.test(backend), 'Managed JDK download must verify the published SHA-256 checksum.');
assert(/New-AndroidBuildWorkspace/.test(backend) && /DKDS_ANDROID_WORK_ROOT/.test(backend), 'Android builds must stage generated native work outside the repository.');
assert(/D:\\PyDroidTemp\\builds\\dk-data-studio/.test(backend), 'Android staging and APK output should prefer the shared D:\\PyDroidTemp build area.');
assert(/DKDS_ANDROID_CLEAN/.test(backend) && /Invoke-AndroidPrebuild/.test(backend), 'Android tooling must default to an incremental external prebuild and expose an explicit clean-build switch.');
assert(/Invoke-AndroidSourceChecks[\s\S]*?mobile:test[\s\S]*?typecheck/.test(backend), 'Android packaging must run mobile architecture and TypeScript checks before compilation.');
const mobileRuntimeAssets=JSON.parse(read('mobile/runtime-assets.json'));
assert(/Test-AndroidApkArtifact/.test(backend) && /runtime-assets\.json/.test(backend) && /SHA-256/.test(backend) && mobileRuntimeAssets.apkAssets.includes('assets/dkds/core/host/mobile-plugin-package.js'), 'Android packaging must verify the shared modular offline runtime asset manifest and report the APK checksum.');
assert(/DK_TOOL_ROOT/.test(backend) && /SharedToolRoot/.test(backend), 'Tooling must support a cross-project DK_TOOL_ROOT.');
assert(/BuildCache/.test(backend) && /ELECTRON_CACHE/.test(backend) && /ELECTRON_BUILDER_CACHE/.test(backend) && /GRADLE_USER_HOME/.test(backend), 'npm/Electron/electron-builder/Gradle caches must be shared outside projects.');
assert(/developer-toolbox\.json/.test(backend) && /developer-toolbox\.json/.test(gui),
  'toolbox backend and GUI must share a persistent per-user path configuration file.');
assert(/\[string\]\$ProxyMode/.test(backend) && /\[string\]\$Proxy\b/.test(backend) && /\[string\]\$NoProxy/.test(backend),
  'toolbox CLI must expose explicit proxy mode, proxy URL and NO_PROXY overrides.');
for(const token of ['proxyMode','proxyUrl','noProxy']){
  assert(backend.includes(token),`toolbox backend must read configurable ${token}.`);
  assert(gui.includes(token),`toolbox GUI must expose configurable ${token}.`);
}
assert(/HTTP_PROXY/.test(backend) && /HTTPS_PROXY/.test(backend) && /ALL_PROXY/.test(backend) && /NO_PROXY/.test(backend),
  'build tooling must support standard process proxy variables.');
assert(/npm_config_proxy/.test(backend) && /npm_config_https_proxy/.test(backend) && /npm_config_noproxy/.test(backend),
  'npm and npx child processes must receive explicit proxy aliases.');
assert(/ELECTRON_GET_USE_PROXY/.test(backend) && /GLOBAL_AGENT_HTTP_PROXY/.test(backend) && /GLOBAL_AGENT_HTTPS_PROXY/.test(backend),
  'Electron binary downloads must explicitly opt into the effective proxy environment.');
assert(/Apply-GradleProxy/.test(backend) && /proxyHost/.test(backend) && /proxyPort/.test(backend),
  'Android/Gradle builds must receive JVM proxy properties from the effective build proxy.');
assert(/Invoke-DkdsWebRequest/.test(backend) && /Get-PowerShellProxyForUri/.test(backend) && /Test-NoProxyForUri/.test(backend),
  'PowerShell-managed downloads must use the same proxy and NO_PROXY contract.');
assert(/Protect-ProxyForDisplay/.test(backend) && /UserName = '\*\*\*'/.test(backend) && /Password = '\*\*\*'/.test(backend),
  'proxy diagnostics must redact credentials.');
assert(/网络与代理/.test(gui) && /保存代理设置/.test(gui) && /Save-ToolboxConfigPatch/.test(gui),
  'developer GUI must expose persistent proxy settings without overwriting unrelated toolbox configuration.');
assert(/'network'\s*\{\s*Show-EffectiveNetwork/.test(backend),
  'toolbox must provide a network diagnostics action.');
for(const token of ['npmCache','pnpmStore','electronCache','electronBuilderCache','gradleCache','nodeModulesRoot']){
  assert(backend.includes(token),`toolbox backend must read configurable ${token}.`);
  assert(gui.includes(token),`toolbox GUI must expose configurable ${token}.`);
}
assert(backend.includes('cachePathMode') && gui.includes('cachePathMode') && gui.includes('子缓存自动跟随'),
  'cache settings must distinguish root-derived child caches from explicit custom overrides.');
assert(/electron_config_cache/.test(backend) && /ELECTRON_CACHE/.test(backend),
  'Electron downloads must bind both the current documented cache variable and the compatibility alias.');
assert(/pnpm_config_store_dir/.test(backend) && /PNPM_CONFIG_STORE_DIR/.test(backend),
  'pnpm must receive a native store-dir configuration binding.');
assert(backend.includes('currentTarget') && /ReparsePoint/.test(backend) && /Remove-NodeModulesPath\s+\$link/.test(backend) && /New-Item\s+-ItemType\s+Junction/.test(backend),
  'shared node_modules Junctions must be inspected and rebound safely when the selected cache root changes.');
assert(/\[IO\.Directory\]::Delete\(\$PathToRemove, \$false\)/.test(backend),
  'replacing a shared node_modules Junction must remove only the link without an interactive child-deletion prompt.');
assert(/Show-EffectiveBuildCaches\s+-VerifyNpm/.test(backend) && /npm\.cmd config get cache/.test(backend),
  'build actions must display effective caches and verify npm resolved the requested path.');
assert(/New-Item\s+-ItemType\s+Junction/.test(backend) && /SharedNodeModulesRoot/.test(backend),
  'toolbox must support cross-project node_modules reuse through a shared Junction target.');
assert(/npm_config_prefer_offline/.test(backend),
  'toolbox must tell npm to prefer previously downloaded packages.');

assert(/Get-DependencySignature/.test(backend) && /\.staging-/.test(backend) && /\.dkds-ready\.json/.test(backend),
  'shared node_modules must use immutable package-signature entries built through staging rather than npm reifying a project Junction.');
assert(/Clear-StaleDependencyStaging/.test(backend) && /Get-Process -Id \$ownerPid/.test(backend),
  'shared dependency installs must reclaim staging directories left by dead installer processes without touching active installs.');
assert(/Test-NpmLogNoSpace/.test(backend) && /ENOSPC\|no space left on device/.test(backend) && /New-DependencyNoSpaceMessage/.test(backend),
  'toolbox must translate npm ENOSPC extraction failures into an actionable cache-space diagnostic.');
assert(/--ignore-scripts/.test(backend) && /Ensure-ElectronBinary/.test(backend) && /electron\\install\.js/.test(backend),
  'shared dependency installation must separate npm package extraction from Electron binary installation.');
assert(/Test-ElectronBinaryReady/.test(backend) && /dist\\electron\.exe/.test(backend),
  'dependency readiness must require the actual Electron executable, not only electron/package.json.');
assert(/DK_BINARY_MIRROR_MODE/.test(backend) && backend.includes('https://cdn.npmmirror.com/binaries/electron/'),
  'Electron binary download must support automatic mirror fallback after official-source network failures.');
assert(/ELECTRON_BUILDER_BINARIES_MIRROR/.test(backend) && /Invoke-WindowsDist/.test(backend),
  'Windows packaging must preserve shared caches and retry binary downloads through the configured fallback mirror.');
assert(/路径与缓存/.test(gui) && /保存路径设置/.test(gui),
  'developer GUI must include a dedicated path/cache settings page.');
assert(/Check-AndroidEnvironment\s+-RequireJdk\s+\$false\s+-AutoProvisionJdk\s+\$false/.test(backend), 'Installing an already-built APK must not require or download a JDK.');
assert(/DKDS_ANDROID_RELEASE_STORE_FILE/.test(backend), 'Android release signing environment must be configured.');
assert(/DKDataStudio\\android-signing/.test(backend), 'Android release signing must live outside the repository in the user profile.');
assert(/dkds-tools\.ps1 android-run/.test(mobilePackage.scripts.android || ''), 'Direct mobile Android run must route through the signed toolbox workflow.');
assert(/dkds-tools\.ps1 android-build/.test(mobilePackage.scripts['apk:release'] || ''), 'Mobile APK script must route through the signed toolbox workflow.');
assert(!mobilePackage.scripts['apk:debug'], 'Debug APK npm script must not be exposed.');
assert(eas.build?.production?.android?.buildType === 'apk', 'EAS production Android build must output APK.');
assert((mobileApp.expo?.plugins || []).includes('./plugins/withDkdsReleaseSigning.js'), 'Expo config must include the local release signing plugin.');
assert(/DKDS_LOCAL_RELEASE_SIGNING/.test(releaseSigningPluginSource), 'Release signing plugin must be opt-in for local builds.');

// Exercise the Gradle patcher against the shape used by the current Expo template.
const vm = require('vm');
const signingModule = { exports: {} };
vm.runInNewContext(releaseSigningPluginSource, {
  module: signingModule,
  exports: signingModule.exports,
  require(name) {
    if (name === 'expo/config-plugins') return { withAppBuildGradle: (config) => config };
    throw new Error(`Unexpected require in signing plugin test: ${name}`);
  },
}, { filename: releaseSigningPluginPath });
const patchReleaseSigning = signingModule.exports.patchReleaseSigning;
assert(typeof patchReleaseSigning === 'function', 'Release signing plugin must expose its Gradle patcher for regression tests.');
const gradleSample = `android {
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            signingConfig signingConfigs.debug
            minifyEnabled false
        }
    }
}`;
const patchedGradle = patchReleaseSigning(gradleSample);
assert(/DKDS_ANDROID_RELEASE_STORE_FILE/.test(patchedGradle), 'Gradle patch must inject DKDS release signing environment variables.');
assert(/signingConfig signingConfigs\.release/.test(patchedGradle), 'Gradle release build type must use the dedicated release signing config.');
assert(patchedGradle === patchReleaseSigning(patchedGradle), 'Gradle release signing patch must be idempotent.');

assert(/tools\\windows\\dkds-tools\.ps1/i.test(cmd), 'DKDS.cmd must route to dkds-tools.ps1.');
assert(/tools\\windows\\dkds-gui\.ps1/i.test(guiCmd), 'DKDS_GUI.cmd must route to dkds-gui.ps1.');

// Windows PowerShell 5.1 needs a BOM to reliably read Chinese source text.
for (const file of [backendPath, guiPath, pluginPublisherPath]) {
  const data = fs.readFileSync(file);
  assert(data.length >= 3 && data[0] === 0xEF && data[1] === 0xBB && data[2] === 0xBF,
    `${path.basename(file)} must be UTF-8 with BOM for Windows PowerShell 5.1.`);
}

console.log('Windows tooling regression checks passed.');
