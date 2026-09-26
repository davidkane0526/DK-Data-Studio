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
  throw new Error('Python 3 is required for Series aggregate gate.');
}
const near=(actual,expected,eps=1e-10)=>assert(Math.abs(actual-expected)<=eps,`expected ${actual} ≈ ${expected}`);
const py=pythonCommand();
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-series-aggregate-'));

(async()=>{
try{
  const source=path.join(temp,'series_stats.py');
  fs.writeFileSync(source,`import pandas as pd
raw = pd.read_csv("measurement.csv")
signal = raw["signal"]
avg = signal.mean()
med = raw["signal"].median()
spread = signal.std(ddof=1)
column_means = raw.mean(numeric_only=True)
row_means = raw.mean(axis=1, numeric_only=True)
`,'utf8');

  const reportPath=path.join(temp,'analysis.json');
  let run=spawnSync(py.cmd,[...py.prefix,importer,'analyze',source,'--output',reportPath],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(run.status,0,run.stderr||run.stdout);
  const analysis=JSON.parse(fs.readFileSync(reportPath,'utf8'));
  const workflow=analysis.sourceModel.workflow;
  const plan=workflow.tableTransformPlan;
  const execution=plan.execution;

  assert.strictEqual(plan.buildable,true,'Series/statistics source must close in Table Transform IR.');
  assert.strictEqual(plan.statementCount,7);
  assert.strictEqual(plan.lowerableStatementCount,7,'One source statement may lower to multiple IR operations without inflating coverage.');
  assert.strictEqual(plan.coverage,1);
  assert(plan.operations.some(row=>row.kind==='series.select'&&row.output==='signal'&&row.input==='raw'),'df["col"] must become an explicit Series IR value.');
  assert(plan.operations.some(row=>row.kind==='series.select'&&String(row.output).startsWith('__dkds_series_')),'Direct df["col"].median() must lower through the same Series selector, not a special aggregate shortcut.');
  assert.strictEqual(execution.executable,true,JSON.stringify(execution.diagnostics));
  assert.deepStrictEqual(execution.resultKinds,{
    avg:'scalar',column_means:'series',med:'scalar',row_means:'series',spread:'scalar'
  });
  assert.deepStrictEqual(execution.resultProjections,{
    avg:{kind:'scalar',key:'dkdsResult0'},
    column_means:{kind:'series',key:'dkdsResult1'},
    med:{kind:'scalar',key:'dkdsResult2'},
    row_means:{kind:'series',key:'dkdsResult3'},
    spread:{kind:'scalar',key:'dkdsResult4'}
  });
  assert.strictEqual(workflow.blueprint.buildable,true,'Aggregate terminal values must remain packageable through existing Unit Table/Metric projections.');
  assert(workflow.blueprint.spec.content.some(row=>row.kind==='table'&&row.title==='Series · column_means'));
  assert(workflow.blueprint.spec.content.some(row=>row.kind==='metrics'&&row.items.some(item=>item.label==='avg')));

  const packagePath=path.join(temp,'series-stats.dkplugin');
  const buildReport=path.join(temp,'build.json');
  run=spawnSync(py.cmd,[...py.prefix,importer,'build',source,'--function-id','workflow:table-transform','--package',packagePath,'--report',buildReport],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(run.status,0,run.stderr||run.stdout);
  const pkg=JSON.parse(fs.readFileSync(packagePath,'utf8'));
  const taskEntry=pkg.manifest.tasks[0].entry;
  const taskJs=pkg.files[taskEntry];
  const pluginJs=pkg.files['plugin.js'];
  assert(taskJs.includes("kind:'table.series'")&&taskJs.includes('aggregateValue')&&taskJs.includes('seriesRows'),'Generated Core Task must carry bounded Series/statistics semantics.');
  assert(!/pandas|python runtime|groupby|numpy/i.test(taskJs),'Runtime Task must stay JavaScript-only and must not pull later roadmap stages forward.');
  assert(pluginJs.includes('dkdsResult0')&&pluginJs.includes('dkdsResult1'),'Generated host must project scalar/Series results through existing Metric/Table Units.');
  require('../desktop/plugin-package').normalizePluginPackage(pkg,{allowBuiltinId:false});

  const context={self:{}};
  vm.createContext(context);
  vm.runInContext(taskJs,context,{filename:'generated-series-stats-task.js'});
  const result=await context.self.DKDSTaskDefinition.run({raw:{
    kind:'data.table',artifactId:'table:stats',rowCount:4,
    columns:[
      {id:'signal',key:'signal',name:'signal',dtype:'number',values:[1,2,null,4]},
      {id:'offset',key:'offset',name:'offset',dtype:'number',values:[10,20,30,40]},
      {id:'label',key:'label',name:'label',dtype:'string',values:['a','b','c','d']}
    ]
  }},{});
  near(result.values.avg,7/3);
  near(result.values.med,2);
  near(result.values.spread,Math.sqrt(7/3));
  assert.strictEqual(result.series.column_means.kind,'table.series');
  assert.deepStrictEqual(Array.from(result.series.column_means.index),['signal','offset']);
  near(result.series.column_means.values[0],7/3);
  near(result.series.column_means.values[1],25);
  assert.deepStrictEqual(Array.from(result.series.row_means.index),[0,1,2,3]);
  [5.5,11,30,22].forEach((value,index)=>near(result.series.row_means.values[index],value));
  assert.deepStrictEqual(JSON.parse(JSON.stringify(result.dkdsResult1)),[
    {index:'signal',value:7/3},{index:'offset',value:25}
  ]);
  assert.strictEqual(result.dkdsResult0,result.values.avg);

  const bad=path.join(temp,'bad_stats.py');
  fs.writeFileSync(bad,`import pandas as pd
raw = pd.read_csv("measurement.csv")
bad_axis = raw.mean(axis=2)
bad_ddof = raw["signal"].std(ddof="sample")
`,'utf8');
  const badReport=path.join(temp,'bad.json');
  run=spawnSync(py.cmd,[...py.prefix,importer,'analyze',bad,'--output',badReport],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(run.status,0,run.stderr||run.stdout);
  const blocked=JSON.parse(fs.readFileSync(badReport,'utf8')).sourceModel.workflow.tableTransformPlan.execution;
  assert.strictEqual(blocked.executable,false);
  assert(blocked.diagnostics.some(row=>row.code==='TABLE_TASK_AGGREGATE_AXIS_UNSUPPORTED'));
  assert(blocked.diagnostics.some(row=>row.code==='TABLE_TASK_STD_DDOF_INVALID'));

  const contract=JSON.parse(fs.readFileSync(path.join(root,'sdk','contract.json'),'utf8'));
  assert.strictEqual(contract.sdkVersion,'1.51.77');
  console.log('SDK 1.51.77 Series aggregate PASS: DataFrame column -> Series -> mean/median/std -> scalar/Series Unit projections.');
}finally{
  fs.rmSync(temp,{recursive:true,force:true});
}
})().catch(err=>{console.error(err);process.exitCode=1;});
