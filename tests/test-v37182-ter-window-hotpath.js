'use strict';
const assert=require('assert');
const path=require('path');
const root=path.resolve(__dirname,'..');

(async()=>{
  global.CustomEvent=class {constructor(type,init){this.type=type;this.detail=init?.detail;}};
  global.document={visibilityState:'visible',addEventListener(){},querySelector(sel){if(sel==='#statusBarMessage'||sel==='#statusBar')return {textContent:'',dataset:{},classList:{add(){},remove(){},toggle(){}}};return null;}};
  global.d3={select(){return {};}};
  globalThis.DKDSStyleGate={KINDS:{RUNTIME_INLINE:'runtime',CONFIG_TOKEN:'token'},set(){},remove(){},setToken(){}};

  const terManifest=require('../src/plugins/ter-analysis/plugin.json');
  assert.strictEqual(terManifest.window?.artifactHydration,'live','TER machine window contract must request live Artifact hydration when the lightweight project envelope contains no dataModel rows.');
  const terFeatureSource=require('fs').readFileSync(path.join(root,'src/plugins/ter-analysis/feature-runtime.js'),'utf8');
  assert(terFeatureSource.includes("openMode:'window',artifactHydration:'live'"),'TER runtime Activity must advertise the same live Artifact hydration contract.');

  let captureCalls=0,makeProjectCalls=0,openPayload=null,prewarmPayload=null,eventCalls=0;
  const artifact={id:'raw-1',kind:'data.table',semanticType:'science.transport.iv',name:'raw'};
  const store={list:()=>[artifact],revision:()=>41};
  global.window={
    dispatchEvent(){},
    DKDSData:{createStore:()=>store},
    DKDSCapabilities:{snapshot:()=>({revision:7,providers:[]})},
    DKDSPlugins:{
      activities:{list:()=>[{id:'ter',pluginId:'builtin.ter-analysis',openMode:'window',artifactHydration:terManifest.window.artifactHydration}],set(){return true;}},
      manager:{list:()=>[{id:'builtin.ter-analysis',prewarmEnabled:true,window:terManifest.window}]},
      workspace:{super:()=>null},
      project:{serialize:x=>x,restorePlugin(){}},
      events:{emit(){eventCalls+=1;},on(){}},
      configure(){}
    },
    electronAPI:{
      listPluginWindows:async()=>[{pluginId:'builtin.ter-analysis',...terManifest.window}],
      openActivityWindow:async payload=>{openPayload=payload;return {ok:true};},
      syncPluginActivityWindows:async()=>0,
      prewarmActivityWindow:async payload=>{prewarmPayload=payload;return {ok:true};}
    }
  };
  const context=require('../src/app/modules/context.js');
  context.state.activeProjectTabId='p1';
  context.state.projectTabs=[{id:'p1',title:'P1',artifactStore:store,pluginState:{'builtin.ter-analysis':{workspace:{keep:1}}},mainView:{}}];
  context.state.artifactStore=store;
  context.state.projectPath=null;
  const dedicated=require('../src/app/modules/dedicated-plugin-windows.js');
  dedicated.configure({
    projectTabs:{activeProjectTab:()=>context.state.projectTabs[0],captureActiveProjectTab(){captureCalls+=1;}},
    imports:{dataConsumerTargets:()=>[]},artifacts:{dataSourceHostApi:()=>({list:()=>[],acquisitionOrder:()=>[]})},workspace:{},scientific:{},
    projects:{makeProject(){makeProjectCalls+=1;throw new Error('full project serialization must not run on TER open/prewarm');}},docks:{}
  });

  await dedicated.openPluginActivityWindow('ter');
  assert(openPayload,'TER open payload missing');
  assert.strictEqual(captureCalls,0,'TER first-open click path must not capture/serialize the whole active project.');
  assert.strictEqual(makeProjectCalls,0,'TER first-open click path must not build the full project.');
  assert.deepStrictEqual(Object.keys(openPayload.project.plugins),['builtin.ter-analysis'],'TER open should carry only the target plugin slice.');
  assert.deepStrictEqual(openPayload.project.dataModel,{schema:2,artifacts:[]},'TER project envelope must not duplicate live artifacts.');
  assert.strictEqual(openPayload.artifactSnapshot.length,1,'TER live artifact snapshot should still be supplied.');
  assert.strictEqual(openPayload.artifactRevision,41,'TER open must pass the cheap Artifact Store revision token.');

  await dedicated.prewarmDedicatedPluginWindows();
  await new Promise(r=>setTimeout(r,0));
  assert(prewarmPayload,'TER runtime prewarm payload missing');
  assert.strictEqual(captureCalls,0,'TER prewarm must not capture the active project.');
  assert.strictEqual(makeProjectCalls,0,'TER prewarm must not serialize the full project.');
  assert.deepStrictEqual(prewarmPayload.project.plugins,{},'TER runtime-only prewarm must receive no domain plugin state.');
  assert.strictEqual(prewarmPayload.artifactRevision,0,'TER runtime-only prewarm must not hydrate project artifacts.');

  // A state-only reusable hide must not capture the main project or emit shared data events.
  eventCalls=0;
  dedicated.applyDedicatedActivitySnapshot({pluginId:'builtin.ter-analysis',activityId:'ter',pluginState:{workspace:{keep:2}},artifactDelta:null,final:false,reason:'hide'},context.state.projectTabs[0]);
  assert.strictEqual(captureCalls,0,'Applying a TER hide snapshot must not serialize the owner project.');
  assert.strictEqual(eventCalls,0,'A TER hide snapshot without artifact changes must not wake Resonance data listeners.');

  // Execute the real plugin-window lifecycle hide callback and verify the exact lightweight flush contract.
  let hideHandler=null;const pushed=[];
  global.window={
    addEventListener(){},
    DKDSUI:{lifecycle:()=>Promise.resolve()},
    DKDSPerformance:{lifecycle(){},clear(){}},
    DKDSPlugins:{events:{emit(){}}}
  };
  const lifecyclePath=require.resolve('../src/plugin-window/lifecycle.js');
  delete require.cache[lifecyclePath];
  require(lifecyclePath);
  const electronAPI={onActivityWillHide(fn){hideHandler=fn;},onOwnerArtifactDelta(){},onActivityRoleSnapshotRequest(){},onActivityWillShow(){}};
  window.DKDSPluginWindowLifecycle.install({electronAPI,pushSnapshot:(...args)=>pushed.push(args)});
  assert(hideHandler,'activityWillHide handler was not installed');
  hideHandler();
  assert.deepStrictEqual(pushed[0],[false,{includeArtifacts:false,includeProject:false,reason:'hide'}], 'Reusable TER hide must flush only plugin state, never artifacts/full project.');

  const bootstrapSource=require('fs').readFileSync(path.join(root,'src/core/plugins/kernel/modules/bootstrap.js'),'utf8');
  assert(bootstrapSource.includes("dkds.plugin.prewarm.v2"),'TER prewarm preferences must use v2 so stale false values cannot suppress runtime warmup.');

  console.log('v3.71.82 TER first-open hot path + close isolation PASS');
})().catch(err=>{console.error(err);process.exitCode=1;});
