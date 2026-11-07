'use strict';
const assert=require('node:assert/strict');
const {validateManifest,decideUpdate}=require('../src/4200a-fspro/update/release-contract');
const asset=(name)=>({filename:name,url:'https://download.example.org/'+name,sha256:'a'.repeat(64),bytes:4096});
const manifest={
 schema:'dkts.release.v1',channel:'preview',nativeVersion:'0.3.0',
 uiRevision:'a1234',sequence:1234,nativeAbi:1,commit:'d'.repeat(40),releaseId:'v0.3.0-a1234',
 assets:{ui:asset('ui.zip'),windows:asset('win.exe'),android:asset('android.apk')},
 signature:{algorithm:'ed25519',keyId:'test-only',value:'not-a-real-signature'}
};
const local={nativeVersion:'0.3.0',uiRevision:'a1233',nativeAbi:1,sequence:1233};
assert.equal(validateManifest(manifest).ok,true);
assert.equal(decideUpdate(local,manifest).reason,'SIGNATURE_NOT_VERIFIED');
let v=decideUpdate(local,manifest,{signatureVerified:true,platform:'android'});
assert.equal(v.action,'hot');assert.equal(v.filename,'ui.zip');
v=decideUpdate({...local,nativeVersion:'0.2.0'},manifest,{signatureVerified:true,platform:'android'});
assert.equal(v.action,'full');assert.equal(v.filename,'android.apk');
v=decideUpdate({...local,nativeVersion:'0.2.0'},manifest,{signatureVerified:true,platform:'windows'});
assert.equal(v.action,'full');assert.equal(v.filename,'win.exe');
v=decideUpdate({...local,sequence:1235},manifest,{signatureVerified:true});
assert.equal(v.action,'none');
v=decideUpdate({...local,nativeAbi:2},manifest,{signatureVerified:true});
assert.equal(v.reason,'NATIVE_ABI_DOWNGRADE');
assert.equal(validateManifest({...manifest,assets:{...manifest.assets,android:{...asset('apk'),sha256:'broken'}}}).ok,false);
assert.equal(validateManifest({...manifest,assets:{...manifest.assets,ui:{...asset('ui.zip'),url:'http://localhost/unsafe'}}}).ok,false);
assert.equal(decideUpdate(local,manifest,{signatureVerified:true,platform:'linux'}).action,'blocked');
console.log('4200A release contract: 10 offline assertions passed (no downloads, no signature verification).');
