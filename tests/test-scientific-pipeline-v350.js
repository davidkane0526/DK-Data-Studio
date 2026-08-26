const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const context={window:{},structuredClone:global.structuredClone,performance:{now:()=>Date.now()},console};context.window.window=context.window;context.globalThis=context.window;context.window.performance=context.performance;
vm.createContext(context);
for(const file of ['src/core/data-model.js','src/core/performance-runtime.js','src/core/scientific-pipeline-runtime.js'])vm.runInContext(read(file),context,{filename:file});
const D=context.window.DKDSData,perf=context.window.DKDSPerformance,pipeline=context.window.DKDSScientificPipeline;
const parents={
  'science.transport.didv':['data.transform'],
  'science.scalar-field':['result.matrix']
};
const types={
  get:id=>({id}),
  infer:value=>value?.semanticType?{id:value.semanticType}:(value?.kind?{id:value.kind}:null),
  accepts:(actual,accepted)=>accepted.some(target=>actual===target||(parents[actual]||[]).includes(target))
};
const store=D.createStore();
const source=D.createTable({id:'pipeline:source',name:'source',semanticType:'data.table',columns:[{key:'V',values:[0,1,2]},{key:'I',values:[0,2,4]}]});
store.upsert(source);
const scope=pipeline.createScope('test.pipeline');
let computes=0;
scope.register('didv',{title:'dI/dV',kind:'transform',inputTypes:['data.table'],outputTypes:['science.transport.didv'],outputKinds:['data.transform'],cacheLimit:4,
  run:(input,{parameters})=>{computes+=1;const table=input[0];const x=D.columnValues(table,'V'),y=D.columnValues(table,'I');return D.createTransform({id:'pipeline:didv',name:'dI/dV',x,y:y.map(v=>v*Number(parameters.scale||1)),transform:'didv'});},
  selection:({artifacts})=>artifacts.map(a=>({type:'science.transport.didv',id:a.id,ref:{artifactId:a.id}})),
  project:({artifacts})=>({kind:'curve',artifactId:artifacts[0]?.id})
});
const perfScope={stage:(ns,revision,key,compute,options)=>perf.stage(`test.pipeline.${ns}`,revision,key,compute,options)};
const options={artifacts:store,dataTypes:types,performance:perfScope,parameters:{scale:2},publish:true};
const first=scope.runSync('didv',[store.get(source.id)],options);
assert.strictEqual(computes,1,'Pipeline stage should compute once.');
assert.strictEqual(first.artifacts[0].semanticType,'science.transport.didv','Pipeline must stamp canonical semanticType.');
assert.deepStrictEqual(Array.from(first.artifacts[0].lineage.parents),[source.id],'Pipeline must attach source lineage.');
assert(first.artifacts[0].provenance.some(p=>p.providerId==='didv'&&p.pluginId==='test.pipeline'),'Pipeline must attach provenance.');
assert.strictEqual(store.get('pipeline:didv').semanticType,'science.transport.didv','Artifact Store round-trip must preserve semanticType.');
assert.strictEqual(first.selection[0].type,'science.transport.didv','Pipeline must expose typed selection projection.');
assert.strictEqual(first.viewModel.kind,'curve','Pipeline must expose a presentation projection.');
const second=scope.runSync('didv',[store.get(source.id)],options);
assert.strictEqual(computes,1,'Unchanged pipeline input must hit the shared cache.');
assert.strictEqual(second.artifacts[0].id,'pipeline:didv');
store.upsert(D.createTable({id:'pipeline:source',name:'source',semanticType:'data.table',columns:[{key:'V',values:[0,1,2]},{key:'I',values:[0,3,6]}]}));
scope.runSync('didv',[store.get(source.id)],options);
assert.strictEqual(computes,2,'Changed source artifact fingerprint must invalidate the pipeline cache.');
scope.register('async-analysis',{kind:'analysis',execution:'async',inputTypes:['science.transport.didv'],outputTypes:['result.analysis'],cache:false,run:async input=>D.createAnalysisResult({id:'pipeline:analysis',summary:{source:input[0].id}})});
(async()=>{
  assert.throws(()=>scope.runSync('async-analysis',[store.get('pipeline:didv')],{...options,publish:false}),/async stage|async result/,'runSync must reject asynchronous stage implementations.');
  const asyncResult=await scope.run('async-analysis',[store.get('pipeline:didv')],{...options,publish:false});
  assert.strictEqual(asyncResult.artifacts[0].lineage.parents[0],'pipeline:didv','Async pipeline execution must preserve lineage.');
  const snap=scope.snapshot();assert(snap.stages.some(row=>row.id==='didv'&&row.runs===3),'Pipeline snapshot must expose execution metrics.');
  pipeline.removeOwner('test.pipeline');assert.strictEqual(pipeline.list({owner:'test.pipeline'}).length,0,'Owner cleanup must remove registered pipeline stages.');
  console.log('Scientific Pipeline v3.50 semantic/provenance/cache/selection checks passed.');
})().catch(err=>{console.error(err);process.exit(1);});
