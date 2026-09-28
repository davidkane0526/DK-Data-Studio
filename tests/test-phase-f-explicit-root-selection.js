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
  throw new Error('Python 3 is required for explicit-root selection gate.');
}
function notebook(cells){return {nbformat:4,nbformat_minor:5,metadata:{},cells:cells.map((source,index)=>({cell_type:'code',metadata:{},execution_count:index+1,outputs:[],source:source.split(/(?<=\n)/)}))};}
function analyze(py,temp,name,source,rootIds=null){
  const report=path.join(temp,name+'.json');
  const args=[...py.prefix,importer,'analyze',source,'--output',report];
  if(rootIds)for(const id of rootIds)args.push('--root-id',id);
  const run=spawnSync(py.cmd,args,{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(run.status,0,run.stderr||run.stdout);
  return JSON.parse(fs.readFileSync(report,'utf8'));
}
const py=pythonCommand();
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-explicit-root-'));
try{
  const source=path.join(temp,'multi-root.ipynb');
  fs.writeFileSync(source,JSON.stringify(notebook([
    'import pandas as pd\nraw = pd.read_csv("demo.csv")\n',
    'left = raw.abs()\n',
    'left.plot(title="Left")\n',
    'right = raw.dropna()\n',
    'metric = right["signal"].mean()\n'
  ]),null,2),'utf8');

  const automatic=analyze(py,temp,'auto',source);
  let slice=automatic.sourceModel.workflow.tableTransformPlan.workflowSlice;
  assert.strictEqual(slice.selectionMode,'all-observable');
  assert.deepStrictEqual(slice.rootCandidates.map(row=>row.id),['root:left','root:metric']);
  assert.deepStrictEqual(slice.selectedRootIds,['root:left','root:metric']);
  assert.deepStrictEqual(slice.includedCells,[0,1,2,3,4]);
  assert.strictEqual(automatic.sourceModel.workflow.blueprint.buildable,true);

  const left=analyze(py,temp,'left',source,['root:left']);
  slice=left.sourceModel.workflow.tableTransformPlan.workflowSlice;
  assert.strictEqual(slice.selectionMode,'explicit');
  assert.deepStrictEqual(slice.rootCandidates.map(row=>row.id),['root:left','root:metric'],'Explicit selection must preserve the full candidate set.');
  assert.deepStrictEqual(slice.selectedRootIds,['root:left']);
  assert.deepStrictEqual(slice.includedCells,[0,1,2]);
  assert.deepStrictEqual(slice.prunedCells,[3,4]);
  assert.strictEqual(left.sourceModel.workflow.tableTransformPlan.execution.resultSymbols.join(','),'left');
  assert.strictEqual(left.sourceModel.workflow.tableTransformPlan.execution.resultKinds.left,'table');
  assert(left.sourceModel.workflow.tableTransformPlan.execution.hostEffects.some(row=>row.kind==='scientific-plot'&&row.input==='left'));
  assert.strictEqual(left.sourceModel.workflow.blueprint.buildable,true);
  assert.deepStrictEqual(left.sourceModel.workflow.blueprint.preview.workflowSlice.selectedRootIds,['root:left']);
  assert.deepStrictEqual(left.sourceModel.workflow.blueprint.preview.resultSymbols,['left']);

  const metric=analyze(py,temp,'metric',source,['root:metric']);
  slice=metric.sourceModel.workflow.tableTransformPlan.workflowSlice;
  assert.deepStrictEqual(slice.selectedRootIds,['root:metric']);
  assert.deepStrictEqual(slice.includedCells,[0,3,4]);
  assert.deepStrictEqual(slice.prunedCells,[1,2]);
  assert.deepStrictEqual(metric.sourceModel.workflow.tableTransformPlan.execution.resultSymbols,['metric']);
  assert.strictEqual(metric.sourceModel.workflow.tableTransformPlan.execution.resultKinds.metric,'scalar');
  assert.deepStrictEqual(metric.sourceModel.workflow.tableTransformPlan.execution.hostEffects,[],'Unselected plot branch must not leak Host effects into the generated workflow.');

  const pkgPath=path.join(temp,'metric.dkplugin'),buildReport=path.join(temp,'metric-build.json');
  let run=spawnSync(py.cmd,[...py.prefix,importer,'build',source,'--function-id','workflow:table-transform','--package',pkgPath,'--report',buildReport,'--root-id','root:metric'],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(run.status,0,run.stderr||run.stdout);
  const built=JSON.parse(fs.readFileSync(buildReport,'utf8'));
  assert.strictEqual(built.source.selectionMode,'explicit');
  assert.deepStrictEqual(built.source.selectedRootIds,['root:metric'],'Build must consume the same explicit roots as preview analysis.');
  const pkg=JSON.parse(fs.readFileSync(pkgPath,'utf8'));
  require('../desktop/plugin-package').normalizePluginPackage(pkg,{allowBuiltinId:false});
  assert(!Object.keys(pkg.files).some(name=>/\.(?:py|ipynb|pyc)$/i.test(name)));

  const unknown=analyze(py,temp,'unknown',source,['root:not-present']);
  const unknownSlice=unknown.sourceModel.workflow.tableTransformPlan.workflowSlice;
  assert.strictEqual(unknownSlice.selectionMode,'explicit');
  assert.strictEqual(unknownSlice.buildable,false);
  assert(unknownSlice.diagnostics.some(row=>row.code==='WORKFLOW_SLICE_ROOT_UNKNOWN'));
  assert(unknownSlice.diagnostics.some(row=>row.code==='WORKFLOW_SLICE_NO_ROOTS_SELECTED'));
  assert.strictEqual(unknown.sourceModel.workflow.blueprint.buildable,false);
  run=spawnSync(py.cmd,[...py.prefix,importer,'build',source,'--function-id','workflow:table-transform','--package',path.join(temp,'bad.dkplugin'),'--report',path.join(temp,'bad.json'),'--root-id','root:not-present'],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(run.status,2,'Unknown explicit root must fail package generation.');

  run=spawnSync(py.cmd,[...py.prefix,importer,'analyze',source,'--output',path.join(temp,'too-many.json'),...Array.from({length:65},(_,i)=>['--root-id','root:r'+i]).flat()],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(run.status,2,'Python CLI must enforce the same 64-root bound as Desktop authoring.');
  run=spawnSync(py.cmd,[...py.prefix,importer,'analyze',source,'--output',path.join(temp,'too-long.json'),'--root-id','root:'+('x'.repeat(300))],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(run.status,2,'Python CLI must reject overlong root ids before slicing.');

  const runtime=fs.readFileSync(path.join(root,'desktop','main-modules','plugin-authoring-runtime.js'),'utf8');
  const preload=fs.readFileSync(path.join(root,'desktop','preload.js'),'utf8');
  const ui=fs.readFileSync(path.join(root,'src','core','plugins','plugin-authoring-ui.js'),'utf8');
  assert.doesNotThrow(()=>new Function(runtime));assert.doesNotThrow(()=>new Function(preload));assert.doesNotThrow(()=>new Function(ui));
  assert(runtime.includes("plugins:authoringSelectRoots")&&runtime.includes("'--root-id'")&&runtime.includes('normalizeRootIds'),'Desktop authoring runtime must thread a bounded explicit-root selection through the same Python analyzer/build path.');
  assert(preload.includes('pluginAuthoringSelectRoots'),'Preload must expose the existing authoring IPC surface for root selection.');
  assert(ui.includes('data-authoring-root')&&ui.includes('pluginAuthoringSelectRoots')&&ui.includes('恢复自动全部'),'Plugin Manager must expose explicit root selection and a return to all-observable mode.');
  assert(ui.includes("slice.selectionMode==='explicit'?slice.selectedRootIds:null"),'Build must carry explicit rootIds from the currently previewed workflow slice.');
  console.log('Phase F explicit root selection PASS: all-observable default -> explicit root subset -> shared dependency slice -> preview/build parity -> unknown roots fail closed.');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
