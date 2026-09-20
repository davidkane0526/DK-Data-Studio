#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const {validate:validateStyleOwnership}=require('./style-ownership');
const {validate:validateSemanticStyleOwnership}=require('./semantic-style-ownership');
const {validate:validateStyleOwnershipGate}=require('./style-ownership-gate');
const {validate:validateReachability}=require('./reachability-audit');
const {validate:validateRuntimeStyleWrites}=require('./runtime-style-write-audit');
const {validate:validateCurrentContract}=require('./current-contract-audit');
const ROOT=path.resolve(__dirname,'../..');
const issues=[];

function walk(dir,predicate,out=[]){if(!fs.existsSync(dir))return out;for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p,predicate,out);else if(e.isFile()&&predicate(p))out.push(p);}return out;}
function rel(file){return path.relative(ROOT,file).replace(/\\/g,'/');}
try{validateStyleOwnership();}catch(error){issues.push(error.message);}
let semanticStyle=null;
try{semanticStyle=validateSemanticStyleOwnership();}catch(error){issues.push(error.message);}
let styleGate=null;
try{styleGate=validateStyleOwnershipGate();}catch(error){issues.push(error.message);}
let reachability=null;
try{reachability=validateReachability();}catch(error){issues.push(error.message);}
let runtimeStyleWrites=null;
try{runtimeStyleWrites=validateRuntimeStyleWrites();}catch(error){issues.push(error.message);}
let currentContract=null;
try{currentContract=validateCurrentContract();}catch(error){issues.push(error.message);}

const coreFiles=[...walk(path.join(ROOT,'src','core'),p=>/\.(?:js|inc|css)$/.test(p)),...walk(path.join(ROOT,'src','styles'),p=>p.endsWith('.css'))];
const forbidden=[/com\.dkds\.resonance-workbench/i,/builtin\.resonance-workbench/i,/\.respar-/i,/\.reswin-/i,/com\.dkds\.ter-analysis/i,/builtin\.ter-analysis/i,/com\.dkds\.pulse-analysis/i,/builtin\.pulse-analysis/i,/com\.dkds\.data-center/i,/builtin\.data-center/i,/com\.dkds\.transfer-vth-lab/i,/com\.dkds\.tools\.pulse-sampler/i];
for(const file of coreFiles){const text=fs.readFileSync(file,'utf8');for(const token of forbidden)if(token.test(text)){issues.push(`${rel(file)}: Core contains native-analysis plugin identity ${token}.`);break;}}

for(const file of walk(path.join(ROOT,'src','core'),p=>/\.(?:js|inc)$/.test(p))){
  if(rel(file)==='src/core/ui/dom-mutation-hub.js')continue;
  const text=fs.readFileSync(file,'utf8');
  if(/new\s+MutationObserver[\s\S]{0,900}?\.observe\(\s*(?:document\s*[,)]|document\.(?:documentElement|body)\b)/m.test(text))issues.push(`${rel(file)}: document-wide MutationObserver must subscribe through DKDSDOMMutationHub.`);
}

for(const file of walk(path.join(ROOT,'src'),p=>p.endsWith('.css'))){const text=fs.readFileSync(file,'utf8');if(/!important\b/i.test(text))issues.push(`${rel(file)}: !important is forbidden.`);}

const sharedFrameConsumers=['src/core/theme/semantic-registry.js','src/core/theme/material-renderer.js','src/core/theme/component-appearance.js'];
for(const fileRel of sharedFrameConsumers){const text=fs.readFileSync(path.join(ROOT,fileRel),'utf8');if(/requestAnimationFrame|cancelAnimationFrame/.test(text))issues.push(`${fileRel}: shared Theme invalidation must use DKDSFrameScheduler.`);if(!text.includes('DKDSFrameScheduler'))issues.push(`${fileRel}: shared Theme invalidation is missing DKDSFrameScheduler.`);}

const motionOwner='src/styles/motion/recipes.css';
for(const file of walk(path.join(ROOT,'src'),p=>p.endsWith('.css'))){
  const fileRel=rel(file);if(fileRel===motionOwner)continue;
  const text=fs.readFileSync(file,'utf8');
  if(/(?:^|[;{])\s*(?:transition(?:-[a-z-]+)?|animation(?:-[a-z-]+)?)\s*:/mi.test(text)||/@keyframes\b/i.test(text))issues.push(`${fileRel}: temporal behavior must be owned by ${motionOwner}.`);
}

if(issues.length){console.error(`Architecture hygiene FAILED (${issues.length})\n${issues.join('\n')}`);process.exit(1);}
const style=validateStyleOwnership();
console.log(`Architecture hygiene PASS: style collisions=${style.collisions.length}, semantic owner violations=${semanticStyle?.violations?.length||0}, style gate violations=${styleGate?.violations?.length||0}, first-party runtime-style bypasses=${runtimeStyleWrites?.violations?.length||0}, document observer leaks=0, Core native-plugin identity leaks=0, !important=0, motion owner leaks=0, shared Theme frame-owner leaks=0, dead-function candidates=${reachability?.highConfidence?.length||0}, obsolete compatibility layers=${currentContract?.obsoleteCompatibilityLayers||0}.`);
