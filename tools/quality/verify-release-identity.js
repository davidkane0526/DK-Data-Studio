'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const readJson = rel => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const readText = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const escapeRegExp = value => String(value).replace(/[|\\{}()[\]^$+*?.-]/g, '\\$&');

const pkg = readJson('package.json');
const mobilePkg = readJson(path.join('mobile', 'package.json'));
const mobileApp = readJson(path.join('mobile', 'app.json'));
const changelog = readText('CHANGELOG.md');
const readme = readText('README_CN.md');
const desktopHtml = readText('src/index.html');
const androidStamp = readText('tools/updates/stamp-android-build.cjs');
const windowsWorkflow = readText('.github/workflows/build-windows.yml');
const androidWorkflow = readText('.github/workflows/build-android.yml');
const hotWorkflow = readText('.github/workflows/ui-hot-update.yml');

const version = String(pkg.version || '');
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  throw new Error('Invalid package.json version: ' + (version || '<empty>'));
}
if (String(mobilePkg.version || '') !== version) {
  throw new Error('mobile/package.json version mismatch: ' + mobilePkg.version + ' != ' + version);
}
if (String(mobileApp?.expo?.version || '') !== version) {
  throw new Error('mobile/app.json expo.version mismatch: ' + mobileApp?.expo?.version + ' != ' + version);
}
const versionCode = Number(mobileApp?.expo?.android?.versionCode);
if (!Number.isInteger(versionCode) || versionCode < 1) {
  throw new Error('mobile/app.json expo.android.versionCode must be a positive integer.');
}
if (!new RegExp('^# ' + escapeRegExp(version) + '(?:\\s|$)', 'm').test(changelog)) {
  throw new Error('CHANGELOG.md is missing an explicit # ' + version + ' release heading.');
}
if (!readme.includes('v' + version + ' Release')) {
  throw new Error('README_CN.md is missing the v' + version + ' Release marker.');
}
if (!desktopHtml.includes('<span class="version">V' + version + '</span>')) {
  throw new Error('src/index.html desktop version label does not match the stable application version.');
}
if (!androidStamp.includes('const version=source;')||!androidStamp.includes('const versionCode=100000+run;')) {
  throw new Error('Android CI must keep versionName stable and increment only versionCode.');
}
if (windowsWorkflow.includes('npm version $ciVersion')||
    !windowsWorkflow.includes('DKDS_HOT_BUILD_ID')||
    !androidWorkflow.includes('DKDS_HOT_BUILD_ID')||
    !hotWorkflow.includes('DKDS_HOT_BUILD_ID')) {
  throw new Error('Platform and hot-update workflows must use the independent aNNNN build identity without rewriting the stable app version.');
}

console.log('Release identity PASS: V' + version + ', Android versionCode=' + versionCode + ', independent aNNNN hot identity');
