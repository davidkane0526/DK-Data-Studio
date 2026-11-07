'use strict';
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const path=require('node:path');
const publisher=require('../tools/4200a/build-release-manifest.cjs');
const {validateManifest,decideUpdate}=require('../src/4200a-fspro/update/release-contract');
const keys=crypto.generateKeyPairSync('ed25519');
const pri=keys.privateKey.export({type:'pkcs8',format:'pem'}),pub=keys.publicKey.export({type:'spki',format:'pem'});
const src=n=>({path:'/test-asset/'+n,url:'https://releases.example.org/4200a/'+n});
const cfg={
 channel:'preview',nativeVersion:'0.3.0',uiRevision:'a1234',sequence:1234,
 nativeAbi:1,commit:'a'.repeat(40),releaseId:'v0.3.0-a1234',
 assets:{ui:src('ui.zip'),windows:src('windows.exe'),android:src('android.apk')}
};
const signed=publisher.buildManifest(cfg,{
 privateKeyPem:pri,keyId:'test-signing-key',
 readFile:f=>Buffer.from('actual bytes for '+path.basename(f),'utf8')
});
assert.equal(validateManifest(signed).ok,true);
assert.equal(publisher.verifyManifest(signed,{publicKeyPem:pub,expectedKeyId:'test-signing-key'}),true);
const tampered=structuredClone(signed);tampered.assets.android.url='https://attacker.example.org/apk';
assert.equal(publisher.verifyManifest(tampered,{publicKeyPem:pub,expectedKeyId:'test-signing-key'}),false,'URL tampering must break signature');
const tamperedHash=structuredClone(signed);tamperedHash.assets.ui.sha256='0'.repeat(64);
assert.equal(publisher.verifyManifest(tamperedHash,{publicKeyPem:pub,expectedKeyId:'test-signing-key'}),false,'byte hash tampering must break signature');
const local={nativeVersion:'0.3.0',uiRevision:'a1233',sequence:1233,nativeAbi:1};
assert.equal(decideUpdate(local,signed,{signatureVerified:false}).action,'blocked');
assert.equal(decideUpdate(local,signed,{signatureVerified:publisher.verifyManifest(signed,{publicKeyPem:pub,expectedKeyId:'test-signing-key'})}).action,'hot');
assert.equal(decideUpdate({...local,nativeVersion:'0.2.9'},signed,{signatureVerified:true,platform:'android'}).filename,'android.apk');
assert.throws(()=>publisher.buildManifest(cfg,{privateKeyPem:pri,keyId:'test-signing-key',readFile:()=>Buffer.alloc(0)}),/empty/);
assert.throws(()=>publisher.buildManifest(cfg,{privateKeyPem:pri,keyId:'invalid key',readFile:()=>Buffer.from('a')}),/key ID/);
console.log('4200A signed manifest: valid signature, hash/url tamper resistance and hot/full policy checked');
