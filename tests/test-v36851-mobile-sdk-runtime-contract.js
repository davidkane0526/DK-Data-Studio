'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const atLeast=(v,min)=>{const a=v.split('.').map(Number),b=min.split('.').map(Number);for(let i=0;i<3;i++){if(a[i]!==b[i])return a[i]>b[i];}return true;};
assert(atLeast(json('package.json').version,'3.68.51'));

const index=read('src/index.html');
const declared=[...index.matchAll(/<script\s+src=["']\.\.\/sdk\/([^"']+\.js)["']/g)].map(m=>m[1]);
const expected=['platform-presentation-contract.js','theme-contract.js','theme-coverage-contract.js'];
assert.deepStrictEqual([...declared].sort(),[...expected].sort(),'src/index.html SDK runtime contract declarations changed; Mobile packaging must be updated deliberately.');

const sync=read('mobile/scripts/sync-web-assets.js');
for(const name of expected)assert(sync.includes(`'${name}'`),`Mobile sync must package current SDK runtime contract ${name}.`);
assert(sync.includes('Mobile SDK runtime contract mismatch'),'Mobile sync must fail closed if index.html and packaged SDK runtimes diverge.');
assert(!sync.includes("'semver-compat.js'"),'Retired semver compatibility bridge must not return to Mobile packaging.');
assert(json('mobile/app.json').expo.android.versionCode>=78,'Android versionCode must remain at or above the Mobile plugin-runtime packaging baseline.');


const buildFiles=json('package.json').build.files;
for(const name of expected)assert(buildFiles.includes(`sdk/${name}`),`Desktop distribution must package current SDK runtime contract sdk/${name}.`);

const contractRuntime=read('src/core/plugins/contract-runtime.js');
assert(contractRuntime.includes('DKDSPlatformPresentationContract is unavailable.'),'Plugin manifest validation must continue requiring the current Platform Presentation Contract rather than bypassing it on Mobile.');

console.log('v3.68.51 Mobile SDK runtime contract packaging PASS.');
