'use strict';
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

assert.equal(json('package.json').version,'3.61.52','tool-install/native-theme release must be v3.61.27');

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
vm.runInContext(read('src/core/capability-runtime.js'),sandbox,{filename:'capability-runtime.js'});
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

vm.runInContext(read('src/core/plugin-kernel.js'),sandbox,{filename:'plugin-kernel.js'});
let observed=[];
sandbox.window.DKDSPlugins.define({
  id:'test.tool-install-sources',name:'Tool Install Sources',version:'1.0.0',apiVersion:'1.15.0',enabled:true,
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

  const main=read('main.js');
  assert(main.includes("shell, nativeTheme } = require('electron')"),'Desktop main process must import Electron nativeTheme.');
  assert(main.includes('nativeTheme.themeSource=next'),'Appearance transaction must synchronize Electron native chrome.');
  assert(main.includes('const persistedAppearance=readPersistedAppearanceTheme()'),'Persisted native appearance must be restored before creating the first BrowserWindow.');
  assert(main.includes("nativeTheme.themeSource='system'"),'When no main-process preference exists, the bootstrap must leave renderer localStorage free to migrate its saved theme.');
  assert(main.includes('backgroundColor: nativeWindowBackground()'),'Main and plugin BrowserWindows must use the active appearance background.');

  const modern=read('src/ui-modern.css');
  for(const selector of ['.analysis-control-card','.analysis-note','.analysis-table-wrap']){
    assert(modern.includes(selector),`Shared modern theme must cover ${selector}.`);
  }
  assert(modern.includes('background:var(--surface-primary)')&&modern.includes('background:var(--input-bg)'),'Legacy built-in analysis surfaces/controls must resolve through semantic theme tokens.');

  const shell=read('src/core/recipes/shell-navigation.js');
  assert(!shell.includes('background:#fff!important'),'Late shell recipe must not force light-only toolbar surfaces.');
  assert(shell.includes('var(--surface-hover)')&&shell.includes('var(--text-primary)'),'Late shell recipe must consume the Core theme contract.');
  const safeguards=read('src/core/recipes/workspace-safeguards.js');
  assert(safeguards.includes('.import-file-actions{flex:0 0 auto!important;position:relative;z-index:6;background:var(--surface-primary)}'),'Import action toolbar must inherit the active theme.');
  assert(safeguards.includes('background:var(--warning-soft)')&&safeguards.includes('background:var(--danger-soft)'),'Import warning states must use semantic warning/danger surfaces in both themes.');
  assert(!safeguards.includes('#fff8e8')&&!safeguards.includes('#fffaf0'),'Late import safeguards must not reintroduce light-only warning surfaces.');

  console.log('v3.61.27 Tool install synchronous sources + native title-bar/theme completeness checks passed.');
})().catch(err=>{console.error(err);process.exitCode=1;});
