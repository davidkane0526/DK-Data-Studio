'use strict';
/* Offline, deterministic release-manifest publisher for Windows/Android/UI.
 * No GitHub API calls. Caller owns staging, signing keys and atomic publication.
 */
const fs=require('node:fs');
const crypto=require('node:crypto');
const path=require('node:path');
const {validateManifest,canonicalManifestText}=require('../../src/4200a-fspro/update/release-contract');
const VERSION='1.0.0';
function buildManifest(config,{privateKeyPem,keyId,readFile=fs.readFileSync}={}){
 if(!config||typeof config!=='object')throw new TypeError('Release configuration required');
 if(typeof privateKeyPem!=='string'||!privateKeyPem.includes('PRIVATE KEY'))throw new Error('Ed25519 private key required');
 if(typeof keyId!=='string'||!/^[a-zA-Z0-9_.-]{1,80}$/.test(keyId))throw new Error('Pinned public key ID required');
 const assets={};
 for(const kind of ['ui','windows','android']){
  const src=config.assets?.[kind];
  if(!src||typeof src.path!=='string'||!src.path||typeof src.url!=='string')throw new Error('Asset missing: '+kind);
  const buffer=readFile(path.resolve(src.path));
  if(!Buffer.isBuffer(buffer)||!buffer.length)throw new Error('Asset missing or empty: '+kind);
  if(buffer.length>Number.MAX_SAFE_INTEGER)throw new Error('Asset too large: '+kind);
  assets[kind]={filename:path.basename(src.path),url:src.url,sha256:crypto.createHash('sha256').update(buffer).digest('hex'),bytes:buffer.length};
 }
 const manifest={
  schema:'dkts.release.v1',
  channel:config.channel,nativeVersion:config.nativeVersion,uiRevision:config.uiRevision,
  sequence:config.sequence,nativeAbi:config.nativeAbi,commit:config.commit,releaseId:config.releaseId,
  assets,
  signature:{algorithm:'ed25519',keyId,value:''}
 };
 const canonical=Buffer.from(canonicalManifestText(manifest),'utf8');
 const privateKey=crypto.createPrivateKey(privateKeyPem);
 if(privateKey.asymmetricKeyType!=='ed25519')throw new Error('Expected Ed25519 key');
 manifest.signature.value=crypto.sign(null,canonical,privateKey).toString('base64');
 const result=validateManifest(manifest);
 if(!result.ok)throw new Error('Invalid release manifest: '+result.errors.join(','));
 return Object.freeze(manifest);
}
function verifyManifest(manifest,{publicKeyPem,expectedKeyId}={}){
 const syntax=validateManifest(manifest);
 if(!syntax.ok)return false;
 if(!publicKeyPem||manifest.signature.keyId!==expectedKeyId)return false;
 const bytes=Buffer.from(manifest.signature.value,'base64');
 if(bytes.length!==64)return false;
 const pub=crypto.createPublicKey(publicKeyPem);
 if(pub.asymmetricKeyType!=='ed25519')return false;
 return crypto.verify(null,Buffer.from(canonicalManifestText(manifest),'utf8'),pub,bytes);
}
if(require.main===module){
 try{
  const [configPath,outPath]=process.argv.slice(2);
  if(!configPath||!outPath)throw new Error('Usage: node build-release-manifest.cjs CONFIG.json OUTPUT.json');
  const cfg=JSON.parse(fs.readFileSync(configPath,'utf8'));
  const key=process.env.DK4200_ED25519_PRIVATE_KEY_PEM;
  const id=process.env.DK4200_SIGNING_KEY_ID;
  const signed=buildManifest(cfg,{privateKeyPem:key,keyId:id});
  const output=path.resolve(outPath),temp=output+'.tmp';
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(temp,JSON.stringify(signed,null,2)+'\n',{flag:'wx'});
  fs.renameSync(temp,output);
  console.log('Signed 4200A manifest generated: '+output+' ['+signed.releaseId+']');
 }catch(err){console.error('4200A manifest publication halted: '+err.message);process.exitCode=1;}
}
module.exports={VERSION,buildManifest,verifyManifest};
