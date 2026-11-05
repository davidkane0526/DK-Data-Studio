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
  // Do not let the temporary fixture append to the parent Actions GITHUB_ENV file.
  delete env.GITHUB_ENV;delete env.GITHUB_STEP_SUMMARY;
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
  const windows=fs.readFileSync(path.join(root,'.github/workflows/build-windows.yml'),'utf8');
  assert(windows.includes('node tools/updates/resolve-build-identity.cjs'));
  assert(windows.includes('dkds-windows-v$env:DKDS_RELEASE_VERSION-$env:DKDS_HOT_BUILD_ID'));
  assert(windows.includes('DK-Data-Studio-Portable-$env:DKDS_RELEASE_VERSION-$env:DKDS_HOT_BUILD_ID-x64.exe'));
  assert(windows.includes('V$env:DKDS_RELEASE_VERSION · $env:DKDS_HOT_BUILD_ID'));
  assert(!windows.includes('npm version $ciVersion'),'Windows CI must not rewrite the stable application version.');
  assert(windows.includes('gh release upload $tag $portableExe --clobber'),'Windows full installer release must be rerunnable for the same aNNNN build.');
  const hotWorkflow=fs.readFileSync(path.join(root,'.github/workflows/ui-hot-update.yml'),'utf8');
  assert(hotWorkflow.includes('DKDS_UI_APP_VERSION="$DKDS_RELEASE_VERSION"'));
  assert(hotWorkflow.includes('DKDS_UI_BUILD_ID="$DKDS_HOT_BUILD_ID"'));
  assert(hotWorkflow.includes('node tools/updates/validate-update-scope.cjs'));
  assert(!hotWorkflow.includes('10000+Number(process.env.GITHUB_RUN_NUMBER)'));
  assert(hotWorkflow.includes('DKDS UI Hot Update · V${DKDS_RELEASE_VERSION} · ${DKDS_HOT_BUILD_ID}'));
  assert(hotWorkflow.includes('gh release upload "$tag" dist/DKDS-UI-bundle.json --repo "$GITHUB_REPOSITORY" --clobber'));
  assert(workflow.includes('gh release upload "$tag" "$apk#$asset_name" "release-apk/DKDS-UI-bundle.json"'));
  assert(workflow.includes('--repo "$GITHUB_REPOSITORY" --clobber'));
  const desktopNative=fs.readFileSync(path.join(root,'desktop/native-update.js'),'utf8');
  assert(desktopNative.includes('dkds-windows-v(\\d+\\.\\d+\\.\\d+)-(a\\d{4,})'));
  assert(desktopNative.includes('DK-Data-Studio-Portable-(\\d+\\.\\d+\\.\\d+)-(a\\d{4,})-x64\\.exe'));
  const updateDialog=fs.readFileSync(path.join(root,'mobile/src/components/UpdateDialog.tsx'),'utf8');
  assert(!updateDialog.includes('Alert.alert'),'DKDS must not show a second confirmation dialog before invoking Android installer.');
  assert(!updateDialog.includes("import { Alert,"),'Alert must not be imported for the redundant install prompt.');
  assert(updateDialog.includes('nativeHost?.appUpdateInstall?.()'),'the install button must immediately start the verified native install flow.');
  const changelog=fs.readFileSync(path.join(root,'CHANGELOG.md'),'utf8');
  assert(changelog.includes('# 3.72.1 — Direct Android update installation'));
  assert.equal(JSON.parse(fs.readFileSync(path.join(root,'mobile/package.json'),'utf8')).version,'3.72.1');
  assert.equal(JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version,'3.72.1');
  const native=fs.readFileSync(path.join(root,'mobile/plugins/DkdsAppUpdate.template'),'utf8');
  assert(native.includes('dkds-android-v(\\\\d+\\\\.\\\\d+\\\\.\\\\d+)-(a\\\\d{4,})'));
  assert(native.includes('verifyDownloaded(apk,selected)'));
  assert(native.includes('!candidate.sha256.equals(found.sha256)'));
  console.log('DKDS Android stable versionName, monotonic versionCode and shared aNNNN identity PASS');
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
