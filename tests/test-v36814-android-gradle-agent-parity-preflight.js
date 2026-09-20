const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const backend = fs.readFileSync(path.join(root, 'tools', 'windows', 'dkds-tools.ps1'), 'utf8').replace(/^\uFEFF/, '');
const appPackage = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const mobilePackage = JSON.parse(fs.readFileSync(path.join(root, 'mobile', 'package.json'), 'utf8'));
const mobileApp = JSON.parse(fs.readFileSync(path.join(root, 'mobile', 'app.json'), 'utf8'));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function atLeast(actual,minimum){const a=String(actual).split('.').map(Number),b=String(minimum).split('.').map(Number);for(let i=0;i<3;i++){if((a[i]||0)>(b[i]||0))return true;if((a[i]||0)<(b[i]||0))return false;}return true;}
function block(name, nextName) {
  const start = backend.indexOf(`function ${name}`);
  if (start < 0) return '';
  const end = nextName ? backend.indexOf(`function ${nextName}`, start + 1) : backend.length;
  return backend.slice(start, end < 0 ? backend.length : end);
}

const direct = block('Enable-AndroidGradleDirectNoDaemon', 'Test-AndroidApkArtifact');
const gradleBuild = block('Invoke-AndroidReleaseGradleBuild', 'Build-AndroidRelease');
const build = block('Build-AndroidRelease', 'Install-UpdateServerAutostart');

assert(direct.includes("Add-GradleJvmSystemProperty 'org.gradle.internal.instrumentation.agent' 'false'"),
  'Direct no-daemon mode must align Gradle instrumentation-agent status with the uninstrumented wrapper client.');
assert(direct.includes("Add-GradleJvmSystemProperty 'org.gradle.jvmargs' $jvmArgs"),
  'Agent parity must complement, not replace, immutable JVM-argument parity.');
assert(direct.includes("Add-GradleJvmSystemProperty 'org.gradle.daemon' 'false'"),
  'Direct mode must remain explicitly non-persistent.');
assert(direct.includes('no pre-build probe'),
  'Tooling must make the no-preflight Android build path explicit.');
assert(!backend.includes('function Test-AndroidGradleInProcess'),
  'Android tooling must not retain a separate Gradle preflight owner after removing pre-build tests.');
assert(!gradleBuild.includes('Test-AndroidGradleInProcess'),
  'The release build must not run a Gradle help/probe before assembleRelease.');
const parityIndex = gradleBuild.indexOf('Enable-AndroidGradleDirectNoDaemon');
const assembleIndex = gradleBuild.indexOf("Invoke-Step -FilePath '.\\gradlew.bat'");
assert(parityIndex >= 0 && assembleIndex > parityIndex,
  'The shared release owner must configure direct no-daemon mode and proceed directly to assembleRelease.');
assert(build.includes('Invoke-AndroidReleaseGradleBuild -AndroidDirectory $androidDirectory'),
  'android-build must consume the shared Gradle process owner instead of maintaining a divergent release invocation.');
assert(backend.includes("'android-run'") && backend.includes('Invoke-AndroidReleaseGradleBuild -AndroidDirectory $androidDir'),
  'android-run must consume the same direct no-daemon Gradle owner as android-build.');

assert(atLeast(appPackage.version,'3.68.14'), 'Agent-parity closure requires app metadata >= 3.68.14.');
assert(atLeast(mobilePackage.version,'0.8.41'), 'Agent-parity closure requires Mobile package metadata >= 0.8.41.');
assert(atLeast(mobileApp.expo?.version,'0.8.41') && Number(mobileApp.expo?.android?.versionCode)>=52,
  'Agent-parity closure requires native version >= 0.8.41 / versionCode >= 52.');

console.log('v3.68.14 Android Gradle agent-status parity closure PASS: no pre-build Gradle probe');
