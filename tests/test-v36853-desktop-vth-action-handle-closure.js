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
const vthUnit=read('src/plugins/transfer-vth-lab/unit-presentation.js');
const vthManifest=json('src/plugins/transfer-vth-lab/plugin.json');
assert(vthUnit.includes("primaryScroll:'contained'")&&vthUnit.includes("scroll:'contained'"),'Vth Unit primary viewport must use the contained contract so the fill rows have a definite height.');
assert(vthUnit.includes("variant:'fill-rows'")&&vthUnit.includes("sizing:'fill'"),'Vth Unit plot row must flex-fill above the bounded results row.');
assert(vthUnit.includes("id:'vth-results-height-v3'")&&vthUnit.includes("resizeTarget:'second'")&&vthUnit.includes('defaultSize:180')&&vthUnit.includes('min:140')&&vthUnit.includes('reserve:300'),'Vth Unit SplitPane must resize the bottom results row rather than freezing plot height.');
assert(vthUnit.includes("variant:'fixed-titleless'")&&vthUnit.includes("placements:['left']")&&vthUnit.includes('header:false'),'Fixed-left Vth Data surface must remain titleless and must not create redundant PortableView chrome.');
assert.deepStrictEqual(vthManifest.styles,[],'Retired Vth private presentation CSS must no longer be loaded after production Unit cutover.');
assert(vth.includes("ctx.modules.require('unit-presentation')"),'Vth production controller must delegate composition to the Unit presentation.');

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
