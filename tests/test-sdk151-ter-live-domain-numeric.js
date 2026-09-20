const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const Analysis=require('../src/science/index.js');

const context={console,structuredClone,setTimeout,clearTimeout,crypto:global.crypto,DKDSScience:Analysis,document:{querySelector:()=>null,querySelectorAll:()=>[],getElementById:()=>null}};
context.window=context;context.globalThis=context;vm.createContext(context);
for(const rel of ['src/core/data/model.js','src/core/performance/runtime.js','src/core/scientific/pipeline-runtime.js','src/core/plugins/module-runtime.js','src/core/services/service-runtime.js','src/plugins/ter-analysis/analysis-service.js','src/plugins/ter-analysis/domain-adapter.js'])vm.runInContext(read(rel),context,{filename:rel});

function sweepDataset(){
  const step=.05,up=Array.from({length:41},(_,i)=>Number((-1+i*step).toFixed(12))),down=up.slice(0,-1).reverse(),points=[];
  for(const [direction,voltages] of [[1,up],[-1,down]])for(const v of voltages){const resonance=Math.exp(-Math.pow((v-(direction>0?.25:-.18))/.11,2)),base=1.2e-6*(1+.18*Math.abs(v)),i=base*(direction>0?1:1.7)*(1+1.9*resonance);points.push({v,i,index:points.length,sourceLine:points.length+2});}
  return {path:'ter-domain-live::Id',name:'ter-domain-live',sourcePath:'/tmp/ter-domain-live.csv',sourceName:'ter-domain-live.csv',vg:0,points};
}

(async()=>{
  const D=context.DKDSData,store=D.createStore(),dataset=sweepDataset();
  store.upsert(D.createTable({id:'source:ter-domain-live',name:dataset.name,semanticType:'science.transport.iv',metadata:{importedSource:true,seriesPath:dataset.path,vg:dataset.vg,dataAssignments:['*']},source:{path:dataset.sourcePath,name:dataset.sourceName},columns:[{key:'Vd',role:'x',values:dataset.points.map(p=>p.v)},{key:'Id',role:'y',values:dataset.points.map(p=>p.i)},{key:'Vg',role:'group',values:dataset.points.map(()=>dataset.vg)},{key:'sourceLine',role:'index',values:dataset.points.map(p=>p.sourceLine)}]}));
  const perf=context.DKDSPerformance,scope=context.DKDSScientificPipeline.createScope('builtin.ter-analysis');
  const dataTypes={get:id=>({id}),infer:value=>value?.semanticType?{id:value.semanticType}:(value?.kind?{id:value.kind}:null),accepts:(actual,accepted)=>accepted.includes(actual)};
  const performance={stage:(ns,revision,key,compute,options)=>perf.stage(`builtin.ter-analysis.${ns}`,revision,key,compute,options),trimAll:options=>perf.trimPrefix('builtin.ter-analysis.',options)};
  const pipeline={register:(id,spec)=>scope.register(id,spec),run:(id,input,options={})=>scope.run(id,input,{...options,artifacts:store,dataTypes,performance}),runSync:(id,input,options={})=>scope.runSync(id,input,{...options,artifacts:store,dataTypes,performance}),snapshot:()=>scope.snapshot()};
  const row={id:'ter.high-low-ratio',version:'1.0.0',category:'ter-analysis',owner:'builtin.standard-transport-algorithms',title:'TER High/Low'};
  const algorithms={list:({category}={})=>!category||category==='ter-analysis'?[row]:[],resolve:ref=>String(ref?.id||ref||'')===row.id?row:null,run:async(_ref,input,{parameters}={})=>Analysis.computeTerMatrix(input,parameters?.settings||{}),provenance:()=>({pluginId:row.owner,algorithmId:row.id,algorithmVersion:row.version,category:row.category,title:row.title})};
  const runtime=await context.DKDSPluginModules.require('builtin.ter-analysis','analysis-service').create({artifacts:store,science:Analysis,dataModel:D,pipeline,performance,algorithms,setStatus(){},copyTextToClipboard(){},saveChartImage(){},scheduleSnapshot(){}});
  const owner=context.DKDSServices.createScope('builtin.ter-analysis');
  context.DKDSPluginModules.require('builtin.ter-analysis','domain-adapter').provide({services:owner,data:{reactive:{subscribe:()=>()=>{}}}},runtime.service);
  const shadow=context.DKDSServices.createScope('com.example.unit-ter-shadow',{dependencies:['builtin.ter-analysis']}),live=shadow.domain.connect('builtin.ter-analysis/live');
  await live.invoke('autoParameters');
  const viaAdapter=await live.invoke('calculate'),production=runtime.service.getState().result,snapshot=live.snapshot().state.result;
  assert(viaAdapter&&production&&snapshot,'live adapter must expose the real production TER calculation result');
  assert.deepStrictEqual(viaAdapter.vgs,production.vgs,'adapter result must preserve production Vg rows exactly');
  assert.deepStrictEqual(viaAdapter.targets,production.targets,'adapter result must preserve production Vd targets exactly');
  assert.deepStrictEqual(viaAdapter.matrix,production.matrix,'adapter result must be the same authoritative TER matrix, serialized across the seam');
  assert.deepStrictEqual(snapshot.matrix,production.matrix,'shadow snapshot must present the production owner matrix without recomputation');
  const finite=production.matrix.flat().filter(Number.isFinite);assert(finite.length>0,'production TER matrix must contain finite values');
  await live.invoke('setSetting',{key:'currentFloor',value:2e-15});assert.strictEqual(runtime.service.getState().settings.currentFloor,2e-15,'shadow setting action must mutate the same production owner');
  assert.strictEqual(context.DKDSServices.get('@domain:builtin.ter-analysis/live'),null,'raw service API must not bypass the domain adapter facade');
  shadow.dispose();owner.dispose();runtime.dispose?.();
  console.log(`SDK 1.51.5 TER live-domain numeric parity PASS: ${production.vgs.length} Vg x ${production.targets.length} Vd / ${finite.length} finite cells.`);
})().catch(error=>{console.error(error);process.exit(1);});
