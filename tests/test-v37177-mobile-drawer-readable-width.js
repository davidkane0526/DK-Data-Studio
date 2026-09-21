'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const Module=require('module');
const root=path.resolve(__dirname,'..');
process.env.NODE_PATH=[path.join(root,'src/core'),process.env.NODE_PATH||''].filter(Boolean).join(path.delimiter);Module._initPaths();

global.DKDSStyleGate={KINDS:{RUNTIME_INLINE:'runtime-inline',CONFIG_TOKEN:'configuration-token'},set(){},setToken(){},remove(){}};
global.window={innerWidth:744,addEventListener(){},removeEventListener(){}};global.innerWidth=744;
global.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
const {MobileWebSurfacePresenter}=require('../src/core/ui/modules/presentation/mobile-web-surface');
const {LAYOUT_RECIPES}=require('../src/core/ui/modules/composition/unit-template-layout-spec');
const {lastResortMaxWidth}=require('../src/core/ui/modules/composition/unit-template-layout');
const {publishUnitGeometryConstraint}=require('../src/core/ui/modules/composition/unit-geometry-constraints');
const presenter=new MobileWebSurfacePresenter();

assert.strictEqual(lastResortMaxWidth(LAYOUT_RECIPES['form-grid-2'],[]),310,'Canonical two-column form must publish its true last-resort threshold.');
assert.strictEqual(lastResortMaxWidth({},[{maxWidth:310,geometry:{'flex-direction':'column'}}]),310,'Plugin responsiveGeometry must feed the same intrinsic constraint source.');
assert(presenter.drawerStorageKey('data-control','ter:data-control').startsWith('dkds.mobile.drawer-width.v21.'),'v21 must invalidate widths saved before the current intrinsic-density/orientation contract.');

// Runtime evidence: the Presenter allocates the frame, while a nested Layout Unit
// reports the local width it needs. The canonical 6 px PRIME inset on each side is
// reflected in the Layout target width; Presenter does not invent another gutter.
let frameWidth=0;
const layout={nodeType:1,dataset:{},hidden:false,classList:{contains(){return false;}},style:{overflowX:''},scrollWidth:0,get clientWidth(){return Math.max(0,frameWidth-12);},getBoundingClientRect(){return {width:this.clientWidth};}};
publishUnitGeometryConstraint(layout,'inline','layout-density',()=>({kind:'avoid-last-resort',minInlinePx:311,target:layout,priority:'density'}));
const content={nodeType:1,dataset:{},hidden:false,classList:{contains(){return false;}},style:{overflowX:''},scrollWidth:0,get clientWidth(){return Math.max(0,frameWidth);},getBoundingClientRect(){return {width:this.clientWidth};},querySelectorAll(selector){if(selector.includes('data-dkds-unit-layout-recipe')||selector.includes('data-dkds-unit-geometry-inline'))return [layout];if(selector.includes('data-dkds-unit-template'))return [];return [];}};
const frame={children:[content],parentElement:{clientWidth:744},dataset:{},isConnected:true,getBoundingClientRect(){return {width:frameWidth};}};
presenter.setStyle=(node,prop,value)=>{if(node===frame&&prop==='width')frameWidth=Number.parseFloat(value)||0;return true;};
presenter.reflowMeasuredUnits=()=>{};
const solved=presenter.solveMinimumReasonableWidth(frame,'drawer');
assert.strictEqual(solved,323,`Two-column local minimum 311 + canonical PRIME 12 px total inset should resolve to 323 px, got ${solved}.`);
assert(solved<744*.6,'Constraint-derived Drawer must remain compact instead of using a viewport fraction target.');

// A plugin may provide a bounded PRIME content minimum, but that declaration is
// still a constraint; it does not write the Drawer width itself.
publishUnitGeometryConstraint(content,'inline','prime-content-min',()=>({kind:'prime-content-min',minInlinePx:381,target:content,priority:'hard'}));
frameWidth=0;
const withPrimeFloor=presenter.solveMinimumReasonableWidth(frame,'drawer');
assert.strictEqual(withPrimeFloor,381,'PRIME accepted content minimum must be consumed as one Surface constraint.');

const presenterSource=fs.readFileSync(path.join(root,'src/core/ui/modules/presentation/mobile-web-surface.js'),'utf8');
const layoutSource=fs.readFileSync(path.join(root,'src/core/ui/modules/composition/unit-template-layout.js'),'utf8');
const workspaceCss=fs.readFileSync(path.join(root,'src/styles/platform/native-workspace-presentation.css'),'utf8');
assert(!presenterSource.includes('twoColumnParameterContentFloorPx'),'Presenter must not know form-grid minimum geometry.');
assert(!presenterSource.includes('semanticDrawerWidth'),'Presenter must not scan plugin labels/buttons to invent minimum width.');
assert(!presenterSource.includes("LAYOUT_RECIPES"),'Presenter must not import Layout recipe identities.');
assert(presenterSource.includes('reflowUnitGeometry'),'Presenter must request Unit reflow through the shared geometry subsystem.');
assert(!presenterSource.includes('data-dkds-unit-layout-recipe'),'Presenter must not inspect Layout-private recipe markers.');
assert(!presenterSource.includes('__dkdsUnitLayoutReflow'),'Presenter must not call Layout-private reflow hooks.');
assert(!layoutSource.includes('singleFloor+1'),'Unit runtime must never fake a wider Drawer to suppress its own responsive state.');
assert(layoutSource.includes('responsiveRecipe(recipe,width)'),'Unit responsive state must consume the real allocated width.');
assert(/>\.dkds-mobile-drawer-scroll\{[^}]*padding:0[^}]*direction:ltr/.test(workspaceCss),'Drawer scroll viewport must not create a second outer content inset.');
assert(/\.dkds-analysis-main\{[^}]*overflow:hidden/.test(workspaceCss),'Mobile analysis-main must not become a second scroll owner/right-side gutter.');

console.log(`v3.71.84 Mobile geometry single-owner acceptance PASS: formFloor=311, solved=${solved}px, primeFloor=${withPrimeFloor}px.`);
