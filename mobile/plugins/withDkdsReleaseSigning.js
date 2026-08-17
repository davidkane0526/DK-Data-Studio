const { withAppBuildGradle } = require('expo/config-plugins');

function findBlockEnd(source, openBraceIndex) {
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = openBraceIndex; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function getNamedBlock(source, blockName, fromIndex = 0) {
  const marker = `${blockName} {`;
  const start = source.indexOf(marker, fromIndex);
  if (start < 0) return null;
  const open = source.indexOf('{', start);
  const end = findBlockEnd(source, open);
  if (end < 0) return null;
  return { start, open, end, text: source.slice(start, end + 1) };
}

function patchReleaseSigning(source) {
  if (source.includes('DKDS_ANDROID_RELEASE_STORE_FILE')) return source;

  const signing = getNamedBlock(source, 'signingConfigs');
  if (!signing) throw new Error('Unable to locate signingConfigs in android/app/build.gradle.');

  const releaseSigning = `\n        release {\n            def dkdsStoreFile = System.getenv('DKDS_ANDROID_RELEASE_STORE_FILE')\n            def dkdsStorePassword = System.getenv('DKDS_ANDROID_RELEASE_STORE_PASSWORD')\n            def dkdsKeyAlias = System.getenv('DKDS_ANDROID_RELEASE_KEY_ALIAS')\n            def dkdsKeyPassword = System.getenv('DKDS_ANDROID_RELEASE_KEY_PASSWORD')\n            if (!dkdsStoreFile || !dkdsStorePassword || !dkdsKeyAlias || !dkdsKeyPassword) {\n                throw new GradleException('DKDS local release signing environment is incomplete.')\n            }\n            storeFile file(dkdsStoreFile)\n            storePassword dkdsStorePassword\n            keyAlias dkdsKeyAlias\n            keyPassword dkdsKeyPassword\n        }\n`;

  let patched = source.slice(0, signing.end) + releaseSigning + source.slice(signing.end);

  const buildTypes = getNamedBlock(patched, 'buildTypes');
  if (!buildTypes) throw new Error('Unable to locate buildTypes in android/app/build.gradle.');
  const release = getNamedBlock(patched, 'release', buildTypes.open + 1);
  if (!release || release.end > buildTypes.end) {
    throw new Error('Unable to locate release build type in android/app/build.gradle.');
  }

  let releaseText = release.text;
  if (/signingConfig\s+signingConfigs\.[A-Za-z0-9_]+/.test(releaseText)) {
    releaseText = releaseText.replace(/signingConfig\s+signingConfigs\.[A-Za-z0-9_]+/, 'signingConfig signingConfigs.release');
  } else {
    releaseText = releaseText.replace('release {', 'release {\n            signingConfig signingConfigs.release');
  }

  patched = patched.slice(0, release.start) + releaseText + patched.slice(release.end + 1);
  return patched;
}

module.exports = function withDkdsReleaseSigning(config) {
  // EAS manages its own production credentials. Only patch native Gradle when
  // the local Windows toolbox explicitly requests DKDS local release signing.
  if (process.env.DKDS_LOCAL_RELEASE_SIGNING !== '1') return config;

  return withAppBuildGradle(config, mod => {
    if (mod.modResults.language !== 'groovy') {
      throw new Error('DKDS release signing currently expects Groovy build.gradle.');
    }
    mod.modResults.contents = patchReleaseSigning(mod.modResults.contents);
    return mod;
  });
};

module.exports.patchReleaseSigning = patchReleaseSigning;
