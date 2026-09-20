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
  if(activity==='transfer-vth-lab'){assert.deepStrictEqual(spec.styleSources,[],'Vth production Unit cutover must not carry retired private plugin.css into the dedicated renderer.');assert(spec.packageScripts?.includes('unit-presentation.js'),'Vth dedicated renderer must load the production Unit presentation module.');}
  else assert(spec.styleSources?.some(row=>row.file==='plugin.css'&&typeof row.css==='string'&&row.css.length>20),`${activity} must carry built-in manifest.styles into the dedicated renderer`);
  if(activity==='ter')assert(!/(?:^|[;{}]\s*)(?:background(?:-color)?|color|border(?:-[\w-]+)?|box-shadow|text-shadow|font(?:-family|-size|-weight)?)\s*:/mi.test(spec.styleSources.find(row=>row.file==='plugin.css').css),'TER dedicated-window stylesheet must remain geometry-only.');
  assert(spec.themeProviders?.some(row=>row.pluginId==='com.dkds.theme.liquid-glass'),`${activity} must receive bundled Theme Providers`);
}

const externalTheme={manifest:{id:'com.example.theme.runtime-parity',name:'Runtime parity theme',version:'1.0.0',apiVersion:'1.19.0',pluginType:'theme',entry:'plugin.js',scripts:['plugin.js'],requiresCore:['ui.theme'],capabilities:['ui.theme']},files:{'plugin.js':'DKDSPlugins.define({id:"com.example.theme.runtime-parity",pluginType:"theme",name:"Runtime parity theme",version:"1.0.0",requiresCore:["ui.theme"]},async()=>({}));'}};
const withExternal=manager.listPluginWindows(root,[externalTheme],[]);
for(const spec of withExternal)assert(spec.themeProviders?.some(row=>row.pluginId==='com.example.theme.runtime-parity'&&row.source==='external'),`external Theme Provider must be attached to dedicated ${spec.activity}`);

const runtime=read('src/plugin-window/runtime.js');
assert(runtime.includes('spec.themeProviders')&&runtime.includes("'theme-provider'"),'dedicated runtime must load Theme Provider definitions before activation');
assert(runtime.includes('spec.styleSources')&&runtime.includes('loadInlineStyle(row.css'), 'dedicated built-in TOPs must load manifest.styles through the Core plugin style layer');

const material=read('src/styles/theme/material-renderer.css');
const semantic=read('src/core/theme/semantic-registry.js');
const componentAppearance=read('src/styles/theme/component-appearance.css');
assert(semantic.includes('.dkds-context-item')&&componentAppearance.includes('[data-dkds-component-identity="menuItem"]'),'Core context-menu rows must use canonical MenuItem Component Appearance while the menu surface alone owns popover material.');
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

const vth=read('src/plugins/transfer-vth-lab/unit-presentation.js');
assert(vth.includes("id:'vth-results-height-v3'")&&vth.includes('units.splitPane.create')&&vth.includes("trackToken:'--dkds-unit-vth-results-height'"),'Vth Unit plot/results composition must provide the Core persisted results-height SplitPane so the plot can flex-fill.');
console.log('v3.63.1 dedicated Theme/style parity, Core tooltip/move, Android asset manifest and Vth layout contracts passed.');
