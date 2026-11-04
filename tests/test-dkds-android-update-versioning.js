'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-android-version-'));
const files=['package.json','mobile/package.json','mobile/app.json','tools/updates/stamp-android-build.cjs'];
try{
  for(const name of files){
    fs.mkdirSync(path.dirname(path.join(tmp,name)),{recursive:true});
    fs.copyFileSync(path.join(root,name),path.join(tmp,name));
  }
  const script=path.join(tmp,'tools/updates/stamp-android-build.cjs');
  const env={...process.env,GITHUB_RUN_NUMBER:'250'};
  const expected=cp.execFileSync(process.execPath,[script,'--print'],{env,encoding:'utf8'}).trim();
  const baseline=JSON.parse(fs.readFileSync(path.join(tmp,'package.json'),'utf8')).version;
  assert.equal(expected,baseline.split('.').slice(0,2).join('.')+'.1250');
  cp.execFileSync(process.execPath,[script],{env,stdio:'pipe'});
  const app=JSON.parse(fs.readFileSync(path.join(tmp,'mobile/app.json'),'utf8'));
  const mobile=JSON.parse(fs.readFileSync(path.join(tmp,'mobile/package.json'),'utf8'));
  const source=JSON.parse(fs.readFileSync(path.join(tmp,'package.json'),'utf8'));
  assert.equal(app.expo.version,expected);
  assert.equal(app.expo.android.versionCode,100250);
  assert.equal(mobile.version,expected);
  assert.equal(source.version,baseline,'source version must remain unmodified');
  assert.throws(()=>cp.execFileSync(process.execPath,[script],{env:{...process.env,GITHUB_RUN_NUMBER:'0'},stdio:'pipe'}));
  const workflow=fs.readFileSync(path.join(root,'.github/workflows/build-android.yml'),'utf8');
  assert(workflow.includes('node tools/updates/stamp-android-build.cjs'));
  assert(workflow.includes('node tools/updates/stamp-android-build.cjs --print'));
  assert(workflow.includes('DKDS_UI_BUNDLE_VERSION="$DKDS_RELEASE_VERSION"'));
  const hotWorkflow=fs.readFileSync(path.join(root,'.github/workflows/ui-hot-update.yml'),'utf8');
  assert(hotWorkflow.includes('DKDS_UI_BUNDLE_VERSION'));
  assert(hotWorkflow.includes('10000+Number(process.env.GITHUB_RUN_NUMBER)'));
  const native=fs.readFileSync(path.join(root,'mobile/plugins/DkdsAppUpdate.template'),'utf8');
  assert(native.includes('verifyDownloaded(apk,selected)'));
  assert(native.includes('!candidate.sha256.equals(found.sha256)'));
  console.log('DKDS Android version identity and APK update integrity PASS');
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
