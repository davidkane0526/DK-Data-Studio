'use strict';

const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const win=read('.github/workflows/build-windows.yml');
const android=read('.github/workflows/build-android.yml');

for(const [name,source] of [['Windows',win],['Android',android]]){
  assert(
    /permissions:\s*[\s\S]*?contents:\s*write[\s\S]*?statuses:\s*write/.test(source),
    `${name} workflow must have contents: write so successful dev builds can publish GitHub Releases.`
  );
  assert(
    source.includes("github.event_name == 'push' && github.ref == 'refs/heads/dev'"),
    `${name} Release publishing must be restricted to dev push builds, not pull requests.`
  );
  assert(
    source.includes('DKDS_RELEASE_VERSION'),
    `${name} workflow must derive the Release tag from the source application version.`
  );
  assert(
    source.includes('DK-Data-Studio-Windows-Portable.exe') &&
    source.includes('DK-Data-Studio-Android-arm64.apk'),
    `${name} Release policy must explicitly allow exactly the Portable EXE and Android APK asset names.`
  );
  assert(
    source.includes('gh release') && source.includes('--clobber'),
    `${name} workflow must publish idempotently to GitHub Release and replace same-name assets on rerun.`
  );
}

assert(
  win.includes("Publish Portable EXE to GitHub Release") &&
  win.includes("Where-Object { $_.Name -match '(?i)portable' }") &&
  !/Publish Portable EXE to GitHub Release[\s\S]*?gh release upload[^\n]*Setup/i.test(win),
  'Windows Release publishing must select the Portable EXE and must not publish Setup.'
);

assert(
  android.includes('Publish APK to GitHub Release') &&
  android.includes('mobile-dist/DK-Data-Studio-arm64-v8a-release.apk') &&
  android.includes('DK-Data-Studio-Android-arm64.apk'),
  'Android Release publishing must upload the verified arm64 APK under the stable Release asset name.'
);

assert(
  win.includes("gh release delete-asset") &&
  android.includes("gh release delete-asset"),
  'Both publishers must remove unexpected compiled assets so a version Release converges to the two-file contract.'
);

console.log('v3.71.120 GitHub Release two-asset publishing contract PASS');
