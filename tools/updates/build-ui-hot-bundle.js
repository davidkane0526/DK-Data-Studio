'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const appVersion=String(process.env.DKDS_UI_APP_VERSION||process.env.DKDS_RELEASE_VERSION||require(path.join(root,'package.json')).version);
const buildId=String(process.env.DKDS_UI_BUILD_ID||process.env.DKDS_HOT_BUILD_ID||'');
if(!/^\d+\.\d+\.\d+$/.test(appVersion))throw Error('Invalid hot UI application version');
if(!/^a\d{4,}$/.test(buildId))throw Error('Invalid hot UI build identity: '+buildId);
const names=Object.freeze([
  'src/styles/structure/connectivity-panels.css',
  'src/styles/platform/native-client-shell.css',
  'src/styles/theme/component-appearance.css'
]);
const files=Object.fromEntries(names.map(name=>{
  const bytes=fs.readFileSync(path.join(root,name));
  if(bytes.length<1||bytes.length>150000)throw Error('Unexpected UI file size: '+name);
  return [name,{bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),base64:bytes.toString('base64')}];
}));
const bundle={schema:'dkds-ui-v2',repository:'davidkane0526/DK-Data-Studio',appVersion,buildId,commit:String(process.env.GITHUB_SHA||''),files};
const output=path.resolve(process.argv[2]||path.join(root,'dist','DKDS-UI-bundle.json'));
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,JSON.stringify(bundle));
console.log('DKDS UI bundle created:','V'+appVersion,buildId,output,Object.values(files).reduce((n,x)=>n+x.bytes,0),'bytes');
module.exports={names,bundle};
