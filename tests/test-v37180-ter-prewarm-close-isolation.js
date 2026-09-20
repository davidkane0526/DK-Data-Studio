'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');

// 1) TER's accepted desktop contract is background runtime prewarm. This is what
// removes dedicated-renderer + scientific-runtime cold start from the first click.
const manifest=JSON.parse(fs.readFileSync(path.join(root,'src/plugins/ter-analysis/plugin.json'),'utf8'));
assert.strictEqual(manifest.window?.activity,'ter');
assert.strictEqual(manifest.window?.prewarm,true,'TER dedicated window must be prewarmed by default; first-open must not pay the full cold-start path.');
const {readBuiltinPluginWindows}=require('../desktop/plugin-window-manager');
const machineSpec=readBuiltinPluginWindows(root).get('ter');
assert(machineSpec,'TER machine window contract must be discoverable.');
assert.strictEqual(machineSpec.prewarm,true,'Machine-owned TER window contract must preserve manifest prewarm=true.');

// 2) Exercise the real project Artifact store and real dedicated snapshot merge.
// A dedicated renderer sends live deltas as work happens, then carries a recovery
// delta again in its final close snapshot. Replaying that same artifact must be a
// no-op and closing must not globally rerender the active Resonance workspace.
global.document={querySelector(){return {textContent:'',dataset:{},classList:{add(){},remove(){},toggle(){}}};}};
global.d3={select(){return {};}};
global.CustomEvent=class {constructor(type,init){this.type=type;this.detail=init?.detail;}};
globalThis.DKDSStyleGate={KINDS:{RUNTIME_INLINE:'runtime',CONFIG_TOKEN:'token'},set(){},remove(){},setToken(){}};
global.window={dispatchEvent(){},DKDSPlugins:{project:{restorePlugin(){}}}};
require('../src/core/data/model.js');
const dedicated=require('../src/app/modules/dedicated-plugin-windows.js');
const context=require('../src/app/modules/context.js');
let renders=0,relayouts=0,captures=0;
dedicated.configure({
  projectTabs:{activeProjectTab(){return null;},captureActiveProjectTab(){captures+=1;}},
  imports:{},artifacts:{},
  workspace:{renderAll(){renders+=1;},scheduleMainPlotRelayout(){relayouts+=1;}},
  scientific:{},projects:{},docks:{}
});
const store=window.DKDSData.createStore();
const artifact=window.DKDSData.createAnalysisResult({id:'ter-result-1',name:'TER result',summary:{max:123}});
store.upsert(artifact);
const tab={id:'project-1',artifactStore:store,pluginState:{}};
context.state.activeProjectTabId=tab.id;
context.state.projectTabs=[tab];
assert.strictEqual(
  dedicated.applyArtifactDeltaToTab(tab,{upserts:[artifact],removedIds:[]}),
  false,
  'Replayed final-snapshot artifact must be deduplicated against the already-applied live delta.'
);
dedicated.applyDedicatedActivitySnapshot({
  pluginId:'builtin.ter-analysis',activityId:'ter',pluginState:null,
  artifactDelta:{upserts:[artifact],removedIds:[]},final:true
},tab);
assert.strictEqual(renders,0,'Closing TER with an unchanged final snapshot must not globally render the active workspace.');
assert.strictEqual(relayouts,0,'Closing TER with an unchanged final snapshot must not relayout Resonance plots.');

// A materially new artifact still counts as a change; dedupe must not swallow data.
const changed={...artifact,summary:{max:456},updatedAt:new Date(Date.now()+1000).toISOString()};
assert.strictEqual(dedicated.applyArtifactDeltaToTab(tab,{upserts:[changed],removedIds:[]}),true,'A materially changed TER artifact must still merge.');

// 3) Embedded-page close is visibility restoration only. It must not invoke the
// SUPER plugin's onActivate/render path just because another page was closed.
const shell=fs.readFileSync(path.join(root,'src/app/modules/workspace-super-shell.js'),'utf8');
assert(shell.includes("activities?.set?.(superState.activityId,{invoke:false,forceEmbedded:true})"),'Embedded analysis close must restore the SUPER shell without invoking plugin domain rendering.');

console.log('v3.71.80 TER prewarm + close isolation PASS');
