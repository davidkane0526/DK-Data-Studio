#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const atLeast=(actual,minimum)=>{const a=String(actual).split('.').map(Number),b=String(minimum).split('.').map(Number);for(let i=0;i<3;i++){if((a[i]||0)>(b[i]||0))return true;if((a[i]||0)<(b[i]||0))return false;}return true;};
assert(atLeast(json('package.json').version,'3.68.12'),'v3.68.12+ source required.');

const projection=read('src/core/ui/modules/presentation/mobile-web-surface.js');
const nativeShell=read('src/styles/platform/native-client-shell.css');
const nativeWorkspace=read('src/styles/platform/native-workspace-presentation.css');
const resonanceMobile=read('src/plugins/resonance-workbench/mobile.css');
const resonanceUnits=read('src/plugins/resonance-workbench/unit-presentation.js');
const unitLayout=read('src/core/ui/modules/composition/unit-template-layout-spec.js');
const schema=read('src/styles/structure/schema-and-plugin-ui.css');
const analysis=read('src/styles/structure/analysis-workbench.css');
const desktopTouch=read('src/styles/platform/touch.css');

// 1) Parameters and Theme picker intentionally share the popover Material recipe.
assert(projection.includes("if(region==='drawer'&&text(purpose)==='parameters')return 'popover'"),'Parameter drawers must map to popover Material so Thin Glass matches the Theme picker.');
assert(projection.includes("if(region==='drawer'||region==='companion-right')return 'sidebar'"),'Other drawers must retain sidebar depth so Material hierarchy remains possible.');
assert(projection.includes('this.applyFrameMaterial(frame,region,purpose)'),'Initial projected frame paint must include presentation purpose.');
assert(projection.includes('this.applyFrameMaterial(saved.frame,region,purpose)'),'Reused projected frames must recompute Material from purpose.');

// Execute the real presenter method without a browser to prove the mapping is not
// merely a CSS comment or unreachable selector.
{
  const src=projection.replace(/const instance=new MobileWebSurfacePresenter\(\);[\s\S]*$/,'globalThis.__Presenter=MobileWebSurfacePresenter;');
  const context={globalThis:{},window:{},document:{documentElement:{dataset:{dkdsHost:'mobile'},classList:{contains:()=>true}}},require:id=>id==='ui/style-ownership-gate'?{set(){},remove(){}}:id.includes('platform-boundary')?{isMobileDocument:()=>true}:id.includes('native-touch-drag')?{bind:()=>()=>{}}:id.includes('mobile-web-projection-contract')?{PROJECTION_STYLE:[],styleValues:()=>({values:{},parameterDrawer:false}),releaseDetachObserver(){},installDetachObserver(){}}:id.includes('mobile-scientific-workspace-allocation')?{usesWorkspaceScientificAllocation:()=>false,syncWorkspaceScientificAllocation:()=>null}:id.includes('mobile-scientific-track-allocator')?{allocateScientificTracks:()=>({rightPx:0,bottomPx:0,primaryBlockPx:0,centerInlinePx:0})}:{} };context.globalThis=context;vm.createContext(context);vm.runInContext(src,context);
  const presenter=new context.__Presenter();
  assert.strictEqual(presenter.materialRoleForRegion('drawer','parameters'),'popover');
  assert.strictEqual(presenter.materialRoleForRegion('drawer','data'),'sidebar');
}

// 2) Compact semantic companions now flow after PRIMARY instead of becoming
// overlay sheets. User-requested side docks may still use bounded overlays, but
// semantic Inspector/Secondary surfaces must not cover the scientific canvas.
assert(nativeWorkspace.includes('grid-template-rows:minmax(0,1fr);'),'Portrait semantic companion composition must reserve a bounded PRIMARY row.');
assert(nativeWorkspace.includes('--dkds-mobile-right-seam:var(--dkds-canvas-resizer-track-size,7px)')&&nativeWorkspace.includes('--dkds-mobile-bottom-seam:var(--dkds-canvas-resizer-track-size,7px)'),'Portrait semantic companions must occupy flow rows after PRIMARY.');
assert(nativeWorkspace.includes('--dkds-mobile-right-seam:var(--dkds-canvas-resizer-track-size,7px)')&&nativeWorkspace.includes('--dkds-mobile-bottom-seam:var(--dkds-canvas-resizer-track-size,7px)'),'Companions must occupy disjoint right and bottom grid regions in both orientations.');
assert(nativeWorkspace.includes('--dkds-mobile-right-seam:var(--dkds-canvas-resizer-track-size,7px)')&&nativeWorkspace.includes('--dkds-mobile-bottom-seam:var(--dkds-canvas-resizer-track-size,7px)'),'Companions must occupy disjoint right and bottom grid regions in both orientations.');

// 3/5/7) Scientific floating chrome owns one outer height. Native touch density
// must not enlarge the children, and integrated toolbars may scroll horizontally
// without ever gaining a vertical scrollbar.
assert(nativeShell.includes('--dkds-scientific-nav-item-height:20.4px;--dkds-scientific-nav-group-height:23.4px'),'Native scientific floating item/group height contract must be 20.4 / 23.4 px.');
assert(nativeShell.includes('height:var(--dkds-scientific-nav-group-height);min-height:var(--dkds-scientific-nav-group-height);max-height:var(--dkds-scientific-nav-group-height)'),'Floating chrome must lock the outer silhouette, not only shrink its buttons.');
assert(nativeShell.includes('.dkds-surface-header .dkds-integrated-action-group{--dkds-header-action-height:26px;overflow-y:hidden}'),'Native integrated chart toolbar must use shared 26px action geometry and forbid vertical scroll.');
assert(desktopTouch.includes('--dkds-scientific-nav-item-width:22.176px;')&&desktopTouch.includes('--dkds-scientific-nav-item-height:25.2px;'),'Desktop scientific floating geometry must remain at the accepted 20% width-reduced 22.176 × 25.2 px contract.');

// Native touch minimum architecture: no catch-all raw min-height owner on every
// control. Generic and workbench controls consume bounded slots; compact semantic
// chrome remains under its own geometry owner.
assert(nativeShell.includes('--dkds-generic-button-min-height:var(--dkds-mobile-control-min-height,var(--dkds-touch-target,44px))'),'Coarse Native button minimum must feed the generic button slot.');
assert(nativeShell.includes('--dkds-generic-field-min-height:var(--dkds-mobile-control-min-height,var(--dkds-touch-target,44px))'),'Coarse Native field minimum must feed the generic field slot.');
assert(!nativeShell.includes('--dkds-command-height:var(--dkds-mobile-control-min-height'),'Native touch minimum must not become the inherited geometry owner of canonical command chrome.');
assert(nativeShell.includes('.dkds-pointer-coarse .dkds-analysis-workbench{\n  --dkds-workbench-button-min-height:var(--dkds-mobile-control-min-height,var(--dkds-touch-target,44px))'),'Coarse Native workbench controls must receive touch density through semantic slots.');
assert(!/dkds-pointer-coarse\s+button:not\([^\{]+\)\s*\{[^}]*min-height/s.test(nativeShell),'Native touch policy may not use an exclusion-list catch-all button min-height selector.');
assert(!/react-native-client\s+button:not\([^\{]+\)\s*\{[^}]*min-height/s.test(nativeShell),'Native base policy may not use a raw catch-all button min-height selector.');
assert(!nativeShell.includes('.main-plot-tools button{min-height:'),'Canonical main-plot integrated actions must never be enlarged by Native touch policy.');
assert(schema.includes('min-height:var(--dkds-generic-field-min-height,30px)'),'Generic fields must expose a platform density slot with the Desktop fallback unchanged.');
assert(schema.includes('min-height:var(--dkds-generic-button-min-height,30px)'),'Generic buttons must inherit the platform density slot and keep 30px only as a Desktop fallback.');
assert(!schema.includes('--dkds-generic-button-min-height:30px;'),'Generic button structure must not shadow the Native touch-density token on the button itself.');
assert(analysis.includes('--dkds-workbench-button-min-height:var(--plugin-control-height)')&&analysis.includes('min-height:var(--dkds-workbench-button-min-height)'),'Analysis workbench generic buttons must expose their own density slot.');

// 4) Resonance scan/detector command density is one public Unit recipe.
// Mobile CSS must not become a second action-grid owner.
assert((resonanceUnits.match(/variant:'action-grid-2'/g)||[]).length>=2&&resonanceUnits.includes("className:'respar-scan-global dkds-mode-group'")&&resonanceUnits.includes("className:'respar-detect-actions'"),'Scan and detector commands must both use the canonical action-grid-2 Unit recipe.');
assert(unitLayout.includes("'action-grid-2':Object.freeze({display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gapPx:5,minWidth:0})"),'Canonical action-grid-2 must preserve the compact two-column geometry.');
assert(!/\.respar-(?:scan-global|detect-actions)\s*\{[^}]*grid-template-columns/s.test(resonanceMobile),'Resonance Mobile CSS must not re-own canonical ActionGrid density.');

console.log('v3.68.12 Mobile portrait/material/scientific chrome + tokenized Native touch density closure PASS');
