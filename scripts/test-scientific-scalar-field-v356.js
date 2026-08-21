const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const plot=read('src/core/scientific-plot-runtime.js');
const ui=read('src/core/ui-infrastructure.js');
const terService=read('src/plugins/ter-analysis/analysis-service.js');
const terFeature=read('src/plugins/ter-analysis/feature-runtime.js');
const terWindowRuntime=read('src/plugins/ter-analysis/window-runtime.js');
const resonanceShared=read('src/plugins/resonance-workbench/workbench-shared.js');
const resonanceFeature=read('src/plugins/resonance-workbench/feature-runtime.js');
const resonanceViews=read('src/plugins/resonance-workbench/view-components.js');

assert(plot.includes("const VERSION='2.3.0'"),'ScientificPlot 2.3.0 must own the shared scalar-field surface.');
for(const token of ['function scalarFieldSpec(field={},options={})','async scalarField(target,field={},options={})','scalarFieldSpec'])assert(plot.includes(token),`ScientificPlot scalar-field token missing: ${token}`);
assert(ui.includes('scalarField:(target,field={},options={})=>this.scientificPlotly?.scalarField?.(target,field,options)||null'),'Plugin UI scope must expose shared scalarField().');
assert(terFeature.includes('scientificPlot.scalarField(')&&terFeature.includes('function renderTerHeatmap(result)'),'TER Feature Runtime must own both primary and transformed shared scalar-field views.');
assert(!terService.includes('charts.scalarField(')&&!terService.includes('charts.react('),'TER analysis service must be presentation-free.');
assert(!terWindowRuntime.includes('DKDSUI')&&!terWindowRuntime.includes('DKDSScientificPlot'),'TER dedicated TOP service bootstrap must not create a second chart/UI scope.');
assert(!terFeature.includes("type:'heatmap',colorscale:signed"),'TER transform heatmap must not keep a private raw heatmap renderer fallback.');

// Dynamic regression: dedicated TOP window-runtime must share the owner-scoped
// Scientific Reactive Runtime with plugin activation, while presentation remains
// exclusively owned by the Feature Runtime's ctx.ui.scientificPlot.
{
  const modules=new Map();let received=null;
  const runtimeModules={
    define:(pid,name,value)=>{modules.set(`${pid}/${name}`,value);return value;},
    require:(pid,name)=>{if(pid==='builtin.ter-analysis'&&name==='analysis-service')return {create:args=>{received=args;return args;}};throw new Error(`missing ${pid}/${name}`);}
  };
  const reactive={owner:'builtin.ter-analysis'};
  const topContext={window:{DKDSPluginModules:runtimeModules,DKDSIO:{createScope:()=>({})},DKDSComponents:{createScope:()=>({})},DKDSScientificReactive:{createScope:()=>reactive},DKDSScientificAlgorithms:{list:()=>[],resolve:()=>null,run:()=>null,provenance:()=>null}},console};
  topContext.window.window=topContext.window;vm.createContext(topContext);vm.runInContext(terWindowRuntime,topContext,{filename:'ter-window-runtime.js'});
  modules.get('builtin.ter-analysis/window-runtime').create({project:{}});
  assert.strictEqual(received.reactive,reactive,'TER TOP analysis service must share the canonical owner reactive scope.');
  assert.strictEqual(received.charts,undefined,'TER TOP analysis service must not receive a chart renderer.');
}
assert(resonanceShared.includes("'resonance.feature-field'"),'Resonance must register a typed feature-field contract.');
assert(resonanceFeature.includes("outputTypes:['resonance.gate-analysis','resonance.feature-field']"),'Gate analysis Pipeline must publish the feature field as a second typed output.');
for(const token of ['gateFeatureField(settings=workspace.gateAnalysisSettings||{})','gateFeatureArtifact(field)','cellPeakIds','reswinGateFeatureField','scientificPlot.scalarField(fieldPlot'])assert(resonanceFeature.includes(token),`Resonance feature-field implementation missing: ${token}`);
for(const id of ['reswinGateFeatureMetric','reswinGateFeatureDirection','reswinGateFeatureExport','reswinGateFeatureField'])assert(resonanceViews.includes(id),`Resonance feature-field UI missing #${id}.`);

// Dynamic regression: feature-field computation must not depend on an attached UI controller.
const modules=new Map();
const moduleRuntime={
  define:(pid,name,value)=>{modules.set(`${pid}/${name}`,value);return value;},
  get:(pid,name)=>modules.get(`${pid}/${name}`)||null,
  require:(pid,name)=>{const value=modules.get(`${pid}/${name}`);if(!value)throw new Error(`missing module ${pid}/${name}`);return value;}
};
const context={console,structuredClone,setTimeout,clearTimeout,requestAnimationFrame:fn=>fn(),document:{querySelector:()=>null,querySelectorAll:()=>[]},DKDSPluginModules:moduleRuntime};
context.window=context;
context.DKDSScience={
  preset:()=>({_preset:'balanced'}),
  buildSweeps:dataset=>dataset.sweeps||[],
  peakMetrics:peak=>({fwhm:.1+.01*Number(peak.vg),amplitude:Math.abs(Number(peak.i))*.5,baseline:Number(peak.i)*.1,area:.02*(Number(peak.vg)+1),fwhmLeft:Number(peak.v)-.05,fwhmRight:Number(peak.v)+.05})
};
vm.createContext(context);
vm.runInContext(resonanceShared,context,{filename:'workbench-shared.js'});
vm.runInContext(resonanceFeature,context,{filename:'feature-runtime.js'});
const feature=moduleRuntime.require('builtin.resonance-workbench','feature-runtime');

(async()=>{
  const sweeps=[],peaks=[];
  for(const vg of [0,1])for(const direction of [1,-1]){
    const sweepId=`s:${vg}:${direction}`;
    sweeps.push({id:sweepId,datasetPath:'dataset',datasetName:'dataset',vg,direction,points:[{v:0,i:0},{v:.2,i:1},{v:.4,i:0}]});
    peaks.push({id:`p:${vg}:${direction}`,sweepId,datasetPath:'dataset',vg,direction,v:.2+.05*vg,i:(direction>0?1:-1)*(1+vg),peakOrder:1,peakLabel:'峰1',accepted:true,prominence:3+vg});
  }
  const stages=new Map();let providerRuns=0;
  const pipeline={register:(id,spec)=>{stages.set(id,spec);return spec;},get:id=>stages.get(id)||null,runSync:(id,input,options={})=>{const out=stages.get(id)?.run?.(input,{parameters:options.parameters||{}});if(out&&typeof out.then==='function')throw new Error('async result cannot be used with runSync()');return out;},run:async(id,input,options={})=>await stages.get(id)?.run?.(input,{parameters:options.parameters||{}})};
  const algorithms={list:query=>query?.category==='peak-metrics'?[{id:'baseline-fwhm-v1',version:'1.0.0',category:'peak-metrics',owner:'test.metrics',default:true,title:'test metrics',run:()=>null}]:[],provenance:ref=>({pluginId:'test.metrics',algorithmId:ref.id,algorithmVersion:ref.version,category:'peak-metrics',title:'test metrics'}),run:(_ref,input)=>{providerRuns+=1;const peak=input.peak;return {fwhm:.1+.01*Number(peak.vg),amplitude:Math.abs(Number(peak.i))*.5,baseline:Number(peak.i)*.1,area:.02*(Number(peak.vg)+1),fwhmLeft:Number(peak.v)-.05,fwhmRight:Number(peak.v)+.05};}};
  const runtime=await feature.createTop({project:{datasets:[{path:'dataset',name:'dataset',vg:0,points:[{v:0,i:0}],sweeps}],plugins:{'builtin.resonance-workbench':{workspace:{datasetMeta:[{path:'dataset',name:'dataset',vg:0}],peaks,gateAnalysisSettings:{featureMetric:'fwhm',featureDirection:'all'}}}}},artifacts:{list:()=>[]},algorithms,pipeline,setStatus(){},scheduleSnapshot(){},copyTextToClipboard(){},savePlotlyImage(){}});
  const field=runtime.service.getGateFeatureField();
  assert.deepStrictEqual(Array.from(field.x),[0,1]);
  assert.strictEqual(field.y.length,2,'Both scan directions must remain visible in the cross-curve field.');
  assert.deepStrictEqual(Array.from(field.z, row=>Array.from(row)),[[.1,.11],[.1,.11]]);
  assert(field.cellPeakIds.flat().every(Boolean),'Every populated feature-field cell must retain its source peak identity.');
  assert.strictEqual(field.semanticType,'resonance.feature-field');
  assert.strictEqual(field.missing,0);
  assert(providerRuns>=4,'Local peak-metrics Provider must synchronously populate the first feature-field projection.');
  console.log('v3.56 shared Scientific Scalar Field + Resonance feature-field checks passed.');
})().catch(err=>{console.error(err);process.exit(1);});
