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
  throw new Error('Python 3 is required for bounded curve_fit gate.');
}
const plain=value=>JSON.parse(JSON.stringify(value));
const near=(actual,expected,eps=1e-6)=>assert(Math.abs(actual-expected)<=eps,`expected ${actual} ≈ ${expected}`);
const py=pythonCommand();
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-curve-fit-'));

(async()=>{
try{
  const source=path.join(temp,'curve_fit.py');
  fs.writeFileSync(source,`import numpy as np
import pandas as pd
from scipy.optimize import curve_fit as cf

def linear(x, slope, intercept):
    return slope * x + intercept + 0 * np.exp(x)

raw = pd.read_csv("measurement.csv")
params = cf(linear, raw["x"], raw["y"], p0=[0.5, 0.5])[0]
`,'utf8');

  const reportPath=path.join(temp,'analysis.json');
  let run=spawnSync(py.cmd,[...py.prefix,importer,'analyze',source,'--output',reportPath],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(run.status,0,run.stderr||run.stdout);
  const analysis=JSON.parse(fs.readFileSync(reportPath,'utf8'));
  const workflow=analysis.sourceModel.workflow;
  const plan=workflow.tableTransformPlan;
  const execution=plan.execution;
  assert.strictEqual(plan.buildable,true,JSON.stringify(plan.diagnostics));
  assert.strictEqual(execution.executable,true,JSON.stringify(execution.diagnostics));
  const fit=plan.operations.find(row=>row.kind==='fit.curve');
  assert(fit,'SciPy curve_fit must lower to fit.curve IR.');
  assert.strictEqual(fit.output,'params');
  assert.deepStrictEqual(fit.p0,[0.5,0.5]);
  assert.strictEqual(fit.model.name,'linear');
  assert(plan.operations.filter(row=>row.kind==='series.select').length>=2,'Direct x/y DataFrame selections must reuse Series IR.');
  assert.strictEqual(execution.resultKinds.params,'array');
  assert.strictEqual(workflow.blueprint.buildable,true);

  const packagePath=path.join(temp,'curve-fit.dkplugin');
  const buildReport=path.join(temp,'build.json');
  run=spawnSync(py.cmd,[...py.prefix,importer,'build',source,'--function-id','workflow:table-transform','--package',packagePath,'--report',buildReport],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(run.status,0,run.stderr||run.stdout);
  const pkg=JSON.parse(fs.readFileSync(packagePath,'utf8'));
  const taskEntry=pkg.manifest.tasks[0].entry;
  const taskJs=pkg.files[taskEntry];
  assert(taskJs.includes('curveFit')&&taskJs.includes('solveLinear'),'curve_fit must compile into bounded Core Task solver helpers.');
  assert(taskJs.includes('Math.exp'),'np.exp in a pure fit model must lower to scalar Math.exp.');
  assert(!/scipy|python runtime|pyodide|child_process|new Function|eval\(/i.test(taskJs),'Generated fit Task must not ship SciPy/Python/eval runtime.');
  require('../desktop/plugin-package').normalizePluginPackage(pkg,{allowBuiltinId:false});

  const context={self:{}};vm.createContext(context);vm.runInContext(taskJs,context,{filename:'generated-curve-fit-task.js'});
  const result=await context.self.DKDSTaskDefinition.run({raw:{
    kind:'data.table',artifactId:'table:fit',rowCount:6,
    columns:[
      {id:'x',key:'x',name:'x',dtype:'number',values:[0,1,2,3,4,5]},
      {id:'y',key:'y',name:'y',dtype:'number',values:[1,3,5,7,9,11]}
    ]
  }},{});
  assert(result.arrays.params,'Terminal popt must reuse bounded Array output.');
  const values=plain(result.arrays.params.values);
  near(values[0],2,1e-5);
  near(values[1],1,1e-5);
  assert.deepStrictEqual(plain(result.dkdsResult0).map(row=>row.index),[0,1]);
  near(result.dkdsResult0[0].value,2,1e-5);
  near(result.dkdsResult0[1].value,1,1e-5);

  const tuple=path.join(temp,'curve_fit_tuple.py');
  fs.writeFileSync(tuple,`import pandas as pd
from scipy.optimize import curve_fit
def linear(x, a, b):
    return a*x+b
raw=pd.read_csv("measurement.csv")
popt, _ = curve_fit(linear, raw["x"], raw["y"])
`,'utf8');
  const tupleReport=path.join(temp,'tuple.json');
  run=spawnSync(py.cmd,[...py.prefix,importer,'analyze',tuple,'--output',tupleReport],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(run.status,0,run.stderr||run.stdout);
  const tupleWorkflow=JSON.parse(fs.readFileSync(tupleReport,'utf8')).sourceModel.workflow;
  assert.strictEqual(tupleWorkflow.tableTransformPlan.execution.executable,true,JSON.stringify(tupleWorkflow.tableTransformPlan.execution.diagnostics));
  assert.strictEqual(tupleWorkflow.tableTransformPlan.operations.find(row=>row.kind==='fit.curve').output,'popt');
  assert.deepStrictEqual(tupleWorkflow.tableTransformPlan.operations.find(row=>row.kind==='fit.curve').p0,null,'Omitted p0 must remain source-faithful and resolve to ones only during validated lowering.');

  const bad=path.join(temp,'bad_curve_fit.py');
  fs.writeFileSync(bad,`import pandas as pd
from scipy.optimize import curve_fit
offset = 1

def closed_model(x, a):
    return a*x + offset

def linear(x, a, b):
    return a*x+b

raw=pd.read_csv("measurement.csv")
bad_cov, pcov = curve_fit(linear, raw["x"], raw["y"])
bad_bounds = curve_fit(linear, raw["x"], raw["y"], bounds=(0, 1))[0]
bad_closure = curve_fit(closed_model, raw["x"], raw["y"], p0=[1])[0]
`,'utf8');
  const badReport=path.join(temp,'bad.json');
  run=spawnSync(py.cmd,[...py.prefix,importer,'analyze',bad,'--output',badReport],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(run.status,0,run.stderr||run.stdout);
  const badPlan=JSON.parse(fs.readFileSync(badReport,'utf8')).sourceModel.workflow.tableTransformPlan;
  assert.strictEqual(badPlan.execution.executable,false);
  assert(badPlan.diagnostics.some(row=>row.code==='TABLE_IR_CURVE_FIT_OUTPUT_UNSUPPORTED'&&/pcov/.test(row.message)));
  assert(badPlan.diagnostics.some(row=>row.code==='TABLE_IR_CURVE_FIT_KWARGS_UNSUPPORTED'&&/bounds/.test(row.message)));
  assert(badPlan.execution.diagnostics.some(row=>row.code==='TABLE_TASK_CURVE_FIT_MODEL_UNSUPPORTED'&&/free\/global names: offset/.test(row.message)));

  const fake=path.join(temp,'fake_curve_fit.py');
  fs.writeFileSync(fake,`import pandas as pd
def curve_fit(model, x, y):
    return [1], [[1]]
def model(x,a):
    return a*x
raw=pd.read_csv("measurement.csv")
params = curve_fit(model, raw["x"], raw["y"])[0]
`,'utf8');
  const fakeReport=path.join(temp,'fake.json');
  run=spawnSync(py.cmd,[...py.prefix,importer,'analyze',fake,'--output',fakeReport],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(run.status,0,run.stderr||run.stdout);
  const fakePlan=JSON.parse(fs.readFileSync(fakeReport,'utf8')).sourceModel.workflow.tableTransformPlan;
  assert(!fakePlan.operations.some(row=>row.kind==='fit.curve'),'A same-named user function must never be mistaken for scipy.optimize.curve_fit.');
  assert.strictEqual(fakePlan.buildable,false);

  const contract=JSON.parse(fs.readFileSync(path.join(root,'sdk','contract.json'),'utf8'));
  assert.strictEqual(contract.sdkVersion,'1.51.82');
  console.log('SDK 1.51.82 bounded curve_fit PASS: proven SciPy import -> pure scalar model -> bounded JS LM solver -> Array popt; covariance/advanced kwargs/free-name models remain fail-closed.');
}finally{
  fs.rmSync(temp,{recursive:true,force:true});
}
})().catch(err=>{console.error(err);process.exitCode=1;});
