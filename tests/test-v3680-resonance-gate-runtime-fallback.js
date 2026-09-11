'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.join(__dirname,'..');
const code=fs.readFileSync(path.join(root,'src/plugins/resonance-workbench/feature-analysis-runtime.js'),'utf8');
let moduleValue=null;
vm.runInNewContext(code,{console,window:{DKDSPluginModules:{define(owner,name,value){if(owner==='builtin.resonance-workbench'&&name==='feature-analysis-runtime')moduleValue=value;}}}},{filename:'feature-analysis-runtime.js'});
assert.ok(moduleValue?.create,'Gate runtime module must register.');
function createApi(runSync){
  const live={workspace:{peaks:[],gateAnalysisSettings:{}},datasets:[],peakMetricRevision:0,pipelineRuntime:{register(){},runSync},sharedController:{acceptedSeriesOptions(){return[];}},algorithmRuntime:null,uiRuntime:{scientificPlot:{purge(){}}}};
  const services={
    $:()=>null,dom:{html(){},text(){},toggle(){},attr(){}},charts:null,
    artifacts:{revision(){return 1;},list(){return[];}},
    performance:{stage(_name,_revision,_key,fn){return fn();}},
    S:{computeTerMatrix(){return null;},pairGateSeries(){return[];},summarizeGateRows(){return {fits:{},correlations:{}};}},
    D:{createAnalysisResult(spec){return {id:spec.id};},createMatrix(){return null;}}
  };
  const actions={sweepById(){return null;},peakMetrics(){return{};},category(){return{label:''};},visibleSweepIds(){return[];},peakLabel(){return'';},scientificReact(){return Promise.resolve();},peakById(){return null;},publishPeakSelection(){}};
  const utils={esc:v=>String(v??''),fmt:v=>String(v??''),csvCell:v=>String(v??''),finite:Number.isFinite,directionName:v=>String(v)};
  return moduleValue.create({live,services,actions,utils});
}
(async()=>{
  for(const [label,runSync] of [
    ['null result',()=>null],
    ['pipeline throw',()=>{throw new Error('pipeline unavailable');}]
  ]){
    const api=createApi(runSync);
    await assert.doesNotReject(()=>api.renderGate(),`Gate page must still render when ${label}.`);
    const result=api.getState().gateResult;
    assert.ok(result&&Array.isArray(result.rows),`Gate page fallback must return a canonical result when ${label}.`);
  }
  console.log('v3.68.0 resonance async gate runtime fallback PASS');
})().catch(error=>{console.error(error);process.exit(1);});
