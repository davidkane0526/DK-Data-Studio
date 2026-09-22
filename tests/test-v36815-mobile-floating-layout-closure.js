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
const dcViews=read('src/plugins/data-center/unit-presentation.js');
const pluginManager=read('src/styles/platform/native-client-shell.css');
const pulseSampler=read('src/plugins/pulse-sampler-tool/plugin.js');
const pulseSamplerUnit=read('src/plugins/pulse-sampler-tool/unit-presentation.js');
const pulseSamplerManifest=JSON.parse(read('src/plugins/pulse-sampler-tool/plugin.json'));
const themeLayout=read('src/plugins/status-monitor/theme-layout.js');
const appFoundation=read('src/app/modules/foundation.js');
const terViews=read('src/plugins/ter-analysis/unit-presentation.js');
const unitLayout=read('src/core/ui/modules/composition/unit-template-layout-spec.js');

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
assert(dcViews.includes("className:'dc-chart-params'")&&dcViews.includes("setId(chartParams,'dcChartParams')"),'Data Center Unit presentation must retain the accepted chart-options layout scope.');
assert(nativeShell.includes('var(--dkds-parameter-auto-fit-native-columns,repeat(auto-fit,minmax(150px,220px)))'),'Core native ParameterSchema must expose a configurable auto-fit column token while retaining rendered-property ownership.');
assert(dcMobile.includes('--dkds-parameter-auto-fit-native-columns:repeat(4,minmax(0,1fr))'),'X/Y/mode/legend controls must request four equal tracks through the Core configuration token.');
assert(dcMobile.includes('--dkds-field-control-min-height:28px'),'Mobile chart fields must request compact density through the canonical Field token.');
assert(!/\.dc-chart-params[^}]*?\.dkds-field-control[^}]*?(?:height|min-height)\s*:/.test(dcMobile),'Mobile Data Center must not re-own canonical Field rendered height.');
assert(dcMobile.includes('--dc-main-columns:minmax(184px,.82fr) minmax(0,1.18fr)')&&dcMobile.includes('--dc-main-areas:"source source" "tool chart"'),'Native Data Center must keep the compact two-column source/tool/chart composition while room remains.');
assert(!dcMobile.includes('@container data-center-workspace (max-width:419px)')&&!dcMobile.includes('--dc-main-areas:"source" "tool" "chart"'),'Data Center must not mechanically force the Generic Chart into a portrait-only single row; Unit/Surface geometry collapses only when genuinely necessary.');
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
  const context={globalThis:{},window:{},document:{documentElement:{dataset:{dkdsHost:'mobile'},classList:{contains:()=>true}}},require:id=>id==='ui/style-ownership-gate'?{set(){},remove(){}}:id.includes('platform-boundary')?{isMobileDocument:()=>true}:id.includes('native-touch-drag')?{bind:()=>()=>{}}:id.includes('mobile-web-projection-contract')?{PROJECTION_STYLE:[],styleValues:()=>({values:{},parameterDrawer:false}),releaseDetachObserver(){},installDetachObserver(){}}:id.includes('mobile-scientific-workspace-allocation')?{usesWorkspaceScientificAllocation:()=>false,syncWorkspaceScientificAllocation:()=>null}:id.includes('mobile-scientific-track-allocator')?{allocateScientificTracks:()=>({rightPx:0,bottomPx:0,primaryBlockPx:0,centerInlinePx:0})}:{}};context.globalThis=context;vm.createContext(context);vm.runInContext(source,context);
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

// 8) Pulse sampling multi-row controls are Unit layout recipes, not a nowrap Toolbar.
assert(pulseSamplerUnit.includes("variant:'analysis-control-grid'")&&pulseSamplerUnit.includes("variant:'result-control-grid'"),'Pulse sampling controls must use the accepted Unit multi-row layout recipes rather than Core Toolbar row geometry.');
assert(!pulseSampler.includes('ps-analysis-command-surface')&&!pulseSamplerUnit.includes('dkds-toolbar'),'Legacy Pulse sampling Toolbar/Surface DOM must remain retired after production Unit cutover.');
assert(pulseSamplerManifest.styles.length===0&&pulseSamplerManifest.platformPresentation?.mobile?.mode==='adaptive','Mobile sampling density must be owned by the platform-neutral Unit composition and Mobile Presenter rather than plugin Mobile CSS.');
assert(nativeShell.includes('.dkds-toolbar[data-dkds-toolbar-layout="stack"]')&&nativeShell.includes('display:grid;grid-template-rows:auto auto')&&nativeShell.includes('overflow:visible'),'Native platform still retains the generic stacked-toolbar fallback for genuine Mobile toolbars.');

// TER source-parity safeguard: accepted R-V geometry remains plugin detail while PortableView remains the only placement owner.
const terCss=read('src/plugins/ter-analysis/plugin.css');
assert(terCss.includes('grid-template-rows:auto auto auto minmax(320px,1fr)'),'TER R-V home card must preserve accepted source geometry.');
assert(terCss.includes('ter-resistance-card.dkds-portable-view:is(.is-docked,.is-floating,.is-global-floating)')&&terCss.includes('minmax(0,1fr)'),'Moved TER R-V card must preserve accepted portable fill geometry.');
assert(terViews.includes("stateVersion:'ter-plot-view-v3'"),'TER R-V placement must keep the accepted PlotView persistence contract.');

console.log('v3.68.15+ Mobile portable geometry / portrait workspace / status popover closure PASS');
