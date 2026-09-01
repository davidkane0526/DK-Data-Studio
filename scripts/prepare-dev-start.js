"use strict";
const fs=require('fs');const path=require('path');const cp=require('child_process');
const root=path.resolve(__dirname,'..');
const groups=[
  {files:['src/generated/runtime/app.js','src/generated/runtime/ui-infrastructure.js','src/generated/runtime/plugin-kernel.js'],script:'generate-runtime-compositions.js'},
  {files:['src/generated/plugin-index.js'],script:'generate-plugin-index.js'},
  {files:['src/generated/sdk-authoring-reference.js'],script:'generate-sdk-authoring-reference.js'},
  {files:['assets/dkds-icon.png','mobile/assets/icon.png','mobile/assets/adaptive-icon.png'],script:'generate-brand-assets.js'}
];
let built=0;
for(const group of groups){
  if(group.files.every(rel=>fs.existsSync(path.join(root,rel))))continue;
  const result=cp.spawnSync(process.execPath,[path.join(root,'scripts',group.script)],{cwd:root,stdio:'inherit'});
  if(result.status!==0)process.exit(result.status||1);built++;
}
console.log(built?`DKDS dev-start prepared ${built} missing generated group(s).`:'DKDS dev-start: generated runtime is ready.');
