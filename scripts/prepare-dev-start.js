"use strict";
const fs=require('fs');const path=require('path');const cp=require('child_process');
const root=path.resolve(__dirname,'..');
const {buildCompositionSource}=require('./generate-runtime-compositions');
const {buildPluginIndexSource}=require('./generate-plugin-index');

function fileMatches(rel,expected){
  const file=path.join(root,rel);
  if(!fs.existsSync(file)||!fs.statSync(file).isFile())return false;
  return fs.readFileSync(file,'utf8')===expected;
}
function run(script){
  const result=cp.spawnSync(process.execPath,[path.join(root,'scripts',script)],{cwd:root,stdio:'inherit'});
  if(result.status!==0)process.exit(result.status||1);
}

let built=0;
// A clean source archive deliberately omits generated runtime. An overlay update
// can also leave generated files from the previous source snapshot on disk.
// Reusing merely-existing files is therefore unsafe: the renderer may combine a
// new index.html/package version with an old plugin catalog/runtime. Compare the
// generated source to the declared current graph and rebuild only on mismatch.
const runtimeCompositions=['src/core/ui/composition','src/core/plugins/kernel','src/app'];
const runtimeCurrent=runtimeCompositions.every(rel=>{
  const expected=buildCompositionSource(rel);
  return fileMatches(expected.output,expected.source);
});
if(!runtimeCurrent){run('generate-runtime-compositions.js');built++;}

const pluginIndex=buildPluginIndexSource();
if(!fileMatches('src/generated/plugin-index.js',pluginIndex.source)){run('generate-plugin-index.js');built++;}

const missingGroups=[
  {files:['src/generated/sdk-authoring-reference.js','src/generated/dkds-sdk-export.zip'],script:'generate-sdk-authoring-reference.js'},
  {files:['assets/dkds-icon.png','mobile/assets/icon.png','mobile/assets/adaptive-icon.png'],script:'generate-brand-assets.js'}
];
for(const group of missingGroups){
  if(group.files.every(rel=>fs.existsSync(path.join(root,rel))))continue;
  run(group.script);built++;
}
console.log(built?`DKDS dev-start rebuilt ${built} missing/stale generated group(s).`:'DKDS dev-start: generated artifacts match current source.');
