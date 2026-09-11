'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const atLeast=(v,min)=>{const a=v.split('.').map(Number),b=min.split('.').map(Number);for(let i=0;i<3;i++){if(a[i]!==b[i])return a[i]>b[i];}return true;};
assert(atLeast(json('package.json').version,'3.68.53'));

// Import Workbench actions are not a special small-button family. The workbench
// explicitly requests the existing Core regular density instead of falling
// through the canonical-action generic fallback exclusion.
const actions=read('src/styles/structure/super-top-contract.css');
assert(actions.includes('[data-dkds-action-density="regular"] .dkds-action-button')&&actions.includes('min-height:var(--dkds-action-regular-height,32px)'),'Core regular action density must remain the only geometry owner.');
const index=read('src/index.html');
assert(index.includes('class="import-workbench dkds-material-role-elevated" data-dkds-material-context="workspace-modal" data-dkds-action-density="regular"'),'Import Workbench must explicitly request the Core regular action density.');
for(const id of ['importChooseFilesBtn','importCloseBtn','importCheckAllBtn','importInvertBtn','importUncheckAllBtn','importRemoveBtn'])assert(index.includes(`id="${id}"`)&&index.includes('dkds-action-button'),`${id} must remain a canonical Core action.`);

// Vth is a bounded workbench: the primary host is contained, the result table
// owns the explicit bottom height, and the plot consumes every remaining pixel.
const vth=read('src/plugins/transfer-vth-lab/plugin.js');
const vthCss=read('src/plugins/transfer-vth-lab/plugin.css');
assert(vth.includes("primaryScroll:'contained'")&&vth.includes("scroll:'contained'"),'Vth primary viewport must use the contained contract so 1fr has a definite height.');
assert(vthCss.includes('--dkds-vth-results-height:180px')&&vthCss.includes('grid-template-rows:minmax(0,1fr) 8px var(--dkds-vth-results-height)'),'Vth plot row must flex-fill above a bounded results row.');
assert(vth.includes("id:'vth-results-height-v2'")&&vth.includes("target:dom.query('[data-vth=\"results\"]',main)")&&vth.includes("reverse:true")&&vth.includes("cssVar:'--dkds-vth-results-height'"),'Vth splitter must resize the bottom results row rather than freezing plot height.');
assert(vth.includes("placements:['left'],stateVersion:'presentation-v3',chrome:false"),'Fixed-left Vth Data surface must not create redundant PortableView chrome.');
assert(vthCss.includes('.dkds-vth-card-head h3{margin:0}'),'Vth Data heading must align vertically with its titlebar actions/badge.');

// Fixed one-placement PortableViews must not insert an empty control group.
const portable=read('src/core/ui/modules/layout/portable-view.js');
assert(portable.includes('if(placementChoices.length>1){\n          controls=document.createElement'),'PortableView must only allocate placement controls when a real placement choice exists.');

// Shared floating resize affordance: no plugin fork, no hard-coded theme paint.
const handleStruct=read('src/styles/structure/sdk-semantic-surfaces.css');
const handlePaint=read('src/styles/presentation/plugin-chrome.css');
const shell=read('src/styles/presentation/shell.css');
assert(handleStruct.includes('clip-path:polygon(100% 0,100% 100%,0 100%)')&&handleStruct.includes('width:18px;height:18px')&&handleStruct.includes('width:15px;height:15px'),'Handle must retain the accepted 3.68.52 silhouette while allowing the current 18/15 edge-inner scale.');
assert(!shell.includes('--dkui-portable-corner-'),'Portable handle colors must be owned by active Theme component appearance, not shell-level literals/mixes.');
assert(!handlePaint.includes('backdrop-filter'),'Handle must remain flat and must not use backdrop blur.');
assert(!shell.includes('--dkui-portable-corner-fill:rgba(0,142,197'),'Old hard-coded cyan handle paint must stay retired.');

console.log('v3.68.53 desktop Vth/action/handle closure PASS.');
