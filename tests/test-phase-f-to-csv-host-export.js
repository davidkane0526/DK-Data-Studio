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
  throw new Error('Python 3 is required for to_csv Host Export gate.');
}
const plain=value=>JSON.parse(JSON.stringify(value));
const py=pythonCommand();
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-to-csv-export-'));

(async()=>{
try{
  const source=path.join(temp,'csv_export.py');
  fs.writeFileSync(source,`import pandas as pd
raw = pd.read_csv("measurement.csv")
grouped = raw.groupby("group").mean(numeric_only=True)
grouped.to_csv("reports/group summary.csv", sep=";", na_rep="NA", header=True, index=True, columns=["signal"], encoding="utf-8-sig", lineterminator="\\r\\n")
`,'utf8');

  const reportPath=path.join(temp,'analysis.json');
  let run=spawnSync(py.cmd,[...py.prefix,importer,'analyze',source,'--output',reportPath],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(run.status,0,run.stderr||run.stdout);
  const analysis=JSON.parse(fs.readFileSync(reportPath,'utf8'));
  const workflow=analysis.sourceModel.workflow;
  const execution=workflow.tableTransformPlan.execution;
  assert.strictEqual(execution.executable,true,JSON.stringify(execution.diagnostics));
  assert.strictEqual(workflow.blueprint.buildable,true);
  const effect=execution.hostEffects.find(row=>row.kind==='csv-export-table');
  assert(effect,'to_csv must become a mapped Host Export effect.');
  assert.strictEqual(effect.input,'grouped');
  assert.strictEqual(effect.defaultName,'group summary.csv','Source path must be reduced to a basename before runtime packaging.');
  assert.strictEqual(effect.sep,';');
  assert.strictEqual(effect.naRep,'NA');
  assert.deepStrictEqual(effect.columns,['signal']);
  assert.strictEqual(effect.encoding,'utf-8-sig');
  assert.strictEqual(effect.lineTerminator,'\r\n');
  const hostEffect=workflow.blueprint.task.hostEffects.find(row=>row.kind==='csv-export-table');
  assert(hostEffect);
  assert.strictEqual(hostEffect.resultPath,'rawTables.grouped','CSV export must preserve the internal DataFrame index until Host serialization.');
  assert.strictEqual(hostEffect.defaultName,'group summary.csv');

  const packagePath=path.join(temp,'csv-export.dkplugin');
  const buildReport=path.join(temp,'build.json');
  run=spawnSync(py.cmd,[...py.prefix,importer,'build',source,'--function-id','workflow:table-transform','--package',packagePath,'--report',buildReport],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(run.status,0,run.stderr||run.stdout);
  const pkg=JSON.parse(fs.readFileSync(packagePath,'utf8'));
  const pluginJs=pkg.files['plugin.js'];
  const taskEntry=pkg.manifest.tasks[0].entry;
  const taskJs=pkg.files[taskEntry];
  assert(pkg.manifest.requiresCore.includes('io'),'Mapped Host Export must declare Core io dependency.');
  assert(pluginJs.includes("nativeSave:'export'"),'The generated run control must explicitly own one native export intent.');
  assert(pluginJs.includes('ctx.io.saveText('),'CSV write must execute through the Plugin API Host I/O facade.');
  assert(pluginJs.includes("['rawTables','grouped']")||pluginJs.includes('["rawTables","grouped"]'),'Host Export must read the raw grouped DataFrame result.');
  assert(pluginJs.includes("defaultName:'group summary.csv'")||pluginJs.includes('"group summary.csv"'),'Only the basename may survive into generated runtime.');
  assert(!pluginJs.includes('reports/group summary.csv'),'Source-authored directories must never become runtime write authority.');
  assert(taskJs.includes('rawTables')&&taskJs.includes('cloneTable'),'Core Task must return detached raw table snapshots for Host effects.');
  assert(!/ctx\.io|saveText\(|to_csv|showSave|writeFile|electron/i.test(taskJs),'Compute Worker must contain no Host/file I/O path.');
  require('../desktop/plugin-package').normalizePluginPackage(pkg,{allowBuiltinId:false});

  const context={self:{}};
  vm.createContext(context);
  vm.runInContext(taskJs,context,{filename:'generated-csv-export-task.js'});
  const result=await context.self.DKDSTaskDefinition.run({raw:{
    kind:'data.table',artifactId:'table:csv',rowCount:4,
    columns:[
      {id:'group',key:'group',name:'group',dtype:'string',values:['A','A','B','B']},
      {id:'signal',key:'signal',name:'signal',dtype:'number',values:[1,3,2,4]},
      {id:'offset',key:'offset',name:'offset',dtype:'number',values:[10,30,20,40]}
    ]
  }},{});
  assert.deepStrictEqual(plain(result.rawTables.grouped.index),['A','B'],'Raw Host table must retain the grouped index.');
  assert.deepStrictEqual(plain(result.rawTables.grouped.indexNames),['group']);
  assert.deepStrictEqual(result.rawTables.grouped.columns.map(c=>c.key),['signal','offset']);
  assert.deepStrictEqual(result.tables.grouped.columns.map(c=>c.key),['group','signal','offset'],'Canonical published table may materialize the grouped index separately.');

  const exportOnly=path.join(temp,'export_only.py');
  fs.writeFileSync(exportOnly,`import pandas as pd
raw = pd.read_csv("measurement.csv")
raw.to_csv("result.csv", index=False)
`,'utf8');
  const exportOnlyReport=path.join(temp,'export-only.json');
  run=spawnSync(py.cmd,[...py.prefix,importer,'analyze',exportOnly,'--output',exportOnlyReport],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(run.status,0,run.stderr||run.stdout);
  const exportOnlyWorkflow=JSON.parse(fs.readFileSync(exportOnlyReport,'utf8')).sourceModel.workflow;
  assert.strictEqual(exportOnlyWorkflow.tableTransformPlan.execution.executable,true);
  assert.deepStrictEqual(exportOnlyWorkflow.tableTransformPlan.execution.resultSymbols,[]);
  assert.strictEqual(exportOnlyWorkflow.blueprint.buildable,true,'A pure Host-export workflow must not require an artificial terminal DataFrame result.');

  const bad=path.join(temp,'bad_export.py');
  fs.writeFileSync(bad,`import pandas as pd
raw = pd.read_csv("measurement.csv")
raw.to_csv()
raw.to_csv("compressed.csv", compression="gzip")
raw.to_excel("result.xlsx")
`,'utf8');
  const badReport=path.join(temp,'bad.json');
  run=spawnSync(py.cmd,[...py.prefix,importer,'analyze',bad,'--output',badReport],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(run.status,0,run.stderr||run.stdout);
  const blocked=JSON.parse(fs.readFileSync(badReport,'utf8')).sourceModel.workflow.tableTransformPlan.execution;
  assert.strictEqual(blocked.executable,false);
  assert(blocked.diagnostics.some(row=>row.code==='TABLE_TASK_CSV_EXPORT_PATH_REQUIRED'));
  assert(blocked.diagnostics.some(row=>row.code==='TABLE_TASK_CSV_EXPORT_KWARGS_UNSUPPORTED'));
  assert(blocked.diagnostics.some(row=>row.code==='TABLE_TASK_EXPORT_METHOD_PENDING'));

  const multiple=path.join(temp,'multiple_export.py');
  fs.writeFileSync(multiple,`import pandas as pd
raw = pd.read_csv("measurement.csv")
raw.to_csv("one.csv")
raw.to_csv("two.csv")
`,'utf8');
  const multipleReport=path.join(temp,'multiple.json');
  run=spawnSync(py.cmd,[...py.prefix,importer,'analyze',multiple,'--output',multipleReport],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(run.status,0,run.stderr||run.stdout);
  const multipleExecution=JSON.parse(fs.readFileSync(multipleReport,'utf8')).sourceModel.workflow.tableTransformPlan.execution;
  assert.strictEqual(multipleExecution.executable,false);
  assert(multipleExecution.diagnostics.some(row=>row.code==='TABLE_TASK_CSV_EXPORT_MULTIPLE'),'One workflow action must consume at most one native save intent.');

  const contract=JSON.parse(fs.readFileSync(path.join(root,'sdk','contract.json'),'utf8'));
  assert.strictEqual(contract.sdkVersion,'1.51.80');
  console.log('SDK 1.51.80 to_csv Host Export PASS: bounded DataFrame CSV serialization -> explicit native export intent -> ctx.io.saveText; compute Worker remains I/O-free.');
}finally{
  fs.rmSync(temp,{recursive:true,force:true});
}
})().catch(err=>{console.error(err);process.exitCode=1;});
