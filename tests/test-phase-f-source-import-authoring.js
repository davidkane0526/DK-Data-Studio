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
  for(const [cmd,prefix] of rows){const probe=spawnSync(cmd,[...prefix,'--version'],{encoding:'utf8',env:pythonEnv});if(!probe.error&&probe.status===0)return {cmd,prefix};}
  throw new Error('Python 3 is required for source-import authoring gate.');
}
const py=pythonCommand();
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-source-import-'));
try{
  const source=path.join(temp,'analysis.py');
  fs.writeFileSync(source,`def analyze_curve(sample_count: int=5, gain: float=2.0, normalize: bool=False) -> dict:\n    points=[]\n    for i in range(sample_count):\n        x=i\n        y=x*gain\n        if normalize:\n            y=y/(1+abs(y))\n        points.append({"x":x,"y":y})\n    return {"points":points,"count":len(points)}\n\ndef unsupported(values: list) -> dict:\n    return {"points": [x*x for x in values]}\n`,'utf8');
  const report=path.join(temp,'analysis.json');
  let run=spawnSync(py.cmd,[...py.prefix,importer,'analyze',source,'--output',report],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(run.status,0,run.stderr||run.stdout);
  const parsed=JSON.parse(fs.readFileSync(report,'utf8'));
  assert.strictEqual(parsed.sourceModel.schema,'dkds.python-source-model.v1');
  assert.strictEqual(parsed.sourceModel.kind,'python');
  assert.strictEqual(parsed.sourceModel.functions.length,2);
  const good=parsed.sourceModel.functions.find(row=>row.name==='analyze_curve');
  const bad=parsed.sourceModel.functions.find(row=>row.name==='unsupported');
  assert(good.compatibility.portable&&good.blueprint.buildable,'Portable function must produce a buildable declarative blueprint.');
  assert(good.parameters.some(row=>row.name==='gain'&&row.default===2),'Signature analysis must preserve scalar defaults.');
  assert(good.blueprint.preview.outputs.some(row=>row.kind==='plot'),'points result must infer a Unit ScientificPlot preview.');
  assert(good.blueprint.preview.outputs.some(row=>row.kind==='metric'&&row.label==='count'),'scalar dict result must infer a Unit metric preview.');
  assert(!bad.compatibility.portable,'List comprehension must remain fail-closed.');
  assert(bad.compatibility.diagnostics[0].line>=bad.line,'Compatibility diagnostic must identify a concrete source line.');

  const pkgPath=path.join(temp,'generated.dkplugin'),buildReport=path.join(temp,'build.json');
  run=spawnSync(py.cmd,[...py.prefix,importer,'build',source,'--function-id',good.id,'--package',pkgPath,'--report',buildReport],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(run.status,0,run.stderr||run.stdout);
  const pkg=JSON.parse(fs.readFileSync(pkgPath,'utf8'));
  assert.strictEqual(pkg.schema,1);
  assert.strictEqual(pkg.manifest.apiVersion,'1.19.0');
  assert(pkg.manifest.tasks?.length===1&&pkg.manifest.requiresCore.includes('execution.tasks'));
  assert(!Object.keys(pkg.files).some(name=>/\.py(?:c|o)?$/i.test(name)),'Generated package must contain no Python source/bytecode.');
  assert(Object.values(pkg.files).every(value=>!String(value).includes('def analyze_curve')),'Generated package must not carry user Python source.');
  require('../desktop/plugin-package').normalizePluginPackage(pkg,{allowBuiltinId:false});

  const notebook=path.join(temp,'analysis.ipynb');
  fs.writeFileSync(notebook,JSON.stringify({nbformat:4,nbformat_minor:5,metadata:{},cells:[
    {cell_type:'markdown',metadata:{},source:['demo']},
    {cell_type:'code',metadata:{},execution_count:null,outputs:[],source:['%matplotlib inline\\n','def notebook_task(value: float=1.0) -> dict:\\n','    return {"result": value*2}\\n']}
  ]},null,2));
  const notebookReport=path.join(temp,'notebook.json');
  run=spawnSync(py.cmd,[...py.prefix,importer,'analyze',notebook,'--output',notebookReport],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(run.status,0,run.stderr||run.stdout);
  const nb=JSON.parse(fs.readFileSync(notebookReport,'utf8'));
  assert.strictEqual(nb.sourceModel.kind,'jupyter');
  assert(nb.sourceModel.functions.some(row=>row.name==='notebook_task'&&row.cellIndex===1),'Notebook code cells must feed the same Source Model.');
  assert(nb.diagnostics.some(row=>row.code==='NOTEBOOK_MAGIC_UNSUPPORTED'&&row.cellIndex===1&&row.line===1),'Notebook magic diagnostics must preserve cell/line coordinates.');

  const runtime=fs.readFileSync(path.join(root,'desktop','main-modules','plugin-authoring-runtime.js'),'utf8');
  assert(runtime.includes("sourceExecuted:false")&&runtime.includes("runtimePythonRequired:false"),'Desktop authoring host must explicitly preserve authoring-only Python semantics.');
  assert(runtime.includes('pluginInstallPlan(raw)')&&runtime.includes("generatedBy:'python-source-import'"),'Generated packages must reuse the existing Plugin Manager validation/install transaction.');
  const manager=fs.readFileSync(path.join(root,'src','core','plugins','manager-ui.js'),'utf8');
  assert(manager.includes('pluginAuthoringSelectSource')&&manager.includes('pluginAuthoringBuild')&&manager.includes('pluginAuthoringInstall'),'Plugin Manager must expose source import, build/validate and direct install actions.');
  console.log('Phase F source import authoring PASS: .py/.ipynb -> Source Model -> line diagnostics -> blueprint -> package -> Plugin Manager transaction.');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
