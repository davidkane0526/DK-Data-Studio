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

const direct = block('Enable-AndroidGradleDirectNoDaemon', 'Test-AndroidGradleInProcess');
const probe = block('Test-AndroidGradleInProcess', 'Test-AndroidApkArtifact');
const gradleBuild = block('Invoke-AndroidReleaseGradleBuild', 'Build-AndroidRelease');
const build = block('Build-AndroidRelease', 'Install-UpdateServerAutostart');

assert(direct.includes("Add-GradleJvmSystemProperty 'org.gradle.internal.instrumentation.agent' 'false'"),
  'Direct no-daemon mode must align Gradle instrumentation-agent status with the uninstrumented wrapper client.');
assert(direct.includes("Add-GradleJvmSystemProperty 'org.gradle.jvmargs' $jvmArgs"),
  'Agent parity must complement, not replace, immutable JVM-argument parity.');
assert(direct.includes("Add-GradleJvmSystemProperty 'org.gradle.daemon' 'false'"),
  'Direct mode must remain explicitly non-persistent.');
assert(!direct.includes('single-use daemon fork disabled'),
  'Tooling must not claim the child fork is disabled before a real Gradle compatibility check runs.');

assert(probe.includes("@('help','--no-daemon','--max-workers=1','--info')"),
  'The preflight must execute a cheap real Gradle project action under the same no-daemon contract.');
assert(probe.includes('single-use Daemon process will be forked') && probe.includes("Starting process 'Gradle build daemon'"),
  'The preflight must reject both Gradle single-use-daemon announcement and actual daemon process startup.');
assert(probe.includes('Gradle no-fork preflight: PASS'),
  'The preflight must only print PASS after the real Gradle action exits successfully without daemon startup.');
const parityIndex = gradleBuild.indexOf('Enable-AndroidGradleDirectNoDaemon');
const preflightIndex = gradleBuild.indexOf('Test-AndroidGradleInProcess');
const assembleIndex = gradleBuild.indexOf("Invoke-Step -FilePath '.\\gradlew.bat'");
assert(parityIndex >= 0 && preflightIndex > parityIndex && assembleIndex > preflightIndex,
  'The shared release owner must run the real no-fork preflight after parity is configured and before assembleRelease.');
assert(build.includes('Invoke-AndroidReleaseGradleBuild -AndroidDirectory $androidDirectory'),
  'android-build must consume the shared Gradle process owner instead of maintaining a divergent release invocation.');
assert(backend.includes("'android-run'") && backend.includes('Invoke-AndroidReleaseGradleBuild -AndroidDirectory $androidDir'),
  'android-run must consume the same JVM + agent parity and no-fork preflight as android-build.');

assert(atLeast(appPackage.version,'3.68.14'), 'Agent-parity closure requires app metadata >= 3.68.14.');
assert(atLeast(mobilePackage.version,'0.8.41'), 'Agent-parity closure requires Mobile package metadata >= 0.8.41.');
assert(atLeast(mobileApp.expo?.version,'0.8.41') && Number(mobileApp.expo?.android?.versionCode)>=52,
  'Agent-parity closure requires native version >= 0.8.41 / versionCode >= 52.');

console.log('v3.68.14 Android Gradle agent-status parity + runtime no-fork preflight PASS');
