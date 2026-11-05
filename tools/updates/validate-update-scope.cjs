'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const HOT_UPDATE_FILES=new Set([
  'src/styles/structure/connectivity-panels.css',
  'src/styles/platform/native-client-shell.css',
  'src/styles/theme/component-appearance.css'
]);
const RUNTIME_PREFIXES=['desktop/','mobile/','src/','sdk/','assets/','services/','config/','scripts/','tools/sdk/'];
const RUNTIME_ROOT_FILES=new Set(['package.json','package-lock.json','main.js','preload.js','plugin-package.js']);
function requiresFullAppVersionBump(paths){
  return paths.some(file=>{
    const value=String(file||'').replaceAll('\\','/');
    if(HOT_UPDATE_FILES.has(value))return false;
    return RUNTIME_ROOT_FILES.has(value)||RUNTIME_PREFIXES.some(prefix=>value.startsWith(prefix));
  });
}
function compareVersions(a,b){
  const parse=value=>/^\d+\.\d+\.\d+$/.test(String(value||''))?String(value).split('.').map(Number):null;
  const x=parse(a),y=parse(b);if(!x||!y)throw Error('Application versions must use x.y.z format.');
  for(let i=0;i<3;i++)if(x[i]!==y[i])return x[i]>y[i]?1:-1;
  return 0;
}
function validateUpdateScope({changedPaths,baseVersion,currentVersion}){
  const fullRequired=requiresFullAppVersionBump(changedPaths);
  const comparison=compareVersions(currentVersion,baseVersion);
  if(fullRequired&&comparison<=0){
    const runtime=changedPaths.filter(file=>!HOT_UPDATE_FILES.has(String(file).replaceAll('\\','/')));
    const error=new Error('检测到非热更新白名单的程序代码变更，必须提升 package.json 完整版本号后才能发布完整程序更新。当前 V'+currentVersion+'，基线 V'+baseVersion+'。');
    error.code='FULL_APP_VERSION_BUMP_REQUIRED';error.runtimeFiles=runtime;throw error;
  }
  return {fullRequired,baseVersion,currentVersion,channel:fullRequired?'full-app':'hot-update-only'};
}
function git(args){return execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();}
if(require.main===module){
  const base=String(process.env.DKDS_BASE_SHA||'').trim();
  const head=git(['rev-parse','HEAD']);
  if(!base||/^0+$/.test(base)){
    console.log('Update scope validation skipped: no push base SHA (manual dispatch or initial push).');
  }else{
    const paths=git(['diff','--name-only',base,head]).split(/\r?\n/).filter(Boolean);
    const basePackage=JSON.parse(git(['show',base+':package.json']));
    const currentPackage=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
    const result=validateUpdateScope({changedPaths:paths,baseVersion:basePackage.version,currentVersion:currentPackage.version});
    const summary='## DKDS update channel validation\n\n- Channel: **'+result.channel+'**\n- Application version: V'+result.currentVersion+'\n- Changed runtime files: '+(result.fullRequired?'full application version bump verified':'only allowlisted CSS hot-update resources')+'\n';
    if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,summary);
    console.log('DKDS update scope PASS: '+result.channel+'; V'+result.currentVersion);
  }
}
module.exports={HOT_UPDATE_FILES,requiresFullAppVersionBump,compareVersions,validateUpdateScope};
