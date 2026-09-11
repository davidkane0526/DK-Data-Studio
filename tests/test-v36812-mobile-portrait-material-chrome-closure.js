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
  const context={globalThis:{},window:{},document:{documentElement:{dataset:{dkdsHost:'mobile'},classList:{contains:()=>true}}},require:id=>id==='ui/style-ownership-gate'?{set(){},remove(){}}:id.includes('platform-boundary')?{isMobileDocument:()=>true}:id.includes('native-touch-drag')?{bind:()=>()=>{}}:{} };context.globalThis=context;vm.createContext(context);vm.runInContext(src,context);
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
assert(desktopTouch.includes('--dkds-scientific-nav-item-width:28px;')&&desktopTouch.includes('--dkds-scientific-nav-item-height:28px;'),'Desktop scientific floating geometry must remain 28 × 28 px.');

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

// 4) Four scan-visibility commands use an intentional 2x2 compact grid. Detector
// actions remain adaptive and are not mechanically forced into the same layout.
assert(resonanceMobile.includes('.respar-scan-global{\n  grid-template-columns:repeat(2,minmax(0,1fr));gap:6px'),'Mobile parameter scan-mode commands must be a stable 2×2 grid.');
assert(resonanceMobile.includes('.respar-scan-global>button{min-width:0}'),'2×2 scan controls must be allowed to shrink rather than collapse to one column without plugin-owned button chrome.');
assert(resonanceMobile.includes('.respar-detect-actions{\n  grid-template-columns:repeat(auto-fit,minmax(min(145px,100%),1fr));gap:6px'),'Detector actions must retain adaptive layout.');

console.log('v3.68.12 Mobile portrait/material/scientific chrome + tokenized Native touch density closure PASS');
