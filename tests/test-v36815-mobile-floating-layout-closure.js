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

assert(atLeast(json('package.json').version,'3.68.15'),'v3.68.15+ source required.');
assert(atLeast(json('mobile/package.json').version,'0.8.42'),'v3.68.15 Mobile package must be >= 0.8.42.');
assert(Number(json('mobile/app.json').expo?.android?.versionCode)>=53,'v3.68.15 Android versionCode must be >= 53.');

const metrics=read('src/styles/structure/metrics.css');
const themeSurfaces=read('src/styles/structure/sdk-semantic-surfaces.css');
const memoryCss=read('src/styles/structure/schema-and-plugin-ui.css');
const nativeShell=read('src/styles/platform/native-client-shell.css');
const connectivity=read('src/plugins/connectivity-center/plugin.css');
const mobileWorkspace=read('src/styles/platform/native-workspace-presentation.css');
const presenterSource=read('src/core/ui/modules/presentation/mobile-web-surface.js');
const portableSource=read('src/core/ui/modules/layout/portable-view.js');
const dcMobile=read('src/plugins/data-center/mobile.css');
const dcViews=read('src/plugins/data-center/shared-views.js');
const pluginManager=read('src/styles/platform/native-client-shell.css');
const pulseSampler=read('src/plugins/pulse-sampler-tool/plugin.js');
const pulseSamplerMobile=read('src/plugins/pulse-sampler-tool/mobile.css');
const themeLayout=read('src/plugins/status-monitor/theme-layout.js');
const appFoundation=read('src/app/modules/foundation.js');
const terCss=read('src/plugins/ter-analysis/plugin.css');

// 1/2) One status-popover gap contract for Theme/Memory/LAN/AI.
assert(metrics.includes('--dkds-status-popover-gap:8px'),'Core metrics must publish one status-popover gap token.');
assert(themeSurfaces.includes('bottom:calc(var(--dkds-statusbar-height,28px) + var(--dkds-status-popover-gap,8px))'),'Theme panel must consume the shared status-popover gap.');
assert(memoryCss.includes('bottom:calc(var(--dkds-statusbar-height,28px) + 8px)')||memoryCss.includes('bottom:calc(var(--dkds-statusbar-height,28px) + var(--dkds-status-popover-gap,8px))'),'Memory panel must remain on the same 8px baseline.');
assert(nativeShell.includes('.lan-web-panel{\n  top:auto;')&&nativeShell.includes('bottom:var(--dkds-status-popover-gap,8px);'),'Native LAN panel must anchor to the shared bottom gap.');
assert(connectivity.includes('bottom:var(--dkds-status-popover-gap,8px)'),'Native AI chat must anchor to the shared bottom gap.');
assert(appFoundation.includes("panel.classList?.contains('lan-web-panel')")&&appFoundation.includes("bottom:'var(--dkds-status-popover-gap,8px)'"),'Native LAN runtime must clear stale Desktop top geometry and re-anchor to the shared bottom gap.');
{
  const ctx={globalThis:null};ctx.globalThis=ctx;vm.createContext(ctx);vm.runInContext(themeLayout,ctx);
  const patches=[],panel={classList:{contains:()=>false},getBoundingClientRect:()=>({width:300,height:200})};
  const viewport={innerWidth:1200,innerHeight:800,document:{documentElement:{}},getComputedStyle:()=>({getPropertyValue:key=>key==='--dkds-status-popover-gap'?'8px':''})};
  ctx.DKDSStatusMonitorThemeLayout.positionThemePanel({dom:{style(_el,patch){patches.push(patch);}},panel,anchor:{x:900,top:760},viewport});
  assert.strictEqual(patches.at(-1).bottom,'48px','Theme anchor must sit exactly 8px above a statusbar whose top is y=760 in an 800px viewport.');
}

// 3) Compact semantic companions flow below a bounded PRIMARY scientific row.
assert(mobileWorkspace.includes('grid-template-rows:minmax(0,1fr);'),'Portrait scientific PRIMARY must be bounded before companion rows.');
assert(mobileWorkspace.includes('--dkds-mobile-right-seam:var(--dkds-canvas-resizer-track-size,7px)')&&mobileWorkspace.includes('--dkds-mobile-bottom-seam:var(--dkds-canvas-resizer-track-size,7px)'),'Inspector and secondary scientific surfaces must occupy flow rows.');
assert(mobileWorkspace.includes('--dkds-mobile-right-seam:var(--dkds-canvas-resizer-track-size,7px)')&&mobileWorkspace.includes('--dkds-mobile-bottom-seam:var(--dkds-canvas-resizer-track-size,7px)'),'Companions must occupy disjoint right and bottom grid regions in both orientations.');

// 4/6) Data Center chart controls are one adaptive row; X/Y consume equal visible field height.
assert(dcViews.includes('id="dcChartParams" class="dc-chart-params"'),'Data Center chart options need a plugin-owned layout scope.');
assert(nativeShell.includes('var(--dkds-parameter-auto-fit-native-columns,repeat(auto-fit,minmax(150px,220px)))'),'Core native ParameterSchema must expose a configurable auto-fit column token while retaining rendered-property ownership.');
assert(dcMobile.includes('--dkds-parameter-auto-fit-native-columns:repeat(4,minmax(0,1fr))'),'X/Y/mode/legend controls must request four equal tracks through the Core configuration token.');
assert(dcMobile.includes('--dkds-field-control-min-height:28px')&&dcMobile.includes('height:28px;min-height:28px'),'X/Y/mode visible controls must share one exact compact height.');
assert(dcMobile.includes('--dc-main-areas:"source" "tool" "chart"'),'Narrow Data Center must keep formula/derived tools before Generic Chart.');
assert(dcMobile.includes('.dc-chart-pane.dkds-portable-view:is(.is-floating,.is-global-floating)')&&dcMobile.includes('grid-template-rows:auto auto minmax(0,1fr)'),'Moved Generic Chart must reserve a flexing plot row instead of letting controls displace the graph.');

// 5) Portrait Plugin Manager cards are content-sized, not stretched viewport rows.
assert(pluginManager.includes('grid-auto-rows:max-content')&&pluginManager.includes('.plugin-manager-card{height:max-content;min-height:0;align-self:start}'),'Native Plugin Manager cards must be content-height rows.');

// 6/9/10) Only real floats retain corner resize; bottom uses the canvas lane.
assert(!portableSource.includes('is-mobile-bottom-shelf'),'Mobile bottom placement must not regress to a viewport shelf.');
assert(!mobileWorkspace.includes('.dkds-mobile-scroll-reserved'),'Bottom docking must not leave a phantom scroll reserve.');
assert(mobileWorkspace.includes('.has-canvas-bottom')&&mobileWorkspace.includes('var(--dkds-plugin-canvas-bottom-height)'),'Native bottom placement must consume the real resizable canvas lane.');
assert(mobileWorkspace.includes('.dkds-portable-view.dkds-plot-view:not(.is-floating):not(.is-global-floating)>.dkds-portable-resize-handle{display:none}'),'Only true floats may expose the corner resize handle.');
assert(mobileWorkspace.includes('--dkds-portable-floating-min-height:clamp(240px,32vh,340px)'),'Global floating scientific plots must not default to a flattened viewport.');

// 7) The Mobile Presenter must immediately release an obsolete companion frame
// after a PortableView floats away; otherwise the empty frame intercepts touch.
assert(presenterSource.includes('releasePortable:node=>'),'Mobile Presenter must export immediate portable-frame release.');
{
  const source=presenterSource.replace(/const instance=new MobileWebSurfacePresenter\(\);[\s\S]*$/,'globalThis.__Presenter=MobileWebSurfacePresenter;');
  const context={globalThis:{},window:{},document:{documentElement:{dataset:{dkdsHost:'mobile'},classList:{contains:()=>true}}},require:id=>id==='ui/style-ownership-gate'?{set(){},remove(){}}:id.includes('platform-boundary')?{isMobileDocument:()=>true}:id.includes('native-touch-drag')?{bind:()=>()=>{}}:{}};context.globalThis=context;vm.createContext(context);vm.runInContext(source,context);
  const presenter=new context.__Presenter();
  let reparented=0,removed=0;
  const node={dataset:{dkdsMaterialContentOwner:'mobile-presentation'},classList:{contains:key=>['dkds-portable-view','is-floating'].includes(key)},style:{getPropertyValue:()=>'',getPropertyPriority:()=>''}};
  const frame={contains:()=>false,querySelector:()=>null,remove:()=>{removed++;},parentNode:{}};
  const parent={isConnected:true,insertBefore:()=>{reparented++;},append:()=>{reparented++;}};
  presenter.projectedNodes.set(node,{parent,next:null,inline:{},frame,target:null,region:'companion-right'});
  presenter.restoreNode(node);
  assert.strictEqual(reparented,0,'Externally floated PortableView must not be pulled back into the old companion region.');
  assert.strictEqual(removed,1,'Obsolete companion frame must be removed immediately.');
}

// 8) Pulse sampling multi-row controls are a Surface, not a nowrap Toolbar.
assert(pulseSampler.includes('class="ps-analysis-command-surface dkds-surface" data-dkds-command-surface="sampling"'),'Pulse sampling multi-row controls must use a neutral Surface identity rather than Core Toolbar row geometry.');
assert(!pulseSampler.includes('ps-analysis-command-surface dkds-toolbar'),'Pulse sampling command surface must never impersonate a Toolbar.');
assert(pulseSamplerMobile.includes('[data-dkds-mobile-region="route"][data-dkds-mobile-active="true"] .ps-analysis-controls'),'Mobile sampling density must stay in the plugin Mobile presentation stylesheet.');
assert(nativeShell.includes('.dkds-toolbar[data-dkds-toolbar-layout="stack"]')&&nativeShell.includes('display:grid;grid-template-rows:auto auto')&&nativeShell.includes('overflow:visible'),'Native platform still retains the generic stacked-toolbar fallback for genuine Mobile toolbars.');

// 7 additional TER default-position safeguard: home R-V no longer forces a full-height grid row.
assert(/#terMaxPage \.ter-resistance-card\{[\s\S]*?height:auto;/s.test(terCss),'TER R-V home card must use content/grid height rather than height:100%.');
assert(/ter-resistance-card\.dkds-portable-view:is\(\.is-docked,\.is-floating,\.is-global-floating\)\{[\s\S]*?grid-template-rows:auto auto auto minmax\(0,1fr\)/s.test(terCss),'Moved TER R-V card must give all remaining height to the plot instead of retaining the 320px home-row floor.');

console.log('v3.68.15+ Mobile portable geometry / portrait workspace / status popover closure PASS');
