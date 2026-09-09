'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const cp=require('child_process');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

const pkg=json('package.json');
const mobile=json('mobile/package.json');
const version=String(pkg.version||'0.0.0').split('.').map(Number);
assert(version[0]>3||(version[0]===3&&(version[1]>67||(version[1]===67&&version[2]>=21))),'Pre-Mobile repository hygiene requires application 3.67.21 or newer.');

assert.deepEqual(Object.keys(pkg.dependencies||{}).sort(),['d3','electron-updater','qrcode','ws'].sort(),'Desktop direct runtime dependencies must remain the audited minimal set.');
assert.deepEqual(Object.keys(pkg.devDependencies||{}).sort(),['electron'].sort(),'Desktop ordinary development dependencies must remain runtime-focused; packaging-only electron-builder is on-demand.');
assert.deepEqual(Object.keys(mobile.dependencies||{}).sort(),[
  'd3','expo','expo-clipboard','expo-document-picker','expo-file-system','expo-navigation-bar','expo-sharing','expo-status-bar','react','react-native','react-native-safe-area-context','react-native-webview'
].sort(),'Mobile direct runtime dependencies must remain the audited minimal set; retired duplicate UI dependencies such as expo-blur must not remain after Core Material cutover.');
assert.deepEqual(Object.keys(mobile.devDependencies||{}).sort(),['@types/react','typescript'].sort(),'Mobile direct development dependencies must remain the audited minimal set.');

const packager=read('tools/windows/package-clean-project.ps1');
for(const token of ['src\\generated','mobile\\assets\\web','assets\\dkds-icon.png','mobile\\assets\\icon.png','mobile\\assets\\adaptive-icon.png']){
  assert(packager.includes(token),`Clean source delivery must exclude reproducible artifact: ${token}`);
}
const sync=read('mobile/scripts/sync-web-assets.js');
assert(sync.includes('generate-runtime-compositions.js')&&sync.indexOf('generate-runtime-compositions.js')<sync.indexOf('fs.cpSync(source, out'),'Mobile sync must materialize deterministic Core runtime bundles before copying the clean source tree.');

if(fs.existsSync(path.join(root,'.git'))){
  const tracked=cp.execFileSync('git',['ls-files'],{cwd:root,encoding:'utf8'}).split(/\r?\n/).filter(Boolean);
  for(const rel of ['src/generated/runtime/app.js','src/generated/runtime/ui-infrastructure.js','src/generated/runtime/plugin-kernel.js','src/generated/plugin-index.js','src/generated/sdk-authoring-reference.js','assets/dkds-icon.png','mobile/assets/icon.png','mobile/assets/adaptive-icon.png']){
    assert(!tracked.includes(rel),`${rel} is reproducible and must not enter Git history.`);
  }
}

console.log('v3.67.21 pre-Mobile repository hygiene PASS: minimal direct dependencies, clean source delivery and fresh-checkout generation are enforced.');
