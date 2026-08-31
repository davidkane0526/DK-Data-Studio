'use strict';
const fs=require('fs');
const path=require('path');
const {readCoreCss}=require('./css-source');
const vm=require('vm');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));



// Regression for the real external Tool installation failure reported as
// "sources is not iterable". data.sources is documented as a synchronous read
// API; the owner renderer must not leak the Promise-based generic capability
// proxy when the provider is actually local.
const storage=new Map();
const sandbox={
  console,setTimeout,clearTimeout,structuredClone:global.structuredClone,
  localStorage:{getItem:key=>storage.has(key)?storage.get(key):null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)},
  CustomEvent:class CustomEvent{constructor(type,init={}){this.type=type;this.detail=init.detail;}}
};
sandbox.window=sandbox;sandbox.globalThis=sandbox;sandbox.window.dispatchEvent=()=>{};
sandbox.document={querySelector:()=>null,querySelectorAll:()=>[],getElementById:()=>null,createElement:()=>({style:{},dataset:{},classList:{add(){},remove(){},toggle(){}},appendChild(){},remove(){}}),head:{appendChild(){}}};
vm.createContext(sandbox);
vm.runInContext(read('src/core/host/capability-runtime.js'),sandbox,{filename:'capability-runtime.js'});
sandbox.window.DKDSCapabilities.register('core','core.data-sources',{
  kind:'service',title:'Project Data Sources',version:'1.0.0',remote:true,
  methods:{
    list:()=>[{artifactId:'artifact:1',name:'demo.csv',assignments:['*']}],
    targets:()=>[{id:'pulse-sampler-tool',accepts:['data.table']}],
    setAssignments:()=>({updated:true})
  }
});
const generic=sandbox.window.DKDSCapabilities.proxy('core.data-sources').list();
assert(generic&&typeof generic.then==='function','Generic capability proxy should keep Promise semantics.');
const direct=sandbox.window.DKDSCapabilities.localProxy('core.data-sources').list();
assert(Array.isArray(direct)&&direct.length===1,'Local capability proxy must preserve synchronous provider reads.');

vm.runInContext(read('src/generated/runtime/plugin-kernel.js'),sandbox,{filename:'plugin-kernel.js'});
let observed=[];
sandbox.window.DKDSPlugins.define({
  id:'test.tool-install-sources',pluginType:'tool',name:'Tool Install Sources',version:'1.0.0',apiVersion:'1.19.0',enabled:true,
  pluginType:'tool',source:'builtin',workspace:{role:'top',activity:'pulse-sampler-tool'}
},async ctx=>{
  const rows=ctx.data.sources.list();
  // This exact for..of shape reproduces the user plugin failure if rows is a Promise.
  for(const row of rows)observed.push(row.artifactId);
  return {};
});
sandbox.window.DKDSPlugins.configure({getActiveProjectTab:()=>({pluginState:{}}),captureActiveProjectTab:()=>{},setStatus:()=>{}});

(async()=>{
  await sandbox.window.DKDSPlugins.activateAll();
  assert.deepEqual(observed,['artifact:1'],'Tool activation must receive iterable synchronous data.sources rows in the owner renderer.');

  const main=read('desktop/main.js');
  const appearance=read('desktop/main-modules/appearance-runtime.js');
  const auxiliary=read('desktop/main-modules/auxiliary-window-runtime.js');
  assert(main.includes("shell, nativeTheme } = require('electron')"),'Desktop main process must import Electron nativeTheme.');
  assert(appearance.includes('nativeTheme.themeSource=next'),'Appearance runtime must synchronize Electron native chrome.');
  assert(main.includes('const persistedAppearance=readPersistedAppearanceTheme()'),'Persisted native appearance must be restored before creating the first BrowserWindow.');
  assert(main.includes("nativeTheme.themeSource='system'"),'When no main-process preference exists, the bootstrap must leave renderer localStorage free to migrate its saved theme.');
  assert(main.includes('backgroundColor: nativeWindowBackground()')&&auxiliary.includes('backgroundColor: nativeWindowBackground()'),'Main and plugin BrowserWindows must use the active appearance background.');

  const modern=readCoreCss(root);
  for(const selector of ['.analysis-control-card','.analysis-note','.analysis-table-wrap']){
    assert(modern.includes(selector),`Shared modern theme must cover ${selector}.`);
  }
  const semanticRegistry=read('src/core/theme/semantic-registry.js');
  const materialRoles=read('src/styles/theme/material-roles.css');
  const componentAppearance=read('src/styles/theme/component-appearance.css');
  assert(semanticRegistry.includes('.analysis-control-card')&&semanticRegistry.includes('.analysis-table-wrap'),'Built-in analysis surfaces must be classified by the Core semantic registry.');
  assert(materialRoles.includes('--dkds-material-base:var(--dkui-role-surface-surface,var(--dkui-surface))'),'Built-in analysis surfaces must resolve their Material base through the semantic Surface role.');
  assert(componentAppearance.includes('[data-dkds-component-identity="field"]'),'Built-in analysis fields must resolve through canonical Field Component Appearance instead of private page paint.');

  const shell=read('src/core/recipes/shell-navigation.js');
  const shellCss=read('src/styles/structure/shell-navigation.css');
  const shellPaint=read('src/styles/presentation/shell.css');
  assert(!shell.includes('ctx.ui.styles.add'),'Shell navigation recipe must own behavior only; static Core CSS belongs to authored style owners.');
  assert(!/(?:background|color|border|box-shadow)\s*:/.test(shellCss),'Shell navigation structure must remain paint-free.');
  assert(shellPaint.includes('var(--surface-hover)')&&shellPaint.includes('var(--text-primary)'),'Shell presentation must consume the Core theme contract.');
  const safeguards=read('src/core/recipes/workspace-safeguards.js');
  const safeguardCss=read('src/styles/structure/workspace-safeguards.css');
  const importGeometry=read('src/styles/structure/import-workbench.css');
  const importPaint=read('src/styles/presentation/import-workbench.css');
  assert(!safeguards.includes('ctx.ui.styles.add'),'Workspace safeguards recipe must own behavior only; static Core CSS belongs to authored style owners.');
  assert(importGeometry.includes('.import-file-actions')&&!/(?:background|color|border|box-shadow)\s*:/.test(importGeometry)&&!/(?:background|color|border|box-shadow)\s*:/.test(safeguardCss),'Import workbench/safeguard structure must remain paint-free.');
  assert(importPaint.includes('.import-file-actions')&&importPaint.includes('background:transparent')&&componentAppearance.includes('[data-dkds-component-identity="toolbarAction"]'),'Import action toolbar must stay flat inside the elevated workbench while its actions inherit the active Theme through canonical ToolbarAction appearance.');
  assert(importPaint.includes('background:var(--warning-soft)')&&importPaint.includes('background:var(--danger-soft)'),'Import warning states must use semantic warning/danger surfaces in both themes.');
  assert(!importPaint.includes('#fff8e8')&&!importPaint.includes('#fffaf0'),'Import presentation must not reintroduce light-only warning surfaces.');

  console.log('v3.61.27 Tool install synchronous sources + native title-bar/theme completeness checks passed.');
})().catch(err=>{console.error(err);process.exitCode=1;});
