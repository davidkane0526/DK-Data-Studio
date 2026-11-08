'use strict';
/* Copies the exact same FS-Pro + DKDS Core frontend as Windows.
 * Do not package unrelated DKDS plugins or the Windows network host.
 */
const fs=require('node:fs'),path=require('node:path');
const {copyFrontend}=require('./copy-frontend.cjs');
const root=path.resolve(__dirname,'../..');
const dest=path.join(root,'android4200a','app','src','main','assets');
const revision=String(process.env.DKTS_UI_REVISION||'a0');
if(!/^a[0-9]{1,10}$/.test(revision))throw new Error('Invalid FS-Pro UI revision');
fs.rmSync(dest,{recursive:true,force:true});
fs.mkdirSync(dest,{recursive:true});
const copied=copyFrontend(root,dest);
const appIcon=path.join(root,'build','icon.png');
if(!fs.existsSync(appIcon))throw new Error('Legacy DKTS app icon must be generated before packaging');
fs.copyFileSync(appIcon,path.join(dest,'src','4200a-fspro','brand-icon.png'));
const metadata={
 schema:'dkts.4200a.preview-package.v1',
 nativeVersion:'0.3.13',uiRevision:revision,
 sourceCommit:process.env.GITHUB_SHA||'local',
 measurementExecutionAuthorized:false,
 tcpMode:'native-read-only'
};
fs.writeFileSync(path.join(dest,'src','4200a-fspro','preview-build.json'),JSON.stringify(metadata,null,2)+'\n');
fs.writeFileSync(path.join(dest,'src','4200a-fspro','build-info.js'),
 'window.DKTSPreviewBuild='+JSON.stringify(metadata)+';\n');
for(const file of [
 'src/4200a-fspro/index.html',
 'src/4200a-fspro/android-bridge.js',
 'src/core/scientific/plot-runtime.js',
 'node_modules/d3/dist/d3.min.js'
]){
 if(!fs.existsSync(path.join(dest,file)))throw new Error('Android asset incomplete: '+file);
}
console.log(JSON.stringify({dest,copyCount:copied.length,revision,onlyReadOnlyBridge:true},null,2));
