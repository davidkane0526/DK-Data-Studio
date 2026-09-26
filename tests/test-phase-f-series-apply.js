'use strict';
const assert=require('assert');
const fs=require('fs');
const os=require('os');
const path=require('path');
const vm=require('vm');
const {spawnSync}=require('child_process');

const root=path.resolve(__dirname,'..');
const importer=path.join(root,'sdk','python','dkds_source_import.py');
const pythonEnv={...process.env,PYTHONDONTWRITEBYTECODE:'1',PYTHONIOENCODING:'utf-8'};
function pythonCommand(){
  const rows=process.platform==='win32'?[['python',[]],['py',['-3']],['python3',[]]]:[['python3',[]],['python',[]]];
  for(const [cmd,prefix] of rows){
    const probe=spawnSync(cmd,[...prefix,'--version'],{encoding:'utf8',env:pythonEnv});
    if(!probe.error&&probe.status===0)return {cmd,prefix};
  }
  throw new Error('Python 3 is required for Series.apply gate.');
}
const plain=value=>JSON.parse(JSON.stringify(value));
const near=(actual,expected,eps=1e-10)=>assert(Math.abs(actual-expected)<=eps,`expected ${actual} ≈ ${expected}`);
const py=pythonCommand();
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-series-apply-'));

(async()=>{
try{
  const source=path.join(temp,'series_apply.py');
  fs.writeFileSync(source,`import math
import pandas as pd

def magnitude(x, scale=2):
    return math.sqrt(x * x) * scale

raw = pd.read_csv("measurement.csv")
signal = raw["signal"]
default_scaled = signal.apply(magnitude)
triple = raw["signal"].apply(magnitude, args=(3,))
shifted = signal.apply(lambda x, offset=1: x + offset, args=(4,))
filled = signal.apply(lambda x: x if x == x else 0)
`,'utf8');

  const reportPath=path.join(temp,'analysis.json');
  let run=spawnSync(py.cmd,[...py.prefix,importer,'analyze',source,'--output',reportPath],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(run.status,0,run.stderr||run.stdout);
  const analysis=JSON.parse(fs.readFileSync(reportPath,'utf8'));
  const workflow=analysis.sourceModel.workflow;
  const plan=workflow.tableTransformPlan;
  const execution=plan.execution;

  assert.strictEqual(plan.buildable,true,JSON.stringify(plan.diagnostics));
  assert.strictEqual(plan.statementCount,6,'Function declarations/imports are authoring declarations, not transform statements.');
  assert.strictEqual(plan.lowerableStatementCount,6);
  assert.strictEqual(plan.coverage,1);
  const applyOps=plan.operations.filter(row=>row.kind==='series.apply');
  assert.strictEqual(applyOps.length,4);
  assert(applyOps.some(row=>row.callback?.kind==='named'&&row.callback?.name==='magnitude'));
  assert(applyOps.some(row=>row.callback?.kind==='lambda'&&row.callback?.source.includes('return x + offset')));
  assert(plan.operations.some(row=>row.kind==='series.select'&&String(row.output).startsWith('__dkds_apply_series_')),'Direct df["col"].apply(...) must reuse the same Series selection IR.');
  assert.strictEqual(execution.executable,true,JSON.stringify(execution.diagnostics));
  assert.deepStrictEqual(execution.resultKinds,{
    default_scaled:'series',
    filled:'series',
    shifted:'series',
    triple:'series'
  });
  assert.strictEqual(workflow.blueprint.buildable,true);
  assert.strictEqual(workflow.blueprint.task.resultTables.length,4,'Terminal Series.apply outputs must reuse existing Table Unit projections.');

  const packagePath=path.join(temp,'series-apply.dkplugin');
  const buildReport=path.join(temp,'build.json');
  run=spawnSync(py.cmd,[...py.prefix,importer,'build',source,'--function-id','workflow:table-transform','--package',packagePath,'--report',buildReport],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(run.status,0,run.stderr||run.stdout);
  const pkg=JSON.parse(fs.readFileSync(packagePath,'utf8'));
  const taskEntry=pkg.manifest.tasks[0].entry;
  const taskJs=pkg.files[taskEntry];
  assert(taskJs.includes('applySeries')&&taskJs.includes('Math.sqrt'),'Pure callback expressions must be compiled into the existing JavaScript Core Task.');
  assert(!/python runtime|pandas runtime|eval\(|new Function|child_process|pyodide/i.test(taskJs),'Series.apply must not introduce a Python/eval runtime.');
  require('../desktop/plugin-package').normalizePluginPackage(pkg,{allowBuiltinId:false});

  const context={self:{}};
  vm.createContext(context);
  vm.runInContext(taskJs,context,{filename:'generated-series-apply-task.js'});
  const result=await context.self.DKDSTaskDefinition.run({raw:{
    kind:'data.table',artifactId:'table:apply',rowCount:4,
    columns:[
      {id:'signal',key:'signal',name:'signal',dtype:'number',values:[1,-2,null,4]},
      {id:'label',key:'label',name:'label',dtype:'string',values:['a','b','c','d']}
    ]
  }},{});
  assert.deepStrictEqual(plain(result.series.default_scaled.index),[0,1,2,3]);
  assert.deepStrictEqual(plain(result.series.default_scaled.values),[2,4,null,8]);
  assert.deepStrictEqual(plain(result.series.triple.values),[3,6,null,12]);
  assert.deepStrictEqual(plain(result.series.shifted.values),[5,2,null,8]);
  assert.deepStrictEqual(plain(result.series.filled.values),[1,-2,0,4]);
  assert.deepStrictEqual(plain(result.dkdsResult0),[
    {index:0,value:2},{index:1,value:4},{index:2,value:null},{index:3,value:8}
  ]);

  const bad=path.join(temp,'bad_apply.py');
  fs.writeFileSync(bad,`import pandas as pd

offset = 3

def multi_step(x):
    y = x * 2
    return y

raw = pd.read_csv("measurement.csv")
bad_frame = raw.apply(lambda x: x)
bad_closure = raw["signal"].apply(lambda x: x + offset)
bad_body = raw["signal"].apply(multi_step)
`,'utf8');
  const badReport=path.join(temp,'bad.json');
  run=spawnSync(py.cmd,[...py.prefix,importer,'analyze',bad,'--output',badReport],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(run.status,0,run.stderr||run.stdout);
  const blocked=JSON.parse(fs.readFileSync(badReport,'utf8')).sourceModel.workflow.tableTransformPlan.execution;
  assert.strictEqual(blocked.executable,false);
  assert(blocked.diagnostics.some(row=>row.code==='TABLE_TASK_APPLY_INPUT_UNSUPPORTED'),'DataFrame.apply must remain fail-closed.');
  assert(blocked.diagnostics.some(row=>row.code==='TABLE_TASK_APPLY_CALLBACK_UNSUPPORTED'&&/free\/global names: offset/.test(row.message)),'Closure/free-name callback must fail closed.');
  assert(blocked.diagnostics.some(row=>row.code==='TABLE_TASK_APPLY_CALLBACK_UNSUPPORTED'&&/exactly one return expression/.test(row.message)),'Multi-statement callback body must fail closed.');

  const nonNumeric=path.join(temp,'string_apply.py');
  fs.writeFileSync(nonNumeric,`import pandas as pd
raw = pd.read_csv("measurement.csv")
labels = raw["label"].apply(lambda x: x)
`,'utf8');
  const nonNumericPackage=path.join(temp,'string-apply.dkplugin');
  const nonNumericBuild=path.join(temp,'string-build.json');
  run=spawnSync(py.cmd,[...py.prefix,importer,'build',nonNumeric,'--function-id','workflow:table-transform','--package',nonNumericPackage,'--report',nonNumericBuild],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(run.status,0,run.stderr||run.stdout);
  const stringPkg=JSON.parse(fs.readFileSync(nonNumericPackage,'utf8'));
  const stringTask=stringPkg.files[stringPkg.manifest.tasks[0].entry];
  const stringContext={self:{}};vm.createContext(stringContext);vm.runInContext(stringTask,stringContext);
  await assert.rejects(
    ()=>stringContext.self.DKDSTaskDefinition.run({raw:{kind:'data.table',rowCount:2,columns:[{id:'label',key:'label',name:'label',dtype:'string',values:['a','b']}]}},{}),
    /numeric Series values only/
  );

  const contract=JSON.parse(fs.readFileSync(path.join(root,'sdk','contract.json'),'utf8'));
  assert.strictEqual(contract.sdkVersion,'1.51.81');
  console.log('SDK 1.51.81 bounded Series.apply PASS: pure named/lambda scalar callbacks -> JS Core Task Series projection; DataFrame/closure/multi-statement paths stay fail-closed.');
}finally{
  fs.rmSync(temp,{recursive:true,force:true});
}
})().catch(err=>{console.error(err);process.exitCode=1;});
