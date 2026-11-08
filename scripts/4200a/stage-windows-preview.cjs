'use strict';
/* Stage the dedicated FS-Pro PREVIEW executable without modifying DKDS version.
 * This assembly contains only read-only 4200A TCP IPC; ME1 execution is excluded.
 */
const fs=require('node:fs'),path=require('node:path');
const {copyFrontend}=require('./copy-frontend.cjs');
const root=path.resolve(__dirname,'../..'),stage=path.join(root,'.stage','4200a-windows');
const native='0.3.0';
const rawRevision=String(process.env.DKTS_UI_REVISION||'a0').trim();
if(!/^a\d{1,10}$/.test(rawRevision))throw new Error('Expected UI revision aNNNN');
const source=(...parts)=>path.join(root,...parts);
const target=(...parts)=>path.join(stage,...parts);
function copy(from,to){
 const src=source(...from),dest=target(...to);
 if(!fs.existsSync(src))throw new Error('Missing preview dependency '+src);
 fs.mkdirSync(path.dirname(dest),{recursive:true});
 fs.cpSync(src,dest,{recursive:true});
}
fs.rmSync(stage,{recursive:true,force:true});
fs.mkdirSync(stage,{recursive:true});
copyFrontend(root,stage);
copy(['assets','dkds-icon.ico'],['assets','dkds-icon.ico']);
for(const file of ['4200a-fspro-main.cjs','4200a-fspro-preload.cjs','4200a-routed-discovery.cjs','4200a-tcp-runtime.cjs'])
 copy(['desktop',file],['desktop',file]);
const config={
 name:'dk-test-studio-fspro-preview',version:native,private:true,
 description:'4200A FS-Pro research UI preview — read-only KXCI identity, NO source output',
 main:'desktop/4200a-fspro-main.cjs',
 build:{
  appId:'com.dk.teststudio4200a.fspro.preview',
  productName:'DK Test Studio 4200A Preview',
  electronVersion:String(process.env.DKTS_ELECTRON_VERSION||'43.4.0'),
  asar:true,
  directories:{output:'dist'},
  files:['desktop/**/*','src/**/*','sdk/theme-contract.js','assets/**/*','node_modules/d3/dist/d3.min.js','package.json'],
  win:{target:[{target:'portable',arch:['x64']}],icon:'assets/dkds-icon.ico',
       signAndEditExecutable:false,executableName:'DK Test Studio 4200A Preview'},
  portable:{artifactName:'DKTS-4200A-Preview-V'+native+'-'+rawRevision+'-Windows-x64.'+'${ext}'},
  compression:'normal',
  publish:null
 }
};
fs.writeFileSync(target('package.json'),JSON.stringify(config,null,2)+'\n');
const meta={schema:'dkts.preview-package.v1',nativeVersion:native,uiRevision:rawRevision,
  sourceCommit:String(process.env.GITHUB_SHA||'local'),readOnly:true,measurementExecutionAuthorized:false};
fs.writeFileSync(target('build-info.json'),JSON.stringify(meta,null,2)+'\n');
console.log(JSON.stringify({stage,version:'V'+native,uiRevision:rawRevision,
  content:'standalone Electron preview; 4200A output disabled'},null,2));
