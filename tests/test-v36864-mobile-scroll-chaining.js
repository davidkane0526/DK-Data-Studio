'use strict';
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const assert=(cond,msg)=>{if(!cond)throw new Error(msg);};

const pkg=JSON.parse(read('package.json'));
const versionAtLeast=(actual,required)=>{const a=String(actual).split('.').map(Number),b=String(required).split('.').map(Number);for(let i=0;i<Math.max(a.length,b.length);i++){const d=(a[i]||0)-(b[i]||0);if(d)return d>0;}return true;};
assert(versionAtLeast(pkg.version,'3.68.64'),'App version must remain at or above 3.68.64.');

const native=read('src/styles/platform/native-workspace-presentation.css');
for(const token of [
  ':where(.dkds-analysis-main,.dkds-plugin-canvas-center,.dkds-analysis-primary-host,.dkds-plugin-sub-page-host',
  '.dkds-table-surface-host,.analysis-table-wrap,.table-wrap,.table-scroll,.data-table-scroll,.dkds-table-wrap)',
  '{overscroll-behavior-y:auto;}'
]) assert(native.includes(token),`Mobile vertical scroll-chain contract missing ${token}`);

// Transient overlays must remain isolated from the workspace behind them.
assert(native.includes('[data-dkds-mobile-frame-region="drawer"]>[data-dkds-mobile-region="drawer"]')&&native.includes('overscroll-behavior:contain'),
  'Parameter drawers must retain local overscroll containment.');

const workbench=read('src/core/ui/modules/workbench/plugin.js');
assert(workbench.includes("safetySet(el,'overscroll-behavior-y','auto')"),
  'Layout recovery must preserve vertical chaining instead of trapping Mobile touch scroll.');
assert(!workbench.includes("mobileHost?'contain':'auto'"),
  'Mobile layout recovery must not reintroduce vertical containment.');

const structure=read('src/styles/structure/plugin-workspace.css');
assert(structure.includes('.dkds-plugin-canvas-frame[data-primary-scroll="safe"] .dkds-analysis-primary-host'),
  'Safe Primary remains a Core-owned local scroll region.');
assert(structure.includes('overscroll-behavior:contain'),
  'Base Desktop-neutral safe policy may remain contained; the higher platform layer must explicitly opt Mobile into chaining.');

console.log('v3.68.64 native nested vertical scroll chaining PASS.');
