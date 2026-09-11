'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const runtime={console,structuredClone,ArrayBuffer,Float64Array,Date,Math,JSON,Number,String,Array,Object,Map,Set,WeakMap,Promise};
runtime.window=runtime;runtime.globalThis=runtime;vm.createContext(runtime);
for(const file of ['src/core/data/model.js','src/core/project/history.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),runtime,{filename:file});

global.DKDSStyleGate={KINDS:{RUNTIME_INLINE:'runtime-inline',CONFIG_TOKEN:'config-token'},set(){},remove(){},setToken(){}};
global.document={querySelector(){return null;}};
global.d3={select(){return {};}};
const emitted=[];
global.window={DKDSData:runtime.DKDSData,DKDSPlugins:{events:{emit:(name,payload)=>emitted.push({name,payload})}}};

const foundation=require('../src/app/modules/foundation');
const hostModule=require('../src/app/modules/data-artifact-host');
const {state}=require('../src/app/modules/context');
const table=runtime.DKDSData.createTable({id:'history:table',columns:[{id:'history:column',key:'signal',dtype:'float64',values:[1,2,3]}]});
state.artifactStore=runtime.DKDSData.createStore([table]);
const history=runtime.DKDSProjectHistory.create();
const tab={id:'history:tab',artifactStore:state.artifactStore};
const projectTabs={
  activeProjectTab:()=>tab,captureActiveProjectTab:()=>{tab.artifactStore=state.artifactStore;},
  projectHistorySnapshot:()=>history.snapshot(),recordProjectHistory:entry=>history.record(entry)
};
foundation.configure({projectTabs,imports:{dataConsumerTargets:()=>[],ensureImportTargets:()=>[]}});
hostModule.configure({
  projectTabs,
  imports:{dataConsumerTargets:()=>[],openImportWorkbench:()=>{}},
  workspace:{refreshOpenAnalysisPage:()=>{},renderAll:()=>{}},
  docks:{systemUndo:()=>history.undo(),systemRedo:()=>history.redo()},
  windows:{publishCapabilitySnapshot:()=>{}}
});

(async()=>{
  const api=hostModule.artifactHostApi(),buffer=api.columnBuffer(table.id,'signal');
  const result=api.transactColumn(buffer,draft=>{draft[1]=20;},{label:'Edit signal'});
  assert.strictEqual(result.changed,true);
  assert.strictEqual(api.get(table.id).columns[0].values[1],20);
  assert.strictEqual(history.snapshot().past.length,1,'A direct main-project column transaction must record exactly one undo entry.');
  assert.strictEqual(history.snapshot().undoEntry.metadata.operation,'column-transaction');
  assert.strictEqual(await history.undo(),true);
  assert.strictEqual(api.get(table.id).columns[0].values[1],2,'Undo must restore the exact prior column data.');
  assert.strictEqual(await history.redo(),true);
  assert.strictEqual(api.get(table.id).columns[0].values[1],20,'Redo must restore the exact committed column data.');
  assert(emitted.some(row=>row.name==='data:artifacts-changed'),'Commit/undo/redo must flow through the canonical Artifact event path.');
  console.log('v3.68.77 main-project Column Buffer history round-trip PASS.');
})().catch(error=>{console.error(error);process.exit(1);});
