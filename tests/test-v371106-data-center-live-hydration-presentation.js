'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const pkg=require('../package.json');
const atLeast=(actual,minimum)=>{const a=String(actual).split('.').map(Number),b=String(minimum).split('.').map(Number);for(let i=0;i<3;i++){if((a[i]||0)>(b[i]||0))return true;if((a[i]||0)<(b[i]||0))return false;}return true;};
assert(atLeast(pkg.version,'3.71.106'),'v3.71.106+ source required.');

const source=read('src/plugins/data-center/feature-runtime.js');
assert(source.includes("ctx.events.on('data:artifacts-changed',()=>{invalidateArtifactCaches();renderAllUi();})"),'Artifact changes must always synchronize the retained Data Center Unit tree; source-page visibility is not a data-lifecycle gate.');
assert(source.includes("ctx.events.on('layout:resize',()=>{dom.frame(()=>chartRuntime.resize());})"),'Layout resize must target the live presentation tree even when Presenter reparenting leaves the source page hidden.');
assert(source.includes("if(page&&(meta?.reason==='project-restore'||meta?.reason==='project-reset'||meta?.reason==='reset')){renderAllUi();"),'Project restore/reset must resynchronize the live Unit tree independent of source-page visibility.');
const artifactHandler=source.match(/ctx\.events\.on\('data:artifacts-changed',[^\n]+/i)?.[0]||'';
assert(!artifactHandler.includes("classList.contains('hidden')"),'Data lifecycle must not use the source page hidden class as Presentation visibility.');
console.log('v3.71.106 Data Center live hydration + Presenter reparent lifecycle PASS');
