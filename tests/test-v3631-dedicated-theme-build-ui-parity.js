const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const manager=require('../desktop/plugin-window-manager');

const builtin=manager.listBuiltinPluginWindows(root);
for(const activity of ['pulse','ter','transfer-vth-lab']){
  const spec=builtin.find(row=>row.activity===activity);
  assert(spec,`missing dedicated TOP ${activity}`);
  assert(spec.styleSources?.some(row=>row.file==='plugin.css'&&typeof row.css==='string'&&row.css.length>20),`${activity} must carry built-in manifest.styles into the dedicated renderer`);
  assert(spec.themeProviders?.some(row=>row.pluginId==='com.dkds.theme.liquid-glass'),`${activity} must receive bundled Theme Providers`);
}

const externalTheme={manifest:{id:'com.example.theme.runtime-parity',name:'Runtime parity theme',version:'1.0.0',apiVersion:'1.18.0',pluginType:'theme',entry:'plugin.js',scripts:['plugin.js'],requiresCore:['ui.theme'],capabilities:['ui.theme'],compatibility:{app:'>=3.64.0 <4.0.0',pluginApi:'^1.18.0',themeContract:'^3.8.0'}},files:{'plugin.js':'DKDSPlugins.define({id:"com.example.theme.runtime-parity",pluginType:"theme",name:"Runtime parity theme",version:"1.0.0",requiresCore:["ui.theme"]},async()=>({}));'}};
const withExternal=manager.listPluginWindows(root,[externalTheme],[]);
for(const spec of withExternal)assert(spec.themeProviders?.some(row=>row.pluginId==='com.example.theme.runtime-parity'&&row.source==='external'),`external Theme Provider must be attached to dedicated ${spec.activity}`);

const runtime=read('src/plugin-window/runtime.js');
assert(runtime.includes('spec.themeProviders')&&runtime.includes("'theme-provider'"),'dedicated runtime must load Theme Provider definitions before activation');
assert(runtime.includes('spec.styleSources')&&runtime.includes('loadInlineStyle(row.css'), 'dedicated built-in TOPs must load manifest.styles through the Core plugin style layer');

const material=read('src/styles/theme/material-renderer.css');
assert(material.includes('.dkds-context-menu:not([data-dkds-menu-behavior="rich"])'),'Core context menus must share the popover hit-region material contract');
assert(material.includes('.dkds-d3-chart-tooltip'),'D3 hover tooltips must remain a Core popover material surface');

const shell=read('src/core/plugins/kernel/modules/activity/shell.js');
assert(!shell.includes('button.dataset.dkdsTooltip=tooltip'),'visible activity tabs must not request redundant tooltips');
assert(!shell.includes('button.title=(row.pluginId===state.superPluginId'),'activity tabs must not use browser-native title tooltips');
const tooltip=read('src/core/ui/modules/tooltip/group-plot.js');
assert(tooltip.includes('class DeclarativeTooltipRuntime'),'Core must own declarative application tooltips');

const workspace=read('src/core/ui/modules/layout/workspace.js');
const scope=read('src/core/ui/modules/scope/plugin-scope.js');
assert(workspace.includes('class MovableSurface')&&scope.includes('move:spec=>this.trackObject(new MovableSurface'),'generic movable surfaces must be Core layout infrastructure');
const connectivity=json('src/plugins/connectivity-center/plugin.json');
assert(connectivity.requiresCore.includes('ui.workspace'),'Connectivity must declare the Core layout dependency used by movable dialogs');
assert(read('src/plugins/connectivity-center/plugin.js').includes("ctx.ui.layout.move({id:'smb-browser-dialog'"),'SMB dialog must consume Core movable-surface infrastructure');

const assets=json('mobile/runtime-assets.json');
assert.deepEqual(assets.apkAssets,[
  'assets/dkds/mobile.css',
  'assets/dkds/web-bridge.js',
  'assets/dkds/core/host/mobile-host-runtime.js',
  'assets/dkds/core/host/mobile-plugin-package.js'
]);
const ps=read('tools/windows/dkds-tools.ps1');
assert(ps.includes("mobile\\runtime-assets.json")&&ps.includes('$assetManifest.apkAssets'),'APK validation must consume the shared mobile runtime asset manifest');
assert(!ps.includes("'assets/dkds/core/mobile-host-runtime.js'")&&!ps.includes("'assets/dkds/core/mobile-plugin-package.js'"),'APK validation must not retain pre-modular Core asset paths');
const sync=read('mobile/scripts/sync-web-assets.js');
assert(sync.includes("runtime-assets.json")&&sync.includes('missingRuntimeFiles'),'sync:web must validate the same mobile runtime asset manifest before Expo prebuild');

const vth=read('src/plugins/transfer-vth-lab/plugin.js');
assert(vth.includes("id:'vth-plot-results-height'")&&vth.includes('dkds-vth-results-splitter'),'Vth plot/results composition must provide the Core persisted height splitter');
console.log('v3.63.1 dedicated Theme/style parity, Core tooltip/move, Android asset manifest and Vth layout contracts passed.');
