'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(root,'src/4200a-fspro/android-bridge.js'),'utf8');
const java=fs.readFileSync(path.join(root,'android4200a/app/src/main/java/studio/dk/fspro/preview/ReadonlyInstrumentBridge.java'),'utf8');
const main=fs.readFileSync(path.join(root,'android4200a/app/src/main/java/studio/dk/fspro/preview/MainActivity.java'),'utf8');
const html=fs.readFileSync(path.join(root,'src/4200a-fspro/index.html'),'utf8');
const gradle=fs.readFileSync(path.join(root,'android4200a/app/build.gradle'),'utf8');
const asset=require('../scripts/4200a/copy-frontend.cjs');
assert.match(java,/if \(!IDN\.equals\(command\) && !OPT\.equals\(command\)\)/);
assert.match(java,/newSingleThreadExecutor/);
assert.match(java,/case "connect":/);assert.match(java,/case "disconnect":/);
assert.match(java,/case "status":/);
assert.doesNotMatch(java,/case "(?:write|measure|exchange|output|command)":/);
assert.match(main,/WebViewAssetLoader/);assert.match(main,/setAllowFileAccess\(false\)/);
assert.match(gradle,/applicationId 'studio.dk.fspro.preview'/);
assert.match(gradle,/verifyStableSigning/);
assert.match(gradle,/DKTS_FSPRO_DETACHED_SIGNING/);
assert.match(gradle,/Private signing credentials forbidden in detached build/);
assert.match(gradle,/keyAlias 'dkts'/);
const cert=fs.readFileSync(path.join(root,'android4200a/signing-certificate.sha256'),'utf8').trim();
assert.equal(cert,'4e3c44eae89c3873d99acc9429c4528ecde145e7f88a97fdd98159c32ec2f363');
assert.doesNotMatch(gradle,/keystorePassword\s*=/,'never store private signing password in source');
assert.match(gradle,/versionName '0.3.13'/);
assert.ok(html.indexOf('domain/kxci-opt-inventory.js')<html.indexOf('android-bridge.js'));
assert.ok(html.indexOf('android-bridge.js')<html.indexOf('discovery-ui.js'));
assert.ok(asset.UI_FILES.includes('src/core/scientific/plot-runtime.js'));
assert.ok(!asset.UI_FILES.some(p=>p.includes('plugins/')),'no unrelated plugin bundles');
const messages=[];
const window={
 DKTSReadOnlyNative:{request:s=>{
  const v=JSON.parse(s);messages.push(v);
  if(v.op==='connect')queueMicrotask(()=>window.DK4200AndroidReceive(JSON.stringify({
   id:v.id,ok:true,value:{verifiedIdentity:true,connected:true,executionAuthorized:false,
    idn:'KEITHLEY INSTRUMENTS,KI4200A,1498377,V1.14',options:'SMU1'}
  })));
  if(v.op==='disconnect')queueMicrotask(()=>window.DK4200AndroidReceive(JSON.stringify({
   id:v.id,ok:true,value:{connected:false}
  })));
 }},
 DK4200OptionInventory:{parseOptReply:options=>({addressableSMUs:[{resource:'SMU1'}],options})}
};
vm.runInNewContext(src,{window,Promise,Map,JSON,setTimeout,clearTimeout,queueMicrotask,Error,Number,String,Object});
(async()=>{
 const connected=await window.DK4200Native.connect({host:'169.254.111.118',port:1225});
 assert.equal(connected.executionAuthorized,false);
 assert.deepEqual(Array.from(connected.inventory.addressableSMUs,x=>x.resource),['SMU1']);
 assert.deepEqual(messages.map(x=>x.op),['connect']);
 assert.equal(messages[0].payload.host,'169.254.111.118');
 await window.DK4200Native.disconnect();
 assert.deepEqual(messages.map(x=>x.op),['connect','disconnect']);
 assert.equal(window.DK4200Native.measure,undefined,'no device output capability');
 console.log('4200A Android bridge contract: stable signing, scripts, limited native calls and shared UI validated');
})().catch(e=>{console.error(e);process.exitCode=1;});
