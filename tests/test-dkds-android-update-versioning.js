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
  const baseline=JSON.parse(fs.readFileSync(path.join(tmp,'package.json'),'utf8')).version;
  const expected=cp.execFileSync(process.execPath,[script,'--print'],{env,encoding:'utf8'}).trim();
  assert.equal(expected,baseline,'Android versionName must remain the stable app version');
  cp.execFileSync(process.execPath,[script],{env,stdio:'pipe'});
  const app=JSON.parse(fs.readFileSync(path.join(tmp,'mobile/app.json'),'utf8'));
  const mobile=JSON.parse(fs.readFileSync(path.join(tmp,'mobile/package.json'),'utf8'));
  const source=JSON.parse(fs.readFileSync(path.join(tmp,'package.json'),'utf8'));
  assert.equal(app.expo.version,baseline);
  assert.equal(app.expo.android.versionCode,100250,'versionCode remains monotonic and independent of versionName');
  assert.equal(mobile.version,baseline);
  assert.equal(source.version,baseline,'source version must remain unmodified by CI stamping');
  assert.throws(()=>cp.execFileSync(process.execPath,[script],{env:{...process.env,GITHUB_RUN_NUMBER:'0'},stdio:'pipe'}));

  const identity=JSON.parse(cp.execFileSync(process.execPath,[path.join(root,'tools/updates/resolve-build-identity.cjs'),'--print'],{encoding:'utf8'}));
  assert.equal(identity.appVersion,baseline);
  assert.match(identity.buildId,/^a\d{4,}$/);
  assert.equal(identity.label,'V'+baseline+' '+identity.buildId);

  const workflow=fs.readFileSync(path.join(root,'.github/workflows/build-android.yml'),'utf8');
  assert(workflow.includes('node tools/updates/resolve-build-identity.cjs'));
  assert(workflow.includes('node tools/updates/stamp-android-build.cjs'));
  assert(workflow.includes('DKDS_UI_APP_VERSION="$DKDS_RELEASE_VERSION" DKDS_UI_BUILD_ID="$DKDS_HOT_BUILD_ID"'));
  assert(workflow.includes('dkds-android-v${DKDS_RELEASE_VERSION}-${DKDS_HOT_BUILD_ID}'));
  const hotWorkflow=fs.readFileSync(path.join(root,'.github/workflows/ui-hot-update.yml'),'utf8');
  assert(hotWorkflow.includes('DKDS_UI_APP_VERSION="$DKDS_RELEASE_VERSION"'));
  assert(hotWorkflow.includes('DKDS_UI_BUILD_ID="$DKDS_HOT_BUILD_ID"'));
  assert(!hotWorkflow.includes('10000+Number(process.env.GITHUB_RUN_NUMBER)'));
  const native=fs.readFileSync(path.join(root,'mobile/plugins/DkdsAppUpdate.template'),'utf8');
  assert(native.includes('dkds-android-v(\\\\d+\\\\.\\\\d+\\\\.\\\\d+)-(a\\\\d{4,})'));
  assert(native.includes('verifyDownloaded(apk,selected)'));
  assert(native.includes('!candidate.sha256.equals(found.sha256)'));
  console.log('DKDS Android stable versionName, monotonic versionCode and shared aNNNN identity PASS');
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
