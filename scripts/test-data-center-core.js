const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
function load(rel,ctx){
  const src=fs.readFileSync(path.join(root,rel),'utf8');
  vm.runInContext(src,ctx,{filename:rel});
}
const ctx=vm.createContext({
  console,
  structuredClone:global.structuredClone,
  setTimeout,clearTimeout,
  crypto:global.crypto,
});
ctx.window=ctx;ctx.globalThis=ctx;

load('src/core/data-model.js',ctx);
load('src/core/formula-engine.js',ctx);
load('src/core/parameter-schema.js',ctx);
load('src/core/workflow-engine.js',ctx);

const D=ctx.DKDSData,F=ctx.DKDSFormula,P=ctx.DKDSParameters,W=ctx.DKDSWorkflow;
function assert(cond,msg){if(!cond)throw new Error(msg);}

const source=D.createTable({
  id:'table:source',name:'Source',transient:true,
  source:{path:'device.csv',name:'device.csv'},
  columns:[
    {key:'Vd',name:'Vd',unit:'V',role:'x',values:[1,2,3]},
    {key:'Id',name:'Id',unit:'A',role:'y',values:[2,4,6]},
    {key:'Gate Voltage',name:'Gate Voltage',unit:'V',role:'group',values:[10,10,10]}
  ],
  provenance:[{type:'import',providerId:'test.import',inputs:['device.csv']}]
});
assert(D.validateArtifact(source).ok,'DataTable must validate');
assert(D.column(source,'Gate Voltage').values[0]===10,'column name lookup must work');

const compiled=F.compile('abs(Vd / Id) + [Gate Voltage] / 10',source);
assert(Math.abs(compiled.evaluate(0)-1.5)<1e-12,'safe formula evaluator must resolve identifiers and bracket column names');
assert(compiled.references.includes('Vd')&&compiled.references.includes('Gate Voltage'),'formula references must be discoverable');
const precedence=F.compile('-2^2',source);
assert(precedence.evaluate(0)===-4,'formula exponentiation must bind more tightly than unary minus');

const derived=F.deriveColumn(source,{name:'Rplus',formula:'abs(Vd / Id) + [Gate Voltage] / 10',unit:'Ω'}).table;
assert(derived.kind==='data.table'&&derived.columns.length===4,'formula must create a new DataTable column');
assert(derived.id!==source.id,'derived artifact must receive a new id');
assert(derived.provenance.length===source.provenance.length+1,'formula must append provenance');
assert(derived.provenance.at(-1).parameters.formula.includes('Vd'),'formula provenance must preserve exact formula');

const invalid=P.validate({fields:[{id:'gain',type:'number',label:'Gain',required:true,min:0,max:10}]},{gain:20});
assert(!invalid.ok&&invalid.errors.gain,'schema validation must enforce numeric range');
const defaults=P.defaultValues({fields:[{id:'mode',type:'select',default:'a'}]},{});
assert(defaults.mode==='a','schema defaults must be generated centrally');

const providers={
  'workflow.processors':new Map(),
  'workflow.analyzers':new Map(),
  'charts.renderers':new Map()
};
function add(kind,type,id,spec){providers[kind].set(id,W.normalizeProvider(type,id,spec));}
add('workflow.processors','processor','test.formula',{
  name:'Formula',inputKinds:['data.table'],outputKinds:['data.table'],
  parameterSchema:{fields:[{id:'name',type:'text',required:true},{id:'formula',type:'formula',required:true}]},
  run({inputs,parameters}){return F.deriveColumn(inputs.input,{...parameters,providerId:'test.formula',pluginId:'test',version:'1'}).table;}
});
add('workflow.analyzers','analyzer','test.summary',{
  name:'Summary',inputKinds:['data.table'],outputKinds:['result.analysis'],parameterSchema:{fields:[]},
  run({inputs}){return D.createAnalysisResult({name:'summary',summary:{rows:inputs.input.rowCount}});}
});
add('workflow.analyzers','analyzer','test.bad-output',{
  name:'Bad output',inputKinds:['data.table'],outputKinds:['result.analysis'],parameterSchema:{fields:[]},
  run(){return {summary:'not an artifact'};}
});
add('charts.renderers','chart','test.chart',{
  name:'Chart',inputKinds:['data.table'],parameterSchema:{fields:[]},
  buildSpec({inputs}){return {kind:'chart.spec',source:inputs.input.id};}
});
W.configure({
  getProvider(kind,id){return providers[kind]?.get(id)||null;},
  listProviders(kind){return [...(providers[kind]?.values()||[])];},
  emit(){}
});

(async()=>{
  const recipe={
    schema:1,id:'test.recipe',name:'Test recipe',version:'1',
    parameterSchema:{fields:[{id:'formula',type:'formula',default:'Vd/Id',required:true}]},
    inputs:[{id:'main'}],
    nodes:[
      {id:'derive',type:'processor',provider:'test.formula',inputs:{input:'input:main'},parameters:{name:'Ratio',formula:{$param:'formula'}}},
      {id:'summary',type:'analyzer',provider:'test.summary',inputs:{input:'node:derive'},parameters:{}}
    ],
    outputs:{table:'node:derive',summary:'node:summary'}
  };
  const result=await W.run(recipe,{inputs:{main:source},parameters:{formula:'Vd/Id'}});
  assert(result.outputs.table.kind==='data.table','workflow processor output must remain a DataTable');
  assert(result.outputs.summary.kind==='result.analysis','workflow analyzer output must be typed AnalysisResult');
  assert(result.outputs.table.provenance.at(-1).environment.executionId===result.id,'workflow must stamp execution id in provenance');
  assert(result.outputs.table.provenance.filter(p=>p.providerId==='test.formula').length===1,'provider provenance must not be duplicated');

  let typeRejected=false;
  try{await W.run(recipe,{inputs:{main:D.createAnalysisResult({name:'wrong'})},parameters:{formula:'1'}});}catch(err){typeRejected=/requires data\.table/.test(err.message);}
  assert(typeRejected,'workflow must reject artifacts that violate provider inputKinds');

  let missingArtifactRejected=false;
  try{await W.run(recipe,{inputs:{main:42},parameters:{formula:'1'}});}catch(err){missingArtifactRejected=/no typed artifact was provided/.test(err.message);}
  assert(missingArtifactRejected,'workflow typed inputs must reject untyped primitive/object values when inputKinds are declared');

  let missingOutputRejected=false;
  const badOutputRecipe={schema:1,id:'bad.output',nodes:[{id:'bad',type:'analyzer',provider:'test.bad-output',inputs:{input:'input:main'},parameters:{}}],outputs:{result:'node:bad'}};
  try{await W.run(badOutputRecipe,{inputs:{main:source}});}catch(err){missingOutputRejected=/returned no typed artifact/.test(err.message);}
  assert(missingOutputRejected,'workflow outputKinds must reject providers that return no typed artifact');

  const chartRecipe={schema:1,id:'chart.recipe',nodes:[{id:'chart',type:'chart',provider:'test.chart',inputs:{input:'input:main'},parameters:{}}],outputs:{result:'node:chart'}};
  const chartResult=await W.run(chartRecipe,{inputs:{main:source}});
  assert(chartResult.outputs.result.kind==='chart.spec','chart providers must participate in recipes without requiring a DOM render side effect');

  const store=D.createStore([source,derived]);
  const saved=D.serializeStore(store,{includeTransient:false});
  assert(saved.artifacts.length===1&&saved.artifacts[0].id===derived.id,'transient legacy/source artifacts must not duplicate project data on save');
  saved.artifacts[0].columns[0].values[0]=null;
  const restored=D.restoreStore(saved).get(derived.id);
  assert(Number.isNaN(restored.columns[0].values[0]),'serialized null numeric holes must rehydrate to NaN');

  console.log('v3.18 Data Model / Provenance / Workflow / Schema / Formula core checks passed.');
})().catch(err=>{console.error(err);process.exit(2);});
