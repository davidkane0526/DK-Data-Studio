const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const backendPath = path.join(root, 'tools', 'windows', 'grs-tools.ps1');
const guiPath = path.join(root, 'tools', 'windows', 'grs-gui.ps1');
const cmdPath = path.join(root, 'GRS.cmd');
const guiCmdPath = path.join(root, 'GRS_GUI.cmd');
const mobilePackagePath = path.join(root, 'mobile', 'package.json');
const easPath = path.join(root, 'mobile', 'eas.json');
const mobileAppPath = path.join(root, 'mobile', 'app.json');
const releaseSigningPluginPath = path.join(root, 'mobile', 'plugins', 'withGrsReleaseSigning.js');

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

// Geometry must use typed constructors instead of New-Object overload syntax;
// expressions such as ($Y + 42) were parsed as extra constructor arguments.
assert(!/New-Object\s+System\.Drawing\./i.test(gui), 'GUI contains fragile System.Drawing New-Object constructor syntax.');
assert(/\[System\.Drawing\.Point\]::new\(/.test(gui), 'GUI should use typed Point constructors.');
assert(/FlowLayoutPanel/.test(gui) && /Resize-ActionCards/.test(gui), 'GUI should retain responsive card layout.');
assert(/install-deps/.test(gui) && /doctor/.test(gui), 'GUI should expose dependency repair and diagnostics.');

// Android packaging exposed by the toolbox must produce the final release APK,
// not a debug build or a debug-suffixed artifact.
assert(/assembleRelease/.test(backend), 'Android build must use Gradle assembleRelease.');
assert(!/assembleDebug/.test(backend), 'Android toolbox must not build the debug variant.');
assert(/Graphene-Resonance-Studio\.apk/.test(backend), 'Android output must use the final APK name.');
assert(!/Graphene-Resonance-Studio-debug\.apk/i.test(backend + gui), 'Android tooling must not expose a debug APK artifact.');
assert(/expo','run:android','--variant','release'/.test(backend), 'Connected-device Android run must use the release variant.');
assert(/Initialize-AndroidReleaseSigning/.test(backend), 'Android build must initialize persistent local release signing.');
assert(/GRS_ANDROID_RELEASE_STORE_FILE/.test(backend), 'Android release signing environment must be configured.');
assert(/GrapheneResonanceStudio\\android-signing/.test(backend), 'Android release signing must live outside the repository in the user profile.');
assert(/grs-tools\.ps1 android-run/.test(mobilePackage.scripts.android || ''), 'Direct mobile Android run must route through the signed toolbox workflow.');
assert(/grs-tools\.ps1 android-build/.test(mobilePackage.scripts['apk:release'] || ''), 'Mobile APK script must route through the signed toolbox workflow.');
assert(!mobilePackage.scripts['apk:debug'], 'Debug APK npm script must not be exposed.');
assert(eas.build?.production?.android?.buildType === 'apk', 'EAS production Android build must output APK.');
assert((mobileApp.expo?.plugins || []).includes('./plugins/withGrsReleaseSigning.js'), 'Expo config must include the local release signing plugin.');
assert(/GRS_LOCAL_RELEASE_SIGNING/.test(releaseSigningPluginSource), 'Release signing plugin must be opt-in for local builds.');

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
assert(/GRS_ANDROID_RELEASE_STORE_FILE/.test(patchedGradle), 'Gradle patch must inject GRS release signing environment variables.');
assert(/signingConfig signingConfigs\.release/.test(patchedGradle), 'Gradle release build type must use the dedicated release signing config.');
assert(patchedGradle === patchReleaseSigning(patchedGradle), 'Gradle release signing patch must be idempotent.');

assert(/tools\\windows\\grs-tools\.ps1/i.test(cmd), 'GRS.cmd must route to grs-tools.ps1.');
assert(/tools\\windows\\grs-gui\.ps1/i.test(guiCmd), 'GRS_GUI.cmd must route to grs-gui.ps1.');

// Windows PowerShell 5.1 needs a BOM to reliably read Chinese source text.
for (const file of [backendPath, guiPath]) {
  const data = fs.readFileSync(file);
  assert(data.length >= 3 && data[0] === 0xEF && data[1] === 0xBB && data[2] === 0xBF,
    `${path.basename(file)} must be UTF-8 with BOM for Windows PowerShell 5.1.`);
}

console.log('Windows tooling regression checks passed.');
