'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {openHttps,readJson,RELEASES}=require('./native-update');
const REPO='davidkane0526/DK-Data-Studio';
const API=RELEASES;
const ASSET='DKDS-UI-bundle.json';
const SCHEMA='dkds-ui-v2';
const FILES=Object.freeze(['src/styles/structure/connectivity-panels.css',
  'src/styles/platform/native-client-shell.css','src/styles/theme/component-appearance.css']);
const LIMIT=1024*1024;
const versionPattern=/^\d+\.\d+\.\d+$/;
const buildIdPattern=/^a\d{4,}$/;
const releasePattern=/^dkds-(?:ui|android)-v(\d+\.\d+\.\d+)-(a\d{4,})$/;
function compareUiVersions(a,b){
  if(!versionPattern.test(a||'')||!versionPattern.test(b||''))throw Error('Invalid UI application version');
  const left=a.split('.').map(Number),right=b.split('.').map(Number);
  for(let i=0;i<3;i++)if(left[i]!==right[i])return left[i]>right[i]?1:-1;
  return 0;
}
function compareBuildIds(a,b){
  if(!buildIdPattern.test(a||'')||!buildIdPattern.test(b||''))throw Error('Invalid hot-update build ID');
  const left=BigInt(a.slice(1)),right=BigInt(b.slice(1));
  return left===right?0:left>right?1:-1;
}
function compareUiIdentities(a,b){
  const versionOrder=compareUiVersions(a.appVersion,b.appVersion);
  return versionOrder||compareBuildIds(a.buildId,b.buildId);
}
function compatible(source,installed){
  if(!versionPattern.test(source||'')||!versionPattern.test(installed||''))return false;
  const a=source.split('.'),b=installed.split('.');
  return a[0]===b[0]&&a[1]===b[1]&&compareUiVersions(source,installed)>=0;
}
function selectUiRelease(releases,currentVersion,appliedIdentity={appVersion:currentVersion,buildId:'a0000'}){
  if(!Array.isArray(releases))throw Error('Invalid GitHub release metadata');
  const applied=appliedIdentity&&typeof appliedIdentity==='object'?appliedIdentity:{appVersion:currentVersion,buildId:'a0000'};
  return releases.filter(row=>{
    const match=releasePattern.exec(String(row.tag_name||''));
    if(row.draft||!match||!compatible(match[1],currentVersion)||
      !row.assets?.some(a=>a.name===ASSET))return false;
    return compareUiIdentities({appVersion:match[1],buildId:match[2]},applied)>0;
  }).sort((a,b)=>{
    const ma=releasePattern.exec(a.tag_name),mb=releasePattern.exec(b.tag_name);
    return compareUiIdentities({appVersion:mb[1],buildId:mb[2]},{appVersion:ma[1],buildId:ma[2]})||
      String(b.published_at||b.created_at||'').localeCompare(String(a.published_at||a.created_at||''));
  })[0]||null;
}
function valid(bundle,current){
  if(!bundle||bundle.schema!==SCHEMA||bundle.repository!==REPO||
    !versionPattern.test(bundle.appVersion||'')||!buildIdPattern.test(bundle.buildId||''))throw Error('UI bundle manifest invalid');
  if(!compatible(bundle.appVersion,current))throw Error('UI hot update is incompatible with this app release line');
  if(Object.keys(bundle.files||{}).sort().join(',')!==[...FILES].sort().join(','))throw Error('UI bundle file allowlist mismatch');
  const css=[];let total=0;
  for(const name of FILES){
    const item=bundle.files[name];
    if(!item||typeof item.base64!=='string'||!Number.isInteger(item.bytes)||item.bytes<1||item.bytes>150000||!/^[a-f0-9]{64}$/.test(item.sha256))throw Error('Invalid UI file entry');
    const bytes=Buffer.from(item.base64,'base64');total+=bytes.length;
    if(bytes.length!==item.bytes||crypto.createHash('sha256').update(bytes).digest('hex')!==item.sha256)throw Error('UI resource SHA-256 mismatch');
    css.push('/* DKDS hot UI: '+name+' */\n'+bytes.toString('utf8'));
  }
  if(total>LIMIT)throw Error('UI hot bundle exceeds size limit');
  return css.join('\n');
}
async function readAsset(url,size,expected){
  const response=await openHttps(url);
  const chunks=[];let count=0;const hash=crypto.createHash('sha256');
  for await(const part of response){
    count+=part.length;if(count>LIMIT*2)throw Error('UI bundle download size limit');
    hash.update(part);chunks.push(part);
  }
  if(count!==size||hash.digest('hex')!==expected)throw Error('UI bundle release digest mismatch');
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
function createUiHotUpdater({userData,currentVersion}){
  const root=path.join(userData,'verified-ui-hot');
  const active=path.join(root,'active.json'),stage=path.join(root,'next.json'),backup=path.join(root,'previous.json');
  let status='idle',error='',appVersion=currentVersion,buildId='a0000',tag='',css='',busy=null;
  function loadCached(file){
    const row=JSON.parse(fs.readFileSync(file,'utf8'));
    const value=valid(row.bundle,currentVersion);
    return {css:value,tag:row.tag,appVersion:row.bundle.appVersion,buildId:row.bundle.buildId};
  }
  try{const row=loadCached(active);css=row.css;tag=row.tag;appVersion=row.appVersion;buildId=row.buildId;}
  catch{try{const row=loadCached(backup);css=row.css;tag=row.tag;appVersion=row.appVersion;buildId=row.buildId;
    fs.mkdirSync(root,{recursive:true});fs.copyFileSync(backup,active);
  }catch{css='';tag='';appVersion=currentVersion;buildId='a0000';}}
  const state=()=>({status,version:appVersion,appVersion,buildId,tag,error,applied:!!css});
  async function check(){
    if(busy)return busy;
    const task=(async()=>{
      status='checking';error='';
      try{
        const releases=await readJson(API);
        const chosen=selectUiRelease(releases,currentVersion,{appVersion,buildId});
        if(!chosen){status='current';return state();}
        const match=releasePattern.exec(chosen.tag_name);
        if(!match)throw Error('UI release identity is invalid');
        const asset=chosen.assets.find(a=>a.name===ASSET);
        const prefix='https://github.com/'+REPO+'/releases/download/'+chosen.tag_name+'/';
        if(!asset.browser_download_url?.startsWith(prefix)||!/^sha256:[a-f0-9]{64}$/i.test(asset.digest||'')||asset.size<100||asset.size>LIMIT*2)throw Error('Unverified UI asset');
        const bundle=await readAsset(asset.browser_download_url,asset.size,asset.digest.slice(7).toLowerCase());
        if(bundle.appVersion!==match[1]||bundle.buildId!==match[2])throw Error('UI release identity disagrees with package');
        const nextCss=valid(bundle,currentVersion);
        fs.mkdirSync(root,{recursive:true});fs.writeFileSync(stage,JSON.stringify({tag:chosen.tag_name,bundle}));
        loadCached(stage);
        if(fs.existsSync(active))fs.copyFileSync(active,backup);
        fs.renameSync(stage,active);
        css=nextCss;tag=chosen.tag_name;appVersion=bundle.appVersion;buildId=bundle.buildId;status='updated';return state();
      }catch(e){status='error';error=String(e?.message||e).slice(0,180);return state();}
    })();
    busy=task;try{return await task;}finally{if(busy===task)busy=null;}
  }
  return Object.freeze({check,state,css:()=>css});
}
module.exports={createUiHotUpdater,valid,compatible,compareUiVersions,compareBuildIds,compareUiIdentities,selectUiRelease,FILES};
