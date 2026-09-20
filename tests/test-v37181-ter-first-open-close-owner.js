'use strict';
const assert=require('assert');
const path=require('path');
const root=path.resolve(__dirname,'..');

function resetAppGlobals(){
  global.document={querySelector(selector){if(selector==='#statusBarMessage'||selector==='#statusBar')return {textContent:'',dataset:{},classList:{add(){},remove(){},toggle(){}}};return null;}};
  global.d3={select(){return {};}};
  global.CustomEvent=class {constructor(type,init){this.type=type;this.detail=init?.detail;}};
  globalThis.DKDSStyleGate={KINDS:{RUNTIME_INLINE:'runtime',CONFIG_TOKEN:'token'},set(){},remove(){},setToken(){}};
}

(async()=>{
  resetAppGlobals();
  let prewarmCalls=[];
  global.window={
    dispatchEvent(){},
    electronAPI:{
      listPluginWindows:async()=>[{pluginId:'builtin.ter-analysis',activity:'ter',prewarm:true}],
      syncPluginActivityWindows:async()=>0,
      prewarmActivityWindow:async payload=>{prewarmCalls.push(payload);return {prewarmed:true};}
    },
    DKDSPlugins:{
      activities:{list:()=>[]},
      manager:{list:()=>[]},
      workspace:{super:()=>null},
      project:{serialize:x=>x,restorePlugin(){}},
      events:{emit(){},on(){}}
    },
    DKDSCapabilities:{snapshot:()=>({revision:0,providers:[]})}
  };
  require('../src/core/data/model.js');
  const context=require('../src/app/modules/context.js');
  const dedicated=require('../src/app/modules/dedicated-plugin-windows.js');
  const tab={id:'project-1',title:'P1',artifactStore:null,pluginState:{},mainView:{}};
  context.state.activeProjectTabId=tab.id;context.state.projectTabs=[tab];context.state.projectPath=null;
  dedicated.configure({
    projectTabs:{activeProjectTab:()=>tab,captureActiveProjectTab(){}},
    imports:{dataConsumerTargets:()=>[]},artifacts:{dataSourceHostApi:()=>({list:()=>[],acquisitionOrder:()=>[]})},
    workspace:{},scientific:{},projects:{makeProject:()=>({plugins:{},dataModel:{schema:2,artifacts:[]}})},docks:{}
  });
  await dedicated.prewarmDedicatedPluginWindows();
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.strictEqual(prewarmCalls.length,1,'Manifest prewarm must start before deferred renderer Activity registration.');
  assert.strictEqual(prewarmCalls[0].activityId,'ter');

  // Normal dedicated close must persist its slice without restoring the same
  // plugin runtime into the owner renderer. That restore used to wake hidden TER
  // reactive state and unrelated Resonance scientific views.
  let restoreCalls=0,eventCalls=0;
  window.DKDSPlugins.project.restorePlugin=()=>{restoreCalls+=1;};
  window.DKDSPlugins.events.emit=()=>{eventCalls+=1;};
  tab.artifactStore=window.DKDSData.createStore();
  const artifact=window.DKDSData.createAnalysisResult({id:'ter-result-1',name:'TER',summary:{max:1}});
  tab.artifactStore.upsert(artifact);
  dedicated.applyDedicatedActivitySnapshot({pluginId:'builtin.ter-analysis',activityId:'ter',pluginState:{workspace:{schema:3}},artifactDelta:{upserts:[artifact],removedIds:[]},final:true},tab);
  assert.strictEqual(restoreCalls,0,'Normal TER hide/close must not restore TER runtime in the owner renderer.');
  assert.strictEqual(eventCalls,0,'Unchanged final artifact recovery must not emit a global data event.');
  dedicated.applyDedicatedActivitySnapshot({pluginId:'builtin.ter-analysis',activityId:'ter',pluginState:{workspace:{schema:3}},artifactDelta:null,final:true},tab,{restoreRuntime:true});
  assert.strictEqual(restoreCalls,1,'Explicit TOP->SUPER ownership promotion must still restore runtime state.');

  // Rendering the transformed TER view is presentation work. It must not publish
  // a new Artifact merely because the page was opened/restored.
  const modules=new Map();
  window.DKDSPluginModules={define(owner,id,value){modules.set(`${owner}:${id}`,value);},require(owner,id){return modules.get(`${owner}:${id}`);}};
  delete require.cache[require.resolve('../src/plugins/ter-analysis/analysis-service.js')];
  require('../src/plugins/ter-analysis/analysis-service.js');
  const factory=modules.get('builtin.ter-analysis:analysis-service');
  let observedPublish=null;
  const runtime=await factory.create({
    project:{},bootstrap:{},setStatus(){},copyTextToClipboard(){},saveChartImage(){},scheduleSnapshot(){},
    artifacts:{revision:()=>1,list:()=>[]},
    science:{computeSweepScalarField(){return {};},buildSweeps(){return [];},detectTerVoltageParameters(){return {vmin:-1,vmax:1,vstep:.1};}},
    dataModel:{transportDatasetsFromArtifacts:()=>[]},
    dom:{query:()=>null,html(){},on(){}},
    pipeline:{runSync(_id,_input,options){observedPublish=options.publish;return {value:{type:'didv',direction:1,targets:[0],vgs:[0],matrix:[[1]],sources:['x'],missing:0}};}},
    transforms:{fieldStageId:()=> 'field:didv',resolve:()=>({id:'didv',supportsScalarField:true})},
    algorithms:{list:()=>[],resolve:()=>null},reactive:{touch(){}},performance:null
  });
  runtime.service.restore({settings:{},display:{},transform:{type:'didv',direction:1},algorithmRef:{category:'ter-analysis',id:'ter.high-low-ratio',version:'1.0.0'},result:{used:{tolerance:.01},targets:[0],vgs:[0],records:[],matrix:[[1]],terMaxByVg:[],terMaxByVd:[]}});
  runtime.service.getTransformMatrix();
  assert.strictEqual(observedPublish,false,'View-only TER transform rendering must not publish Artifacts.');

  console.log('v3.71.81 TER first-open + close owner PASS');
})().catch(err=>{console.error(err);process.exitCode=1;});
