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
assert(workbench.includes("applyScrollPolicy(this.canvasSlots.left,'chain')")&&workbench.includes("applyScrollPolicy(this.canvasSlots.overlay,'contain')"),
  'Every registered workspace region must declare its scroll-chain or containment policy.');
assert(!workbench.includes("querySelectorAll('*')")&&!workbench.includes('installLayoutGuard'),
  'Normal Mobile layout must not reintroduce a full-subtree recovery scan.');

const structure=read('src/styles/structure/plugin-workspace.css');
const components=read('src/styles/structure/workbench-components.css');
assert(structure.includes('.dkds-plugin-canvas-frame[data-primary-scroll="safe"] .dkds-analysis-primary-host'),
  'Safe Primary remains a Core-owned local scroll region.');
assert(components.includes('[data-dkds-scroll-policy="chain"],[data-dkds-scroll-policy="viewport"]{overscroll-behavior-x:contain;overscroll-behavior-y:auto;}'),
  'The declared Core policy must preserve horizontal containment and vertical chaining across platforms.');

console.log('v3.68.64 native nested vertical scroll chaining PASS.');
