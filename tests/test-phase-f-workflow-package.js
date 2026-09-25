'use strict';
const assert=require('assert');
const fs=require('fs');
const os=require('os');
const path=require('path');
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
  throw new Error('Python 3 is required for workflow package gate.');
}
const py=pythonCommand();
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-workflow-package-'));
try{
  const source=path.join(temp,'workflow.py');
  fs.writeFileSync(source,`import pandas as pd
raw = pd.read_csv("measurement.csv")
clean = raw.abs()
delta = clean.diff()
result = delta.dropna()
`,'utf8');

  const reportPath=path.join(temp,'analysis.json');
  let run=spawnSync(py.cmd,[...py.prefix,importer,'analyze',source,'--output',reportPath],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(run.status,0,run.stderr||run.stdout);
  const analysis=JSON.parse(fs.readFileSync(reportPath,'utf8'));
  const workflow=analysis.sourceModel.workflow;
  assert.strictEqual(analysis.sourceModel.functions.length,0,'Script-shaped workflow gate must not depend on top-level functions.');
  assert.strictEqual(workflow.tableTransformPlan.execution.executable,true);
  assert.strictEqual(workflow.blueprint.candidateId,'workflow:table-transform');
  assert.strictEqual(workflow.blueprint.buildable,true,'Single-source closed compute workflow must become a buildable candidate.');
  assert.deepStrictEqual(workflow.blueprint.preview.sourceInputs,['raw']);
  assert.deepStrictEqual(workflow.blueprint.preview.resultSymbols,['result']);

  const packagePath=path.join(temp,'workflow.dkplugin'),buildReport=path.join(temp,'build.json');
  run=spawnSync(py.cmd,[...py.prefix,importer,'build',source,'--function-id','workflow:table-transform','--package',packagePath,'--report',buildReport],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(run.status,0,run.stderr||run.stdout);
  const pkg=JSON.parse(fs.readFileSync(packagePath,'utf8'));
  const report=JSON.parse(fs.readFileSync(buildReport,'utf8'));
  assert.strictEqual(report.source.candidateKind,'table-transform-workflow');
  assert.strictEqual(pkg.schema,1);
  assert.strictEqual(pkg.manifest.apiVersion,'1.19.0');
  assert(pkg.manifest.requiresCore.includes('execution.tasks'),'Workflow package must use the Core Task Runner.');
  assert(pkg.manifest.requiresCore.includes('data.sources')&&pkg.manifest.requiresCore.includes('data.artifacts')&&pkg.manifest.requiresCore.includes('data.model'),'artifact-table input + dynamic DataTable publication must declare canonical data requirements.');
  assert.strictEqual(pkg.manifest.tasks.length,1);
  assert(pkg.manifest.data.produces.includes('generated.table-transform'));

  const pluginJs=pkg.files['plugin.js'];
  const taskEntry=pkg.manifest.tasks[0].entry;
  const taskJs=pkg.files[taskEntry];
  assert(pluginJs.includes('ctx.data.artifacts.columnMetadata(')&&pluginJs.includes('ctx.data.artifacts.readColumnRange('),'Generated workflow host must hydrate bounded artifact-table input.');
  assert(pluginJs.includes('ctx.data.model.createTable(')&&pluginJs.includes("resultPath")===false,'Generated workflow host must publish dynamic task DataTable results through canonical model/store.');
  assert(pluginJs.includes("['tables','result']")||pluginJs.includes('["tables","result"]'),'Dynamic publication must address the terminal workflow result path.');
  assert(!pluginJs.includes('ctx.data.artifacts.get('),'Generated workflow must not reintroduce full Artifact hydration.');
  assert(taskJs.includes('self.DKDSTaskDefinition')&&!/pandas|read_csv|python/i.test(taskJs),'Packaged compute task must be JavaScript-only and contain no Python/Pandas carrier.');
  assert(!Object.keys(pkg.files).some(name=>/\.(?:py|ipynb|pyc)$/i.test(name)),'Workflow package must not contain source Python/Notebook files.');
  require('../desktop/plugin-package').normalizePluginPackage(pkg,{allowBuiltinId:false});

  const multi=path.join(temp,'multi.py');
  fs.writeFileSync(multi,`import pandas as pd
a = pd.read_csv("a.csv")
b = pd.read_csv("b.csv")
c = pd.concat([a,b], ignore_index=True)
`,'utf8');
  const multiReport=path.join(temp,'multi.json');
  run=spawnSync(py.cmd,[...py.prefix,importer,'analyze',multi,'--output',multiReport],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(run.status,0,run.stderr||run.stdout);
  const multiAnalysis=JSON.parse(fs.readFileSync(multiReport,'utf8'));
  const multiple=multiAnalysis.sourceModel.workflow.blueprint;
  assert.strictEqual(multiple.buildable,true,'Multi-source workflow must become buildable only through explicit Unit Source Picker fields.');
  assert.deepStrictEqual(multiple.preview.sourceInputs,['a','b']);
  assert(multiple.preview.sourceBindings.some(row=>row.symbol==='a'&&row.hint==='a.csv')&&multiple.preview.sourceBindings.some(row=>row.symbol==='b'&&row.hint==='b.csv'),'Source hints must survive read_csv lowering for picker labeling/matching.');
  assert.strictEqual(multiple.spec.parameters.fields.length,2);
  assert(multiple.spec.parameters.fields.every(row=>row.type==='select'&&row.options[0].value===''),'Each source input must own a public select Field with an explicit unselected state.');

  const multiPackage=path.join(temp,'multi.dkplugin'),multiBuild=path.join(temp,'multi-build.json');
  run=spawnSync(py.cmd,[...py.prefix,importer,'build',multi,'--function-id','workflow:table-transform','--package',multiPackage,'--report',multiBuild],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(run.status,0,run.stderr||run.stdout);
  const multiPkg=JSON.parse(fs.readFileSync(multiPackage,'utf8'));
  const multiJs=multiPkg.files['plugin.js'];
  assert(multiJs.includes('setOptions(options,{value:preferred,preserve:true})'),'Generated source picker must update options only through the public Field Unit handle.');
  assert(multiJs.includes("String(source_a.control?.value||'')")&&multiJs.includes("String(source_b.control?.value||'')"),'Each artifact-table binding must read its own explicit source Field.');
  assert(multiJs.includes('a.csv')&&multiJs.includes('b.csv'),'Unique source filename hints may guide explicit picker defaults.');
  assert(!multiJs.includes('document.createElement(\'option\')')&&!multiJs.includes('.innerHTML='),'Generated workflow must not bypass the Field Unit to mutate select DOM.');
  require('../desktop/plugin-package').normalizePluginPackage(multiPkg,{allowBuiltinId:false});

  const foundation=fs.readFileSync(path.join(root,'src','core','ui','modules','composition','unit-template-foundation.js'),'utf8');
  const api=fs.readFileSync(path.join(root,'sdk','plugin-api.d.ts'),'utf8');
  assert(foundation.includes('setOptions=(items=[]')&&foundation.includes("UNIT_FIELD_OPTIONS_REQUIRE_SELECT"),'Existing Field Unit must own dynamic select option mutation.');
  assert(api.includes('interface DKDSUnitFieldHandle')&&api.includes('setOptions(options?:any[]'),'Public SDK types must expose the same generic Field Unit setOptions handle.');

  console.log('Phase F workflow package PASS: no-function single/multi-source workflows -> explicit Unit Source Pickers -> bounded artifact-table -> Core Task -> dynamic canonical DataTable -> .dkplugin.');
}finally{
  fs.rmSync(temp,{recursive:true,force:true});
}
