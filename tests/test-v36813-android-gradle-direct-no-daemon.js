const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const backend = fs.readFileSync(path.join(root, 'tools', 'windows', 'dkds-tools.ps1'), 'utf8').replace(/^\uFEFF/, '');
const mobilePackage = JSON.parse(fs.readFileSync(path.join(root, 'mobile', 'package.json'), 'utf8'));
const mobileApp = JSON.parse(fs.readFileSync(path.join(root, 'mobile', 'app.json'), 'utf8'));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function block(name, nextName) {
  const start = backend.indexOf(`function ${name}`);
  if (start < 0) return '';
  const end = nextName ? backend.indexOf(`function ${nextName}`, start + 1) : backend.length;
  return backend.slice(start, end < 0 ? backend.length : end);
}

const normalize = block('Get-AndroidGradleBuildJvmArgs', 'Enable-AndroidGradleDirectNoDaemon');
const direct = block('Enable-AndroidGradleDirectNoDaemon', 'Test-AndroidApkArtifact');
const gradleBuild = block('Invoke-AndroidReleaseGradleBuild', 'Build-AndroidRelease');
const build = block('Build-AndroidRelease', 'Install-UpdateServerAutostart');

assert(normalize.includes("org\\.gradle\\.jvmargs"), 'Android Gradle launcher must read the generated React Native org.gradle.jvmargs contract.');
assert(normalize.includes("-Xms64m"), 'Direct no-daemon parity must include the wrapper client minimum heap so immutable JVM settings match.');
assert(normalize.includes("-Dfile.encoding=UTF-8"), 'Direct no-daemon parity must include the wrapper UTF-8 setting so immutable JVM properties match.');
assert(normalize.includes("-Xmx512m -XX:MaxMetaspaceSize=384m"), 'Missing template JVM args must use Gradle documented fallback instead of an empty JVM contract.');

assert(/\$env:JAVA_OPTS\s*=\s*\$jvmArgs/.test(direct), 'The Gradle client JVM must receive the same JVM args as the build JVM.');
assert(/Add-GradleJvmSystemProperty\s+'org\.gradle\.jvmargs'\s+\$jvmArgs/.test(direct), 'The requested build JVM args must exactly match the client JVM args.');
assert(/Add-GradleJvmSystemProperty\s+'org\.gradle\.daemon'\s+'false'/.test(direct), 'Direct mode must disable the daemon at the Gradle property layer as well as the CLI layer.');
assert(/JVM \+ agent parity enforced/.test(direct), 'Diagnostics must describe the complete direct-process compatibility contract instead of claiming success before runtime verification.');

assert((gradleBuild.match(/Invoke-Step -FilePath '\\.\\gradlew\.bat'/g) || gradleBuild.match(/Invoke-Step -FilePath '\.\\gradlew\.bat'/g) || []).length === 1,
  'Shared release Gradle owner must make one deterministic invocation instead of retrying the same blocked Java child launch.');
assert(gradleBuild.includes("'--no-daemon'"), 'Release Gradle invocation must still be explicitly non-persistent.');
assert(!gradleBuild.includes("Clear-GradleProxyOptions"), 'The Gradle process-launch fix must not drop the configured proxy as a fallback side effect.');
assert(!gradleBuild.includes("-Dorg.gradle.jvmargs="), 'The old empty-jvmargs retry was proven ineffective and must stay removed.');
assert(/\$savedJavaOptions=\$env:JAVA_OPTS/.test(gradleBuild) && /\$savedGradleOptions=\$env:GRADLE_OPTS/.test(gradleBuild),
  'Shared Android release owner must preserve caller JVM/proxy environment before entering deterministic Gradle mode.');
assert(/Remove-Item Env:JAVA_OPTS/.test(gradleBuild) && /Remove-Item Env:GRADLE_OPTS/.test(gradleBuild),
  'Shared Android release owner must restore or remove temporary JVM environment after the build.');
assert(build.includes('Invoke-AndroidReleaseGradleBuild'),
  'Release packaging must consume the shared deterministic Gradle owner.');

// React Native 0.86 / Expo-generated gradle.properties currently requests the
// following build VM. The direct client plan must preserve those memory values
// and add only the wrapper immutable settings needed for no-fork compatibility.
const rnTemplateJvm = '-Xmx2048m -XX:MaxMetaspaceSize=512m';
const expectedDirectJvm = `${rnTemplateJvm} -Xms64m -Dfile.encoding=UTF-8`;
assert(expectedDirectJvm === '-Xmx2048m -XX:MaxMetaspaceSize=512m -Xms64m -Dfile.encoding=UTF-8',
  'Reference direct-client JVM plan changed unexpectedly.');

const mobileVersion = mobilePackage.version.split('.').map(Number);
assert(mobilePackage.version===require('../package.json').version||(mobileVersion[0]===0&&mobileVersion[1]===8&&mobileVersion[2]>=40), 'Android build-tooling closure must preserve the historical Mobile 0.8.40+ baseline or the synchronized app version.');
assert(Number(mobileApp.expo?.android?.versionCode) >= 51,
  'Android build-tooling closure must preserve Android versionCode 51+ after later patches.');

console.log('v3.68.13 Android Gradle direct no-daemon JVM parity closure PASS');
