'use strict';
const assert=require('assert');
const fs=require('fs');
const os=require('os');
const path=require('path');
const vm=require('vm');
const {spawnSync}=require('child_process');

const root=path.resolve(__dirname,'..');
const compilerDir=path.join(root,'sdk','python');
const pythonEnv={...process.env,PYTHONDONTWRITEBYTECODE:'1',PYTHONIOENCODING:'utf-8'};
function pythonCommand(){
  const rows=process.platform==='win32'?[['python',[]],['py',['-3']],['python3',[]]]:[['python3',[]],['python',[]]];
  for(const [cmd,prefix] of rows){
    const probe=spawnSync(cmd,[...prefix,'--version'],{encoding:'utf8',env:pythonEnv});
    if(!probe.error&&probe.status===0)return {cmd,prefix};
  }
  throw new Error('Python 3 is required for Table Transform Task gate.');
}
const py=pythonCommand();
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-table-task-'));
(async()=>{
try{
  const helper=path.join(temp,'compile.py');
  fs.writeFileSync(helper,`
import json,sys
sys.path.insert(0,r"${compilerDir.replaceAll('\\','\\\\')}")
from dkds_table_transform_task import analyze_table_transform_execution,compile_table_transform_task
plan={
 "schema":"dkds.table-transform-plan.v1","operations":[
  {"id":"op:0:1:0","kind":"source.table","cellIndex":0,"line":1,"output":"raw","originalFormat":"csv","hostCapability":"data.import","replacement":"scoped DKDS DataTable input"},
  {"id":"op:0:2:1","kind":"table.abs","cellIndex":0,"line":2,"output":"clean","input":"raw","args":[],"kwargs":{}},
  {"id":"op:0:3:2","kind":"table.diff","cellIndex":0,"line":3,"output":"delta","input":"clean","args":[],"kwargs":{}},
  {"id":"op:0:4:3","kind":"table.dropna","cellIndex":0,"line":4,"output":"out","input":"delta","args":[],"kwargs":{}}
 ],"diagnostics":[],"statementCount":4,"lowerableStatementCount":4,"coverage":1.0,"buildable":True,"sourceExecuted":False
}
report=analyze_table_transform_execution(plan)
task=compile_table_transform_task(plan,"table-transform-gate")
open(sys.argv[1],"w",encoding="utf-8").write(task.source)
open(sys.argv[2],"w",encoding="utf-8").write(json.dumps({"report":report,"parameters":list(task.parameters),"entry":task.entry},indent=2))
host={**plan,"operations":[*plan["operations"],{"id":"op:0:5:4","kind":"view.plot","cellIndex":0,"line":5,"input":"out","sourceMethod":"plot","hostCapability":"scientific.plot","args":[],"kwargs":{}}]}
open(sys.argv[3],"w",encoding="utf-8").write(json.dumps(analyze_table_transform_execution(host),indent=2))
`,'utf8');

  const taskPath=path.join(temp,'task.js'),metaPath=path.join(temp,'meta.json'),hostPath=path.join(temp,'host.json');
  const run=spawnSync(py.cmd,[...py.prefix,helper,taskPath,metaPath,hostPath],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(run.status,0,run.stderr||run.stdout);
  const meta=JSON.parse(fs.readFileSync(metaPath,'utf8'));
  assert.strictEqual(meta.report.schema,'dkds.table-transform-execution.v1');
  assert.strictEqual(meta.report.executable,true);
  assert.deepStrictEqual(meta.parameters,['raw']);
  assert.deepStrictEqual(meta.report.resultSymbols,['out']);
  const source=fs.readFileSync(taskPath,'utf8');
  assert(source.includes('self.DKDSTaskDefinition')&&source.includes('normalizeTable')&&source.includes('readColumnRange')===false,'Compiler must emit ordinary compute Task source without host/store access.');

  const context={self:{}};
  vm.createContext(context);
  vm.runInContext(source,context,{filename:'generated-table-transform.js'});
  const input={raw:{
    kind:'data.table',artifactId:'table:1',rowCount:3,
    columns:[
      {id:'x',key:'x',name:'x',dtype:'number',values:[1,2,4]},
      {id:'y',key:'y',name:'y',dtype:'number',values:[-2,-4,-8]}
    ]
  }};
  const result=await context.self.DKDSTaskDefinition.run(input,{});
  assert(result?.tables?.out,'Executable lowering must return the terminal DataTable snapshot.');
  assert.deepStrictEqual(Array.from(result.tables.out.columns[0].values),[1,2]);
  assert.deepStrictEqual(Array.from(result.tables.out.columns[1].values),[2,4]);
  assert.strictEqual(result.tables.out.rowCount,2);

  const host=JSON.parse(fs.readFileSync(hostPath,'utf8'));
  assert.strictEqual(host.executable,true,'Mapped presentation effects must not contaminate or block compute lowering.');
  assert.deepStrictEqual(host.taskOutputSymbols,['out']);
  assert(host.hostEffects.some(row=>row.kind==='scientific-plot'&&row.line===5&&row.input==='out'),'Mapped Host effect must preserve exact source cell/line/input.');
  assert.strictEqual(host.pythonRuntimeRequired,false);
  console.log('Phase F Table Transform Task PASS: closed IR -> JavaScript Core Task semantics + separate mapped Host-effect metadata.');
}finally{
  fs.rmSync(temp,{recursive:true,force:true});
}
})().catch(err=>{console.error(err);process.exitCode=1;});
