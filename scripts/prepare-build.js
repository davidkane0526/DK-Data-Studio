'use strict';
const fs=require('fs');
const path=require('path');
const {spawnSync}=require('child_process');

const root=path.resolve(__dirname,'..');
const outPath=path.join(root,'build-info.json');
const builtAtMs=Date.now();
const durationDays=30;
const info={
  schema:1,
  buildType:'packaged-trial',
  durationDays,
  builtAtMs,
  expiresAtMs:builtAtMs+durationDays*24*60*60*1000
};
info.builtAt=new Date(info.builtAtMs).toISOString();
info.expiresAt=new Date(info.expiresAtMs).toISOString();
fs.writeFileSync(outPath,JSON.stringify(info,null,2)+'\n','utf8');
console.log(`Build preparation complete: ${durationDays}-day packaged metadata ${info.builtAt} -> ${info.expiresAt}.`);

if(process.argv.includes('--windows-package')){
  // Packaging is intentionally not a normal desktop development dependency.
  // Ordinary dependency repair needs Electron itself but not the much larger
  // signing/notarization/builder toolchain. Fetch the exact current builder
  // only when a Windows distribution is actually requested.
  const ELECTRON_BUILDER_VERSION='26.15.7';
  const command=process.platform==='win32'?'npx.cmd':'npx';
  const args=[
    '--yes',
    `--package=electron-builder@${ELECTRON_BUILDER_VERSION}`,
    'electron-builder',
    '--win','nsis','portable','--publish','never'
  ];
  console.log(`Packaging with electron-builder ${ELECTRON_BUILDER_VERSION} (on-demand toolchain).`);
  const result=spawnSync(command,args,{cwd:root,env:process.env,stdio:'inherit',shell:false});
  if(result.error){
    console.error(result.error.message||String(result.error));
    process.exit(1);
  }
  process.exit(Number.isInteger(result.status)?result.status:1);
}
