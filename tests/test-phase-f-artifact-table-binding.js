'use strict';
const assert=require('assert');
const fs=require('fs');
const os=require('os');
const path=require('path');
const {spawnSync}=require('child_process');

const root=path.resolve(__dirname,'..');
const pyEnv={...process.env,PYTHONDONTWRITEBYTECODE:'1',PYTHONIOENCODING:'utf-8'};
function python(){
  const rows=process.platform==='win32'?[['python',[]],['py',['-3']],['python3',[]]]:[['python3',[]],['python',[]]];
  for(const [cmd,prefix] of rows){
    const r=spawnSync(cmd,[...prefix,'--version'],{encoding:'utf8',env:pyEnv});
    if(!r.error&&r.status===0)return {cmd,prefix};
  }
  throw new Error('Python 3 is required for artifact-table generator gate.');
}
const py=python();
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-artifact-table-'));
try{
  const buildPy=path.join(temp,'build.py');
  fs.writeFileSync(buildPy,`
import sys
from pathlib import Path
sys.path.insert(0, str(Path(r"${root.replaceAll('\\','\\\\')}") / "sdk" / "python"))
from dkds_plugin_gen import PluginBuilder

spec={
  "schema":"dkds.declarative-plugin.v1",
  "plugin":{"id":"com.example.artifact-table","name":"Artifact Table","version":"1.0.0","description":"artifact-table binding gate"},
  "page":{"id":"artifact-table","label":"Artifact Table","title":"Artifact Table"},
  "workspace":{"activity":"artifact-table","primaryRole":"scientific-primary","primaryLabel":"Main","primaryScroll":"safe","mainLayout":"stack-comfortable"},
  "host":{"kind":"top","label":"Artifact Table","contextLabel":"Artifact Table","icon":"◇","window":{"title":"Artifact Table","width":1000,"height":700,"minWidth":800,"minHeight":500,"reuse":True,"persistence":"project","artifactHydration":"live"}},
  "data":{"accepts":["data.table"]},
  "actions":[{"id":"run","label":"Run","variant":"primary","statusMessage":"Running"}],
  "content":[{"kind":"metrics","id":"shape","items":[{"id":"columns","label":"Columns","value":"—"},{"id":"rows","label":"Rows","value":"—"}]}]
}
source="""def table_shape(table: dict) -> dict:
    return {"columns": len(table["columns"]), "rows": table["rowCount"]}
"""
builder=PluginBuilder(spec)
builder.add_portable_task(
  "table-shape",source,function_name="table_shape",action_id="run",
  input_bindings={"table":{"kind":"artifact-table","source":{"kind":"data.table","index":0,"includeExcluded":False},"maxRows":8192,"maxColumns":64}},
  result_metrics=[{"id":"columns","key":"columns"},{"id":"rows","key":"rows"}],
  success_status="Done"
)
builder.write(Path(sys.argv[1]))
`,'utf8');

  const out=path.join(temp,'out');
  let run=spawnSync(py.cmd,[...py.prefix,buildPy,out],{cwd:root,encoding:'utf8',env:pyEnv});
  assert.strictEqual(run.status,0,run.stderr||run.stdout);
  const source=fs.readFileSync(path.join(out,'plugin.js'),'utf8');
  const manifest=JSON.parse(fs.readFileSync(path.join(out,'plugin.json'),'utf8'));
  assert.strictEqual(manifest.apiVersion,'1.19.0');
  assert(manifest.tasks?.length===1&&manifest.requiresCore.includes('execution.tasks'));
  assert(source.includes('ctx.data.artifacts.columnMetadata('),'artifact-table binding must enumerate structure through metadata-only access.');
  assert(source.includes('ctx.data.artifacts.readColumnRange('),'artifact-table binding must hydrate each column through bounded range reads.');
  assert(source.includes("kind:'data.table'")&&source.includes('rowCount:'),'artifact-table payload must be a detached structured-cloneable table snapshot.');
  assert(source.includes('exceeds declared maxColumns 64')&&source.includes('exceeds declared maxRows 8192'),'artifact-table binding must enforce explicit row/column bounds.');
  assert(!source.includes('ctx.data.artifacts.get('),'artifact-table binding must not hydrate a complete Artifact through get().');
  const validator=path.join(root,'sdk','tools','dkds-plugin.js');
  run=spawnSync(process.execPath,[validator,'validate',out],{cwd:root,encoding:'utf8'});
  assert.strictEqual(run.status,0,run.stderr||run.stdout);
  console.log('Phase F artifact-table binding PASS: metadata-only discovery + bounded all-column snapshot + Core Task Runner.');
}finally{
  fs.rmSync(temp,{recursive:true,force:true});
}
