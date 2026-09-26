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
  throw new Error('Python 3 is required for bounded NumPy Array IR gate.');
}
const near=(actual,expected,eps=1e-10)=>assert(Math.abs(actual-expected)<=eps,`expected ${actual} ≈ ${expected}`);
const plain=value=>JSON.parse(JSON.stringify(value));
const py=pythonCommand();
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-numpy-array-ir-'));

(async()=>{
try{
  const source=path.join(temp,'array_stats.py');
  fs.writeFileSync(source,`import pandas as pd
import numpy as np
raw = pd.read_csv("measurement.csv")
signal = raw["signal"]
x = signal.to_numpy()
y = np.asarray(raw["offset"])
literal = np.array([1.0, 2.0, 4.0])
grid = np.linspace(0.0, 1.0, 5)
steps = np.arange(0.0, 6.0, 2.0)
twice = x * 2.0
scaled = twice + y
logged = np.log10(literal)
delta = np.diff(grid)
center = np.mean(literal)
spread = np.std(literal, ddof=1)
middle = np.median(literal)
sliced = grid[1:4]
last = grid[-1]
`,'utf8');

  const reportPath=path.join(temp,'analysis.json');
  let run=spawnSync(py.cmd,[...py.prefix,importer,'analyze',source,'--output',reportPath],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(run.status,0,run.stderr||run.stdout);
  const analysis=JSON.parse(fs.readFileSync(reportPath,'utf8'));
  const workflow=analysis.sourceModel.workflow;
  const plan=workflow.tableTransformPlan;
  const execution=plan.execution;

  assert.strictEqual(plan.buildable,true,'bounded NumPy source must close in Table Transform IR.');
  assert.strictEqual(plan.statementCount,16);
  assert.strictEqual(plan.lowerableStatementCount,16);
  assert.strictEqual(plan.coverage,1);
  assert(plan.operations.some(row=>row.kind==='array.from-value'&&row.output==='x'&&row.input==='signal'),'Series.to_numpy() must lower to the bounded Array IR.');
  assert(plan.operations.some(row=>row.kind==='series.select'&&String(row.output).startsWith('__dkds_array_series_')),'np.asarray(df["col"]) must pass through the existing Series selector.');
  assert(plan.operations.some(row=>row.kind==='array.range'&&row.output==='grid'&&row.sourceMethod==='linspace'));
  assert(plan.operations.some(row=>row.kind==='array.range'&&row.output==='steps'&&row.sourceMethod==='arange'));
  assert(plan.operations.some(row=>row.kind==='array.binary'&&row.output==='scaled'&&row.operator==='add'));
  assert(plan.operations.some(row=>row.kind==='array.reduce'&&row.output==='spread'&&row.sourceMethod==='std'));
  assert(plan.operations.some(row=>row.kind==='array.slice'&&row.output==='sliced'));
  assert(plan.operations.some(row=>row.kind==='series.select'&&row.output==='last'&&row.input==='grid'),'literal array item access may reuse scalar selection IR.');

  assert.strictEqual(execution.executable,true,JSON.stringify(execution.diagnostics));
  assert.strictEqual(execution.resultKinds.center,'scalar');
  assert.strictEqual(execution.resultKinds.spread,'scalar');
  assert.strictEqual(execution.resultKinds.middle,'scalar');
  for(const name of ['steps','scaled','logged','delta','sliced'])assert.strictEqual(execution.resultKinds[name],'array',name+' must remain an Array result.');
  assert.strictEqual(execution.resultKinds.last,'scalar');
  assert.strictEqual(workflow.blueprint.buildable,true);
  assert(workflow.blueprint.task.dynamicPublishTables.length===0,'Array/scalar terminals must not pretend to be canonical DataFrames.');
  assert(workflow.blueprint.task.resultTables.length===5,'Terminal arrays must reuse existing Table Unit result projections.');
  assert(workflow.blueprint.task.resultMetrics.length===4,'Terminal NumPy scalar reductions/items must reuse existing Metric Unit projections.');
  assert(workflow.blueprint.spec.content.some(row=>row.kind==='table'&&row.title==='Array · scaled'));

  const packagePath=path.join(temp,'array-stats.dkplugin');
  const buildReport=path.join(temp,'build.json');
  run=spawnSync(py.cmd,[...py.prefix,importer,'build',source,'--function-id','workflow:table-transform','--package',packagePath,'--report',buildReport],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(run.status,0,run.stderr||run.stdout);
  const pkg=JSON.parse(fs.readFileSync(packagePath,'utf8'));
  const taskEntry=pkg.manifest.tasks[0].entry;
  const taskJs=pkg.files[taskEntry];
  assert(taskJs.includes("kind:'array.vector'")&&taskJs.includes('arrayBinary')&&taskJs.includes('arrayReduce'),'Generated Core Task must own bounded Array values and math.');
  assert(!/import\s+numpy|require\([^)]*numpy|python runtime/i.test(taskJs),'Generated task must not ship NumPy/Python runtime.');
  require('../desktop/plugin-package').normalizePluginPackage(pkg,{allowBuiltinId:false});

  const context={self:{}};
  vm.createContext(context);
  vm.runInContext(taskJs,context,{filename:'generated-array-task.js'});
  const result=await context.self.DKDSTaskDefinition.run({raw:{
    kind:'data.table',artifactId:'table:array',rowCount:4,
    columns:[
      {id:'signal',key:'signal',name:'signal',dtype:'number',values:[1,2,3,4]},
      {id:'offset',key:'offset',name:'offset',dtype:'number',values:[10,20,30,40]}
    ]
  }},{});

  assert.deepStrictEqual(plain(result.arrays.steps.values),[0,2,4]);
  assert.deepStrictEqual(plain(result.arrays.scaled.values),[12,24,36,48]);
  [0,Math.log10(2),Math.log10(4)].forEach((value,index)=>near(result.arrays.logged.values[index],value));
  assert.deepStrictEqual(plain(result.arrays.delta.values),[.25,.25,.25,.25]);
  assert.deepStrictEqual(plain(result.arrays.sliced.values),[.25,.5,.75]);
  near(result.values.center,7/3);
  near(result.values.middle,2);
  near(result.values.spread,Math.sqrt(7/3));
  assert.strictEqual(result.values.last,1);
  const scaledKey=execution.resultProjections.scaled.key;
  assert.deepStrictEqual(plain(result[scaledKey]),[
    {index:0,value:12},{index:1,value:24},{index:2,value:36},{index:3,value:48}
  ],'Array host projection must be ordinary Index/Value rows for the existing Table Unit.');

  const bad=path.join(temp,'bad_array.py');
  fs.writeFileSync(bad,`import pandas as pd
import numpy as np
raw = pd.read_csv("measurement.csv")
matrix = np.array([[1.0, 2.0], [3.0, 4.0]])
too_large = np.linspace(0.0, 1.0, 70000)
arr = np.array([1.0, 2.0, 3.0])
bad_axis = np.mean(arr, axis=1)
bad_dtype = np.asarray(raw["signal"], dtype="object")
unsupported = np.sum(arr)
`,'utf8');
  const badReport=path.join(temp,'bad.json');
  run=spawnSync(py.cmd,[...py.prefix,importer,'analyze',bad,'--output',badReport],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(run.status,0,run.stderr||run.stdout);
  const badAnalysis=JSON.parse(fs.readFileSync(badReport,'utf8')).sourceModel.workflow.tableTransformPlan;
  assert.strictEqual(badAnalysis.execution.executable,false);
  const codes=[...badAnalysis.diagnostics.map(row=>row.code),...badAnalysis.execution.diagnostics.map(row=>row.code)];
  assert(codes.includes('TABLE_TASK_ARRAY_LITERAL_NON_NUMERIC'));
  assert(codes.includes('TABLE_TASK_ARRAY_RANGE_LENGTH'));
  assert(codes.includes('TABLE_TASK_ARRAY_AXIS_UNSUPPORTED'));
  assert(codes.includes('TABLE_TASK_ARRAY_DTYPE_UNSUPPORTED'));
  assert(codes.includes('TABLE_IR_NUMPY_CALL_UNSUPPORTED'));

  const mismatch=path.join(temp,'mismatch.py');
  fs.writeFileSync(mismatch,`import pandas as pd
import numpy as np
raw = pd.read_csv("measurement.csv")
a = np.array([1.0, 2.0])
b = np.array([10.0, 20.0, 30.0])
c = a + b
`,'utf8');
  const mismatchPackage=path.join(temp,'mismatch.dkplugin');
  const mismatchBuild=path.join(temp,'mismatch-build.json');
  run=spawnSync(py.cmd,[...py.prefix,importer,'build',mismatch,'--function-id','workflow:table-transform','--package',mismatchPackage,'--report',mismatchBuild],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(run.status,0,run.stderr||run.stdout);
  const mismatchPkg=JSON.parse(fs.readFileSync(mismatchPackage,'utf8'));
  const mismatchContext={self:{}};vm.createContext(mismatchContext);
  vm.runInContext(mismatchPkg.files[mismatchPkg.manifest.tasks[0].entry],mismatchContext);
  await assert.rejects(
    ()=>mismatchContext.self.DKDSTaskDefinition.run({raw:{kind:'data.table',artifactId:'unused',rowCount:1,columns:[{id:'x',key:'x',name:'x',dtype:'number',values:[1]}]}},{}),
    /equal lengths/
  );

  const contract=JSON.parse(fs.readFileSync(path.join(root,'sdk','contract.json'),'utf8'));
  assert.strictEqual(contract.sdkVersion,'1.51.79');
  console.log('SDK 1.51.79 bounded NumPy Array IR PASS: 1D numeric arrays -> bounded Core Task math -> Array/Table + scalar/Metric projections.');
}finally{
  fs.rmSync(temp,{recursive:true,force:true});
}
})().catch(err=>{console.error(err);process.exitCode=1;});
