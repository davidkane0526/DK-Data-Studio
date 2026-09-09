#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

assert.ok(Number(json('package.json').version.split('.').slice(0,3).join(''))>=3685,'The v3.68.5 layout/docking closure must remain available.');

// 1) Spatial Gallery was an experiment and is intentionally removed. There is
// one application/project tree only; removal must leave no runtime activity.
assert.strictEqual(fs.existsSync(path.join(root,'src/plugins/spatial-curve-gallery')),false,'Spatial 3D Gallery plugin folder must stay removed.');
const pluginIndex=read('src/generated/plugin-index.js');
assert(!pluginIndex.includes('com.dkds.experimental.spatial-curve-gallery')&&!pluginIndex.includes('spatial-curve-gallery'),'Generated first-party plugin index must not resurrect Spatial Gallery.');
const windowManager=require('../desktop/plugin-window-manager');
assert.strictEqual(windowManager.readBuiltinPluginWindows(root).has('spatial-curve-gallery'),false,'Dedicated-window registry must not expose the removed Gallery activity.');

// 2) The primary activity bar itself stays content-sized so removing an
// activity immediately compacts the remaining activity buttons. The parent
// shell lane is free to allocate spare width to current-context commands.
const shell=read('src/styles/structure/shell-navigation.css');
assert(/\.primary-activity-bar\{[\s\S]*?flex:0 1 auto;[\s\S]*?max-width:100%/.test(shell),'Primary activity buttons must remain content-sized and shrinkable after an activity closes.');

// 3) Data Center requests the generic compact auto-fit ParameterSchema layout.
// Core owns the actual responsive grid so the later structure layer cannot
// accidentally override a plugin-layer grid declaration.
const dc=read('src/plugins/data-center/plugin.css'),dcRuntime=read('src/plugins/data-center/feature-runtime.js'),schemaCss=read('src/styles/structure/schema-and-plugin-ui.css');
assert(dcRuntime.includes('compact:true,autoFit:true'),'Data Center chart parameters must keep opting into compact auto-fit geometry.');
assert(schemaCss.includes('grid-template-columns:var(--dkds-parameter-auto-fit-columns,repeat(auto-fit,minmax('),'Core ParameterSchema must provide the actual auto-fit grid geometry through a Core-owned configurable fallback.');
assert(!/#dcChartParams\.schema-parameter-panel\.auto-fit\{[\s\S]*?grid-template-columns/.test(dc),'Data Center must not attempt to override Core ParameterSchema grid geometry from the earlier plugin cascade layer.');

// 4) Docked/sticky PlotViews consume the dock/visible viewport rather than
// keeping their home-card aspect-ratio height. Arbitrary plugin plot class names
// are normalized to one Core plot-content identity.
const plotView=read('src/core/ui/modules/plot-view/chart.js');
assert(plotView.includes("this.plot?.classList?.add('dkds-plot-view-content')"),'PlotView must give arbitrary plugin plot nodes the canonical plot-content identity.');
assert(['is-floating','is-global-floating','is-docked','is-sticky'].every(state=>plotView.includes(`classList.contains('${state}')`)),'Floating/global/docked/sticky PlotViews must restore intrinsic plot geometry for container-driven stretching.');
const portableCss=read('src/styles/structure/super-top-contract.css');
assert(/\.dkds-plot-view\.dkds-portable-view:is\(\.is-floating,\.is-docked,\.is-sticky\)\{[\s\S]*?--dkds-plot-content-flex:1 1 0;[\s\S]*?--dkds-plot-content-min-height:0/.test(portableCss),'Scientific portable views must share the same flexible content contract in float/dock/sticky placements.');

// 5) Sticky means the current visible scroll viewport. The Core primitive owns
// the measurement and updates it when the scrollport/window is resized; TER no
// longer draws a second plugin-private sticky implementation.
const portable=read('src/core/ui/modules/layout/portable-view.js');
assert(/const scientificPlot=this\.wrapper\.classList\.contains\('dkds-plot-view'\);[\s\S]*?else if\(!scientificPlot&&Number\(docked\.height\)>0\)/.test(portable),'Side-docked scientific plots must not restore a stale persisted card height over the dock flex contract.');
assert(/nearestVerticalScrollport\(\)/.test(portable)&&/bindStickyViewport\(\)/.test(portable),'PortableView must resolve and bind the current vertical scrollport.');
assert(portable.includes("--dkds-portable-sticky-max-height")&&portable.includes("--dkds-portable-sticky-height"),'PortableView must publish bounded sticky viewport geometry through owned config tokens.');
assert(/placement==='sticky'\)\{this\.restoreHome\(\);this\.wrapper\.classList\.add\('is-sticky'\);this\.bindStickyViewport\(\);\}/.test(portable),'Sticky placement must bind its visible viewport immediately.');
const terCss=read('src/plugins/ter-analysis/plugin.css'),terRuntime=read('src/plugins/ter-analysis/feature-runtime.js');
assert(!terCss.includes('ter-sticky-enabled')&&!terRuntime.includes('ter-sticky-enabled'),'TER must consume Core sticky placement instead of owning a second sticky CSS path.');

// 6) Explicitly docked scientific plots are placed before fixed control panels
// and flex into the visible dock. This also keeps Resonance group plots visible
// after moving them to left/right/bottom.
const workspaceCss=read('src/styles/structure/plugin-workspace.css');
assert(/\.dkds-plugin-canvas-left>\.dkds-plot-view\.dkds-portable-view\.is-docked,[\s\S]*?\.dkds-plugin-canvas-right>\.dkds-plot-view\.dkds-portable-view\.is-docked\{[\s\S]*?order:-10;[\s\S]*?--dkds-portable-docked-flex:1 1 260px;/.test(workspaceCss),'Side-docked PlotViews must stay visible and use the remaining side viewport.');
assert(/\.dkds-plugin-canvas-bottom>\.dkds-plot-view\.dkds-portable-view\.is-docked\{[\s\S]*?order:-10;[\s\S]*?--dkds-portable-docked-flex:1 1 220px;/.test(workspaceCss),'Bottom-docked PlotViews must stay visible and use the bottom viewport.');
assert(/\.dkds-plot-view > :is\(\.dkds-plot-view-content,/.test(workspaceCss),'Canonical PlotView content must receive the shared flex geometry regardless of a plugin-private plot class.');

console.log('v3.68.5 Gallery removal + compact shell + chart form + viewport docking closure PASS');
