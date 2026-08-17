const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const backendPath = path.join(root, 'tools', 'windows', 'dkds-tools.ps1');
const guiPath = path.join(root, 'tools', 'windows', 'dkds-gui.ps1');
const cmdPath = path.join(root, 'DKDS.cmd');
const guiCmdPath = path.join(root, 'DKDS_GUI.cmd');
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
const mobilePackage = JSON.parse(read(mobilePackagePath));
const eas = JSON.parse(read(easPath));
const mobileApp = JSON.parse(read(mobileAppPath));
const releaseSigningPluginSource = read(releaseSigningPluginPath);

// PowerShell reserves $args as an automatic variable. Using it as a formal
// parameter caused npm arguments to disappear under Windows PowerShell 5.1.
assert(!/\[string\[\]\]\s*\$Args\b/i.test(backend), 'Backend must not declare $Args as a parameter.');
assert(!/@Args\b/i.test(backend), 'Backend must not splat the automatic $Args variable.');
assert(/\[string\[\]\]\s*\$Arguments\s*=\s*@\(\)/.test(backend), 'Invoke-Step must use an explicit $Arguments parameter.');
assert(/Invoke-Step\s+-FilePath\s+'npm\.cmd'\s+-Arguments\s+@\('install'\)/.test(backend), 'npm install arguments must be explicit.');
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

// Android packaging exposed by the toolbox must produce the final release APK,
// not a debug build or a debug-suffixed artifact.
assert(/assembleRelease/.test(backend), 'Android build must use Gradle assembleRelease.');
assert(!/assembleDebug/.test(backend), 'Android toolbox must not build the debug variant.');
assert(/DK-Data-Studio\.apk/.test(backend), 'Android output must use the final DK Data Studio APK name.');
assert(!/-debug\.apk/i.test(backend + gui), 'Android tooling must not expose a debug APK artifact.');
assert(/expo','run:android','--variant','release'/.test(backend), 'Connected-device Android run must use the release variant.');
assert(/Initialize-AndroidReleaseSigning/.test(backend), 'Android build must initialize persistent local release signing.');
assert(/Resolve-AndroidSdk/.test(backend) && /platform-tools/.test(backend), 'Android toolbox must auto-discover the SDK and adb from standard Windows locations.');
assert(/Resolve-JavaToolchain/.test(backend) && /Android Studio\\jbr/.test(backend), 'Android toolbox must auto-discover Android Studio bundled JDK/JBR.');
assert(/DisplayName.*Android Studio/.test(backend), 'Android JDK discovery should also consult Windows install metadata for custom Android Studio paths.');
assert(/Install-DkdsManagedJdk/.test(backend) && /Ensure-JavaToolchain/.test(backend), 'Android tooling must be able to provision a managed JDK when the machine has none.');
assert(/api\.adoptium\.net\/v3\/binary\/latest\/21\/ga\/windows/.test(backend), 'Shared JDK provisioning must use the official Adoptium stable JDK 21 binary API.');
assert(/Get-FileHash[\s\S]*SHA256/.test(backend) && /sha256\.txt/.test(backend), 'Managed JDK download must verify the published SHA-256 checksum.');
assert(/DK_TOOL_ROOT/.test(backend) && /SharedToolRoot/.test(backend), 'Tooling must support a cross-project DK_TOOL_ROOT.');
assert(/BuildCache/.test(backend) && /ELECTRON_CACHE/.test(backend) && /ELECTRON_BUILDER_CACHE/.test(backend) && /GRADLE_USER_HOME/.test(backend), 'npm/Electron/electron-builder/Gradle caches must be shared outside projects.');
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
for (const file of [backendPath, guiPath]) {
  const data = fs.readFileSync(file);
  assert(data.length >= 3 && data[0] === 0xEF && data[1] === 0xBB && data[2] === 0xBF,
    `${path.basename(file)} must be UTF-8 with BOM for Windows PowerShell 5.1.`);
}

console.log('Windows tooling regression checks passed.');
