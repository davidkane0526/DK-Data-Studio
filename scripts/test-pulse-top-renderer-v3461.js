const fs=require('fs');
const vm=require('vm');
function assert(ok,msg){if(!ok)throw new Error(msg);}

const source=fs.readFileSync('src/plugins/pulse-analysis/analysis-service.js','utf8');
let moduleValue=null;
const elements={
  pulseFileList:{innerHTML:'',appendChild(){}},
  pulseBatchFileSummary:{textContent:''},
  pulseNoActiveFile:{classList:{toggle(){}}},
  pulseActiveEditor:{classList:{toggle(){}}}
};
const dom={query(selector){const id=String(selector||'').replace(/^#/,'');return elements[id]||null;},create(){return {className:'',innerHTML:'',querySelector(){return null;},appendChild(){}};},frame(fn){fn?.();}};
const context={console,structuredClone,window:{Analysis:{},DKDSPluginModules:{define(_plugin,id,value){if(id==='analysis-service')moduleValue=value;}}}};
vm.createContext(context);
vm.runInContext(source,context,{filename:'pulse-analysis-service.js'});
assert(moduleValue?.create,'Pulse analysis service module was not registered.');

(async()=>{
  const runtime=await moduleValue.create({setStatus(){},copyTextToClipboard(){},savePlotlyImage(){},scheduleSnapshot(){},io:{},charts:null,dom});
  assert(runtime?.service?.render,'Pulse service render API missing.');
  runtime.service.render();
  assert(elements.pulseNoActiveFile,'Regression fixture missing empty-state DOM.');
  assert(!/\$\('#pulseAnalyzeCurrentBtn'\)\.disabled/.test(source),'Pulse must not dereference the removed legacy analyze-current button.');

  const windowRuntime=fs.readFileSync('src/plugin-window/runtime.js','utf8');
  assert(windowRuntime.includes('targetPluginState'),'Dedicated TOP runtime must inspect target plugin activation state.');
  assert(windowRuntime.includes('插件激活失败：'),'Dedicated TOP runtime must report the original activation failure.');

  const automation=fs.readFileSync('src/core/automation-test-runtime.js','utf8');
  assert(automation.includes('passedTopCount'),'Automation coverage must distinguish exercised TOPs from successful TOPs.');
  assert(automation.includes('TOP renderer(s) failed readiness'),'TOP coverage must fail when any renderer does not reach ready.');
  console.log('Pulse TOP renderer hotfix v3.46.1 tests passed.');
})().catch(err=>{console.error(err);process.exitCode=1;});
