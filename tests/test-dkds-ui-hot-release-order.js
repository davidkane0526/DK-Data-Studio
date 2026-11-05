'use strict';
const assert=require('node:assert/strict');
const {compareUiVersions,compareBuildIds,compareUiIdentities,compatible,valid,FILES,selectUiRelease}=require('../desktop/ui-hot-update');
const {pickRelease}=require('../desktop/native-update');
const crypto=require('node:crypto');
const bundleFiles=Object.fromEntries(FILES.map(name=>{
  const bytes=Buffer.from('/* hot css */');
  return [name,{bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),base64:bytes.toString('base64')}];
}));
const validBundle={schema:'dkds-ui-v2',repository:'davidkane0526/DK-Data-Studio',appVersion:'3.72.0',buildId:'a1234',files:bundleFiles};
assert.match(valid(validBundle,'3.72.0'),/hot css/);
assert.throws(()=>valid({...validBundle,schema:'dkds-ui-v1'},'3.72.0'));
assert.throws(()=>valid({...validBundle,buildId:'3.72.1'},'3.72.0'));
const asset={name:'DKDS-UI-bundle.json'};
const uiRelease=(version,buildId,time)=>({tag_name:'dkds-ui-v'+version+'-'+buildId,published_at:time,draft:false,assets:[asset]});
const androidRelease=(version,buildId,time)=>({tag_name:'dkds-android-v'+version+'-'+buildId,published_at:time,draft:false,assets:[asset]});
assert.equal(compareUiVersions('3.72.0','3.71.999'),1);
assert.equal(compareUiVersions('3.72.0','3.72.0'),0);
assert.equal(compareBuildIds('a1235','a1234'),1);
assert.equal(compareBuildIds('a01234','a1234'),0);
assert.equal(compareUiIdentities({appVersion:'3.72.0',buildId:'a1235'},{appVersion:'3.72.0',buildId:'a1234'}),1);
assert.equal(compatible('3.72.1','3.72.0'),true);
assert.equal(compatible('3.73.0','3.72.0'),false,'hot CSS must not cross the app release line');
assert.equal(compatible('3.71.999','3.72.0'),false,'older app version cannot supply hot CSS');
const rows=[
  uiRelease('3.72.0','a1233','2026-11-05T23:00:00Z'),
  uiRelease('3.72.0','a1235','2026-11-05T21:00:00Z'),
  androidRelease('3.72.0','a1234','2026-11-05T22:00:00Z')
];
assert.equal(selectUiRelease(rows,'3.72.0',{appVersion:'3.72.0',buildId:'a1234'}).tag_name,'dkds-ui-v3.72.0-a1235',
  'hot build ID, not app version or publication time, determines the next hot update');
assert.equal(selectUiRelease(rows,'3.72.0',{appVersion:'3.72.0',buildId:'a1235'}),null,
  'already-applied hot build must not be offered again');
assert.equal(selectUiRelease([uiRelease('3.71.999','a9999','2026-11-05T23:00:00Z')],'3.72.0'),null);
assert.equal(selectUiRelease([{...uiRelease('3.72.0','a9999','2026-11-05T23:00:00Z'),draft:true}],'3.72.0'),null);
const nativeReleases=[
  {tag_name:'dkds-windows-v3.72.0-a1235',draft:false,assets:[{
    name:'DK-Data-Studio-Portable-3.72.0-a1235-x64.exe',
    browser_download_url:'https://github.com/davidkane0526/DK-Data-Studio/releases/download/dkds-windows-v3.72.0-a1235/DK-Data-Studio-Portable-3.72.0-a1235-x64.exe',
    digest:'sha256:'+'a'.repeat(64),size:2000000
  }]}
];
assert.equal(pickRelease(nativeReleases,'3.72.0'),null,
  'same app version must never trigger a full installer prompt, regardless of hot build ID');
assert.equal(pickRelease(nativeReleases,'3.71.1623')?.version,'3.72.0',
  'a higher stable app version must still offer the complete installer');
const fs=require('node:fs');
const path=require('node:path');
const native=fs.readFileSync(path.join(__dirname,'../desktop/native-update.js'),'utf8');
assert.match(native,/file\?\.digest!==candidate\.digest/,'cache identity includes release digest');
assert.match(native,/Windows 更新缓存校验失败|Windows 便携更新缓存校验失败/,'cached executable is checked again before execution');
console.log('DKDS stable app version / independent hot build identity / full-update suppression PASS');
