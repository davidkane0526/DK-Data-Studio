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
  throw new Error('Python 3 is required for GroupBy aggregate gate.');
}
const near=(actual,expected,eps=1e-10)=>assert(Math.abs(actual-expected)<=eps,`expected ${actual} ≈ ${expected}`);
const plain=value=>JSON.parse(JSON.stringify(value));
const py=pythonCommand();
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-groupby-aggregate-'));

(async()=>{
try{
  const source=path.join(temp,'groupby_stats.py');
  fs.writeFileSync(source,`import pandas as pd
raw = pd.read_csv("measurement.csv")
grouped = raw.groupby("group")
selected = grouped["signal"]
signal_mean = selected.mean()
signal_std = raw.groupby("group")["signal"].std(ddof=0)
numeric = raw.groupby("group", as_index=False).mean(numeric_only=True)
summary = raw.groupby(["group", "phase"], as_index=False).agg({"signal": "mean", "offset": "std"})
median_table = grouped.aggregate({"signal": "median"})
dropna_table = raw.groupby("group", dropna=False, as_index=False).agg({"signal": "mean"})
`,'utf8');

  const reportPath=path.join(temp,'analysis.json');
  let run=spawnSync(py.cmd,[...py.prefix,importer,'analyze',source,'--output',reportPath],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(run.status,0,run.stderr||run.stdout);
  const analysis=JSON.parse(fs.readFileSync(reportPath,'utf8'));
  const workflow=analysis.sourceModel.workflow;
  const plan=workflow.tableTransformPlan;
  const execution=plan.execution;

  assert.strictEqual(plan.buildable,true,'Bounded GroupBy source must close in Table Transform IR.');
  assert.strictEqual(plan.statementCount,9);
  assert.strictEqual(plan.lowerableStatementCount,9,'Chained GroupBy statements may emit multiple IR ops without inflating source coverage.');
  assert.strictEqual(plan.coverage,1);
  assert(plan.operations.some(row=>row.kind==='groupby.create'&&row.output==='grouped'&&row.input==='raw'),'Assigned DataFrame.groupby() must become an explicit GroupBy IR value.');
  assert(plan.operations.some(row=>row.kind==='series.select'&&row.output==='selected'&&row.input==='grouped'),'grouped["col"] must reuse the bounded column-selection IR.');
  assert(plan.operations.some(row=>row.kind==='groupby.aggregate'&&row.output==='summary'),'agg() must lower to one bounded GroupBy aggregate op.');
  assert(plan.operations.some(row=>row.kind==='groupby.create'&&String(row.output).startsWith('__dkds_groupby_')),'Direct chained groupby must use the same GroupBy create IR instead of a special shortcut.');

  assert.strictEqual(execution.executable,true,JSON.stringify(execution.diagnostics));
  assert.deepStrictEqual(execution.resultKinds,{
    dropna_table:'table',
    median_table:'table',
    numeric:'table',
    signal_mean:'series',
    signal_std:'series',
    summary:'table'
  });
  assert.strictEqual(execution.symbolKinds.grouped,'groupby.table');
  assert.strictEqual(execution.symbolKinds.selected,'groupby.series');
  assert.strictEqual(workflow.blueprint.buildable,true);
  assert(workflow.blueprint.task.dynamicPublishTables.length===4,'Terminal GroupBy DataFrames must stay on canonical dynamic DataTable publication.');
  assert(workflow.blueprint.task.resultTables.length===2,'Terminal SeriesGroupBy reductions must reuse existing Table Unit result projections.');

  const packagePath=path.join(temp,'groupby-stats.dkplugin');
  const buildReport=path.join(temp,'build.json');
  run=spawnSync(py.cmd,[...py.prefix,importer,'build',source,'--function-id','workflow:table-transform','--package',packagePath,'--report',buildReport],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(run.status,0,run.stderr||run.stdout);
  const pkg=JSON.parse(fs.readFileSync(packagePath,'utf8'));
  const taskEntry=pkg.manifest.tasks[0].entry;
  const taskJs=pkg.files[taskEntry];
  assert(taskJs.includes("kind:'table.groupby'")&&taskJs.includes("kind:'series.groupby'")&&taskJs.includes('aggregateGroupBy'),'Generated Core Task must own bounded GroupBy values and reductions.');
  assert(!/numpy|scipy|python runtime/i.test(taskJs),'GroupBy runtime must remain JavaScript-only and must not pull later roadmap stages forward.');
  require('../desktop/plugin-package').normalizePluginPackage(pkg,{allowBuiltinId:false});

  const context={self:{}};
  vm.createContext(context);
  vm.runInContext(taskJs,context,{filename:'generated-groupby-task.js'});
  const result=await context.self.DKDSTaskDefinition.run({raw:{
    kind:'data.table',artifactId:'table:groupby',rowCount:5,
    columns:[
      {id:'group',key:'group',name:'group',dtype:'string',values:['A','A','B','B',null]},
      {id:'phase',key:'phase',name:'phase',dtype:'string',values:['x','y','x','x','x']},
      {id:'signal',key:'signal',name:'signal',dtype:'number',values:[1,3,2,4,100]},
      {id:'offset',key:'offset',name:'offset',dtype:'number',values:[10,30,20,40,50]},
      {id:'label',key:'label',name:'label',dtype:'string',values:['p','q','r','s','t']}
    ]
  }},{});

  assert.deepStrictEqual(plain(result.series.signal_mean.index),['A','B']);
  assert.deepStrictEqual(plain(result.series.signal_mean.values),[2,3]);
  assert.deepStrictEqual(plain(result.series.signal_std.index),['A','B']);
  assert.deepStrictEqual(plain(result.series.signal_std.values),[1,1]);

  const numeric=result.tables.numeric;
  assert.deepStrictEqual(numeric.columns.map(c=>c.key),['group','signal','offset']);
  assert.deepStrictEqual(plain(numeric.columns[0].values),['A','B']);
  assert.deepStrictEqual(plain(numeric.columns[1].values),[2,3]);
  assert.deepStrictEqual(plain(numeric.columns[2].values),[20,30]);

  const summary=result.tables.summary;
  assert.deepStrictEqual(summary.columns.map(c=>c.key),['group','phase','signal','offset']);
  assert.deepStrictEqual(plain(summary.columns[0].values),['A','A','B']);
  assert.deepStrictEqual(plain(summary.columns[1].values),['x','y','x']);
  assert.deepStrictEqual(plain(summary.columns[2].values),[1,3,3]);
  assert.strictEqual(summary.columns[3].values[0],null);
  assert.strictEqual(summary.columns[3].values[1],null);
  near(summary.columns[3].values[2],Math.sqrt(200));

  const median=result.tables.median_table;
  assert.deepStrictEqual(median.columns.map(c=>c.key),['group','signal'],'Default as_index=True must be materialized into canonical DKDS index columns only at the Task output boundary.');
  assert.deepStrictEqual(plain(median.columns[0].values),['A','B']);
  assert.deepStrictEqual(plain(median.columns[1].values),[2,3]);

  const dropna=result.tables.dropna_table;
  assert.deepStrictEqual(dropna.columns.map(c=>c.key),['group','signal']);
  assert.deepStrictEqual(plain(dropna.columns[0].values),['A','B',null]);
  assert.deepStrictEqual(plain(dropna.columns[1].values),[2,3,100]);

  const bad=path.join(temp,'bad_groupby.py');
  fs.writeFileSync(bad,`import pandas as pd
raw = pd.read_csv("measurement.csv")
multi = raw.groupby("group").agg({"signal": ["mean", "std"]})
named = raw.groupby("group").agg(avg=("signal", "mean"))
unsupported = raw.groupby("group").agg({"signal": "sum"})
terminal = raw.groupby("group")
`,'utf8');
  const badReport=path.join(temp,'bad.json');
  run=spawnSync(py.cmd,[...py.prefix,importer,'analyze',bad,'--output',badReport],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(run.status,0,run.stderr||run.stdout);
  const blocked=JSON.parse(fs.readFileSync(badReport,'utf8')).sourceModel.workflow.tableTransformPlan.execution;
  assert.strictEqual(blocked.executable,false);
  assert(blocked.diagnostics.some(row=>row.code==='TABLE_TASK_GROUPBY_REDUCER_UNSUPPORTED'));
  assert(blocked.diagnostics.some(row=>row.code==='TABLE_TASK_GROUPBY_NAMED_AGG_PENDING'));
  assert(blocked.diagnostics.some(row=>row.code==='TABLE_TASK_RESULT_KIND_UNSUPPORTED'));

  const contract=JSON.parse(fs.readFileSync(path.join(root,'sdk','contract.json'),'utf8'));
  assert.strictEqual(contract.sdkVersion,'1.51.78');
  console.log('SDK 1.51.78 GroupBy aggregate PASS: DataFrameGroupBy/SeriesGroupBy -> mean/median/std + agg/aggregate -> canonical table/Series outputs.');
}finally{
  fs.rmSync(temp,{recursive:true,force:true});
}
})().catch(err=>{console.error(err);process.exitCode=1;});
