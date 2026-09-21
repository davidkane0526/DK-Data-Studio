'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const Module=require('module');
const root=path.resolve(__dirname,'..');
process.env.NODE_PATH=[path.join(root,'src/core'),process.env.NODE_PATH||''].filter(Boolean).join(path.delimiter);Module._initPaths();
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const atLeast=(actual,minimum)=>{const a=String(actual||'0.0.0').split('.').map(Number),b=String(minimum||'0.0.0').split('.').map(Number);for(let i=0;i<3;i++){if((a[i]||0)>(b[i]||0))return true;if((a[i]||0)<(b[i]||0))return false;}return true;};

global.DKDSStyleGate={KINDS:{RUNTIME_INLINE:'runtime-inline',CONFIG_TOKEN:'configuration-token'},set(){},setToken(){},remove(){}};
global.window={innerWidth:744,addEventListener(){},removeEventListener(){}};global.innerWidth=744;
global.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
const {MobileWebSurfacePresenter}=require('../src/core/ui/modules/presentation/mobile-web-surface');
const {intentionalHorizontalScroll,resolveInlineConstraintDeficit}=require('../src/core/ui/modules/composition/unit-geometry-constraints');
const presenter=new MobileWebSurfacePresenter();

assert(/^3\.71\.(?:9[1-9]|[1-9]\d{2,})$/.test(json('package.json').version),'Current source must retain the v3.71.91+ parameter Surface contract.');
assert.strictEqual(json('mobile/app.json').expo.version,json('package.json').version);
assert(Number(json('mobile/app.json').expo.android.versionCode)>=231);
assert(/^1\.51\.(?:3[8-9]|[4-9]\d|\d{3,})$/.test(json('sdk/contract.json').sdkVersion));
assert(/^2\.5\.(?:3[4-9]|[4-9]\d|\d{3,})$/.test(require('../src/core/ui/modules/composition/unit-template-spec').UNIT_TEMPLATE_SPEC_VERSION));
assert(presenter.drawerStorageKey('parameters','a').startsWith('dkds.mobile.drawer-width.v21.'),'Top-layer/intrinsic Surface contract must use the current persisted-width generation.');
const frameFloor={parentElement:{clientWidth:744}};
assert.strictEqual(presenter.surfaceReasonableFloor(frameFloor,'drawer'),presenter.semanticSearchFloorPx(),'Drawer probing must start from the canonical control footprint rather than a viewport percentage.');
assert(presenter.surfaceReasonableFloor(frameFloor,'drawer')<186,'The retired 25% viewport hard floor must not return.');

// Parameter Legend is a width follower. Even severe legend scrollWidth must not
// increase the Drawer intrinsic-width deficit.
const parameterAncestor={};
const legend={
  nodeType:1,dataset:{},hidden:false,classList:{contains(){return false;}},style:{overflowX:''},
  clientWidth:180,scrollWidth:720,getBoundingClientRect(){return {width:180}},
  matches(sel){return sel.includes('legend-v2');},closest(sel){return sel.includes('presentation-purpose')?parameterAncestor:null;},querySelectorAll(){return []}
};
assert.strictEqual(intentionalHorizontalScroll(legend),true,'Parameter Legend must be intentional horizontal overflow rather than a Drawer width owner.');
const legendDeficit=resolveInlineConstraintDeficit(legend);
assert.strictEqual(legendDeficit.overflowDeficitPx,0,'Parameter Legend overflow must never widen the Drawer.');

// Ordinary horizontal Unit content still contributes its real intrinsic width.
const actionRow={
  nodeType:1,dataset:{},hidden:false,classList:{contains(){return false;}},style:{overflowX:''},
  clientWidth:186,scrollWidth:224,getBoundingClientRect(){return {width:186}},
  matches(){return false;},closest(){return null;},querySelectorAll(){return []}
};
assert.strictEqual(resolveInlineConstraintDeficit(actionRow).overflowDeficitPx,38,'Ordinary Unit overflow must raise the Drawer by its real deficit, without a magic 260/310 px target.');

// Parameter Drawer is a top-layer overlay. Companion surfaces no longer reserve
// or consume Drawer width; Drawer sizing remains an independent overlay contract.
const drawer={parentElement:{clientWidth:744},dataset:{},style:{}};
assert.strictEqual(presenter.surfaceAvailableWidth(drawer,'drawer'),732);

const presenterSource=read('src/core/ui/modules/presentation/mobile-web-surface.js');
const projectionSource=read('src/core/ui/modules/presentation/mobile-web-projection-contract.js');
const constraints=read('src/core/ui/modules/composition/unit-geometry-constraints.js');
const css=read('src/styles/platform/native-workspace-presentation.css');
const pulse=read('src/plugins/pulse-analysis/unit-presentation.js');
const resonance=read('src/plugins/resonance-workbench/unit-presentation.js');
const resonanceCss=read('src/plugins/resonance-workbench/plugin.css');
assert(presenterSource.includes('semanticSearchFloorPx()')&&!presenterSource.includes('viewportInlineSize()*0.25')&&!presenterSource.includes('--dkds-mobile-drawer-occupied'),'Presenter must probe from the canonical control footprint with no retired viewport-percentage hard floor or Drawer/companion coupling.');
assert(constraints.includes('parameterLegend')&&constraints.includes('legend-v2'),'Geometry resolver must explicitly treat parameter Legend as a width follower.');
assert(css.includes('overflow-y:auto')&&css.includes('scrollbar-width:none')&&css.includes('>.dkds-mobile-drawer-scroll::-webkit-scrollbar{display:none;width:0;height:0}'),'Drawer must retain vertical gesture scrolling while hiding the overall right scrollbar.');
assert(css.includes('[data-dkds-presentation-purpose="parameters"]>.dkds-mobile-drawer-scroll>.dkds-mobile-drawer-content{display:grid;grid-template-rows:minmax(0,1fr) auto;height:100%;min-height:100%'),'Parameter Drawer content must own a viewport-fill first track plus terminal safe row.');
assert(projectionSource.includes("Object.assign(values,{height:'100%',padding:'0px'"),'Projected parameter PRIME must fill the live Drawer viewport so its fill-rows descendants can consume remaining height.');
assert(css.includes('dkds-mobile-drawer-safe-end')&&presenterSource.includes('syncDrawerSafeExtent(frame)'),'Bottom breathing room must remain after live overflow at the final Drawer clipping boundary.');
assert(/\.dkds-mobile-drawer-resize-handle\{[^}]*right:-6px/.test(css),'12 px Drawer handle must straddle the edge rather than cover the parameter content.');
assert(css.includes('grid-template-rows:repeat(3,max-content)')&&css.includes('[data-dkds-unit-template="legend-v2"]::-webkit-scrollbar{display:none'),'Parameter Legend must cap horizontal layout at three rows and hide horizontal scrollbar chrome.');
assert(!css.includes('margin-inline-start:var(--dkds-mobile-drawer-occupied'),'Bottom companion must remain full-width beneath the overlay Drawer.');
assert(css.includes('--dkds-mobile-right-track:var(--dkds-plugin-canvas-right-width,34%)'),'Right companion must ignore overlay Drawer width and consume only its workspace SplitController preference within the viewport bound.');
assert(pulse.includes("variant:'file-toolbar',className:'pulse-file-toolbar dkds-toolbar'")&&!pulse.includes("maxWidth:310,geometry:{flexDirection:'column'"),'Pulse toolbar must not own a 310 px Drawer breakpoint.');
assert(pulse.includes("variant:'form-grid-2',className:'pulse-control-grid'")&&!pulse.includes("maxWidth:310,geometry:{flexDirection:'column'"),'Pulse form density must be owned by the canonical Unit recipe rather than private plugin responsive geometry.');
assert(!resonance.includes('minContentInlinePx:361')&&!resonance.includes('dkdsMobileWidthCritical'),'Resonance must not own a private parameter width floor/critical marker.');
assert(!/\.respar-peak-legend\{[^}]*display:flex/.test(resonanceCss),'Resonance private CSS must not own parameter Legend flow.');
assert(atLeast(json('src/plugins/pulse-analysis/plugin.json').version,'2.12.12'),'Pulse Analysis must remain at or above the accepted Unit-density contract version.');
assert(/^3\.63\.(?:8|9|[1-9]\d+)$/.test(json('src/plugins/resonance-workbench/plugin.json').version));

console.log('v3.71.88+ Mobile parameter Surface regression PASS under current intrinsic-density contract: canonical control floor, width-following legends, Unit-owned Pulse density, no companion coupling.');
