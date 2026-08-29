const assert=require('assert');
const fs=require('fs');
const os=require('os');
const path=require('path');
const {spawnSync}=require('child_process');

const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const pkg=JSON.parse(read('package.json'));
const mobilePkg=JSON.parse(read('mobile/package.json'));
const mobileApp=JSON.parse(read('mobile/app.json')).expo;
const generator=read('scripts/generate-brand-assets.js');
const sync=read('mobile/scripts/sync-web-assets.js');

{const [major,minor,patch]=pkg.version.split('.').map(Number);assert(major===3&&(minor>64||(minor===64&&patch>=2)),'Android brand-asset staging fix must remain on or beyond App v3.64.2');}
assert(/^0\.8\.(?:1[3-9]|[2-9]\d+)$/.test(mobilePkg.version),'Android build-pipeline changes must remain on or beyond mobile v0.8.13');
assert.strictEqual(mobileApp.version,mobilePkg.version,'Expo and mobile package versions must stay aligned');
assert(Number(mobileApp.android.versionCode)>=24,'Android build-pipeline release must remain at or beyond versionCode 24');
assert.strictEqual(mobileApp.icon,'./assets/icon.png','Expo launcher icon must remain a local mobile build asset');
assert.strictEqual(mobileApp.android.adaptiveIcon.foregroundImage,'./assets/adaptive-icon.png','Expo adaptive icon must remain a local mobile build asset');
assert(fs.existsSync(path.join(root,'assets','dkds-icon-source.png')),'authored brand source icon must remain in the clean repository');

assert(generator.includes('DKDS_MOBILE_ASSET_ROOT'),'brand generation must support an explicit mobile build-workspace target');
assert(generator.includes("path.join(mobileAssetRoot, 'assets', 'icon.png')")&&generator.includes("path.join(mobileAssetRoot, 'assets', 'adaptive-icon.png')"),'launcher assets must be written to the selected mobile target rather than hard-coded repository mobile/');
assert(sync.includes('DKDS_MOBILE_ASSET_ROOT: mobileRoot'),'sync:web must target brand generation at the current mobile workspace before Expo prebuild');

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-mobile-brand-'));
try{
  const result=spawnSync(process.execPath,[path.join(root,'scripts','generate-brand-assets.js')],{
    cwd:root,
    env:{...process.env,DKDS_MOBILE_ASSET_ROOT:temp},
    encoding:'utf8'
  });
  assert.strictEqual(result.status,0,`brand generator failed for isolated Android staging workspace: ${result.stderr||result.stdout}`);
  for(const name of ['icon.png','adaptive-icon.png']){
    const file=path.join(temp,'assets',name);
    assert(fs.existsSync(file),`isolated Android staging workspace is missing ${name}`);
    const bytes=fs.readFileSync(file);
    assert(bytes.length>1024,`${name} must contain a real launcher image`);
    assert(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),`${name} must be a PNG`);
  }
}finally{
  fs.rmSync(temp,{recursive:true,force:true});
}

console.log('v3.64.2 Android staging now materializes Expo launcher assets in the active build workspace.');
