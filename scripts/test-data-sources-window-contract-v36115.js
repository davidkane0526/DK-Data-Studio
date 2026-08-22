'use strict';
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};

assert(json('package.json').version==='3.61.19','Application version must be 3.61.18.');

// The public Plugin API documents list()/targets() as synchronous reads. A raw
// remote capability proxy is async, so dedicated TOP windows need a synchronized
// read snapshot instead of leaking Promise semantics into ctx.data.sources.
const sdk=read('sdk/README.md');
assert(sdk.includes('const rows = ctx.data.sources.list();'),'SDK must keep ctx.data.sources.list() as a synchronous read contract.');

const app=read('src/app.js');
assert(app.includes('function capabilitySnapshotForWindows()'),'Main renderer must build a dedicated-window capability snapshot.');
assert(app.includes('syncSnapshot:sourceSnapshot'),'core.data-sources capability metadata must carry the synchronous source snapshot.');
assert(app.includes('sources:dataSourceHostApi().list()')&&app.includes('targets:dataConsumerTargets()'),'Source snapshot must include both project sources and assignment targets.');
assert(app.includes("hashString?.(JSON.stringify(sourceSnapshot))")&&app.includes('revision:baseRevision*4294967296+sourceRevision'),'Window capability revision must be content-sensitive so different projects with the same Artifact revision still propagate.');
assert(app.includes('void publishCapabilitySnapshot();'),'Source mutations/imports must republish the synchronized read snapshot to open TOP windows.');

const kernel=read('src/core/plugin-kernel.js');
assert(kernel.includes("descriptor?.metadata?.syncSnapshot"),'Plugin Core must consume the synchronized source snapshot for remote capabilities.');
assert(kernel.includes("if(prop==='list')return options=>")&&kernel.includes("if(prop==='targets')return ()=>"),'Dedicated TOP source reads must be replaced by synchronous snapshot-backed methods.');
assert(kernel.includes("descriptor?.remote===true"),'Local main-window data source methods must not be shadowed by the remote-read facade.');
assert(kernel.includes("rename:pluginType==='data'||pluginType==='foundation'")&&kernel.includes("remove:pluginType==='data'||pluginType==='foundation'"),'Foundation/data plugins must receive the host-owned source management methods promised to Data Center.');

const automation=read('src/core/automation-test-runtime.js');
assert(automation.includes("const VERSION='1.21.0'"),'Automation runner must identify the v3.61.18 contract diagnostics.');
assert(automation.includes('currentProjectPayload.capabilitySnapshot'),'Current-project Data Center smoke must use the same synchronized capability snapshot as real TOP windows.');

const pluginWindow=read('src/plugin-window/runtime.js');
assert(pluginWindow.includes('dataSourceSyncSnapshot')&&pluginWindow.includes('dataSourceTargetCount'),'Renderer diagnostics must expose source snapshot availability/counts.');

// Prove the failure mode that v3.61.14 exposed, then execute the real Plugin
// Kernel facade. The raw remote proxy is Promise-based, while the ctx.data.sources
// read methods handed to a data plugin must remain synchronous. Writes stay async.
const storage=new Map();
const sandbox={
  console,setTimeout,clearTimeout,structuredClone:global.structuredClone,
  localStorage:{getItem:key=>storage.has(key)?storage.get(key):null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)},
  CustomEvent:class CustomEvent{constructor(type,init={}){this.type=type;this.detail=init.detail;}}
};
sandbox.window=sandbox;sandbox.globalThis=sandbox;sandbox.window.dispatchEvent=()=>{};
sandbox.document={querySelector:()=>null,querySelectorAll:()=>[],getElementById:()=>null,createElement:()=>{throw new Error('DOM should not be required by this contract test.');},head:{appendChild(){}}};
vm.createContext(sandbox);
vm.runInContext(read('src/core/capability-runtime.js'),sandbox,{filename:'capability-runtime.js'});
sandbox.window.DKDSCapabilities.importRemote({schema:2,revision:1,providers:[{
  id:'core.data-sources',kind:'service',owner:'core',title:'Project Data Sources',version:'1.0.0',
  methods:['list','targets','setAssignments'],
  metadata:{syncSnapshot:{schema:1,sources:[{path:'x',assignments:['*']}],targets:[{id:'workbench.a',accepts:['data.table']}]}},
  remote:true,revision:1
}]},async payload=>({remote:true,payload}));
const raw=sandbox.window.DKDSCapabilities.proxy('core.data-sources').targets();
assert(raw&&typeof raw.then==='function','Regression setup failed: raw remote capability targets() should be Promise-based.');

vm.runInContext(read('src/core/plugin-kernel.js'),sandbox,{filename:'plugin-kernel.js'});
let observed=null;
sandbox.window.DKDSPlugins.define({
  id:'test.data-sources-contract',name:'Data Sources Contract',version:'1.0.0',enabled:true,
  apiVersion:'1.15.0',pluginType:'data',source:'builtin'
},async ctx=>{
  observed={
    rows:ctx.data.sources.list(),
    targets:ctx.data.sources.targets(),
    write:ctx.data.sources.setAssignments({path:'x'},['workbench.a'])
  };
  return {};
});
sandbox.window.DKDSPlugins.configure({getActiveProjectTab:()=>({pluginState:{}}),captureActiveProjectTab:()=>{},setStatus:()=>{}});

(async()=>{
  await sandbox.window.DKDSPlugins.activateAll();
  assert(Array.isArray(observed?.rows)&&observed.rows.length===1,'Plugin Kernel must expose snapshot-backed synchronous source rows in a dedicated TOP context.');
  assert(Array.isArray(observed?.targets)&&observed.targets.length===1,'Plugin Kernel must expose snapshot-backed synchronous assignment targets in a dedicated TOP context.');
  assert(!(observed.rows&&typeof observed.rows.then==='function')&&!(observed.targets&&typeof observed.targets.then==='function'),'Dedicated TOP source reads must not leak Promise semantics into the Plugin API.');
  assert(observed.write&&typeof observed.write.then==='function','Remote source mutations must remain asynchronous IPC operations.');
  await observed.write;
  console.log('v3.61.18 dedicated TOP data.sources synchronous-read contract checks passed.');
})().catch(err=>{console.error(err);process.exitCode=1;});
