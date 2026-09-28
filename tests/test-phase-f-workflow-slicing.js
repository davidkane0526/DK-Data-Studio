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
  throw new Error('Python 3 is required for workflow slicing gate.');
}
function notebook(cells){return {nbformat:4,nbformat_minor:5,metadata:{},cells:cells.map((source,index)=>({cell_type:'code',metadata:{},execution_count:index+1,outputs:[],source:source.split(/(?<=\n)/)}))};}
function analyze(py,temp,name,cells){
  const source=path.join(temp,name+'.ipynb'),report=path.join(temp,name+'.json');
  fs.writeFileSync(source,JSON.stringify(notebook(cells),null,2),'utf8');
  const run=spawnSync(py.cmd,[...py.prefix,importer,'analyze',source,'--output',report],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(run.status,0,run.stderr||run.stdout);
  return {source,report:JSON.parse(fs.readFileSync(report,'utf8'))};
}
const py=pythonCommand();
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-workflow-slice-'));
try{
  const sliced=analyze(py,temp,'slice-dead-cells',[
    'print(missing)\n',
    'import pandas as pd\nraw = pd.read_csv("demo.csv")\n',
    'clean = raw.abs()\n',
    'result = clean.dropna()\n',
    'result.plot(title="Result")\n',
    'def unused_helper(value):\n    return value * 2\n'
  ]);
  const workflow=sliced.report.sourceModel.workflow;
  const plan=workflow.tableTransformPlan;
  const slice=plan.workflowSlice;
  assert.strictEqual(workflow.dependencyGraph.buildable,false,'Full notebook graph should still report the unrelated unresolved exploratory cell.');
  assert(workflow.dependencyGraph.diagnostics.some(row=>row.code==='WORKFLOW_SYMBOL_UNRESOLVED'&&row.cellIndex===0&&row.symbol==='missing'));
  assert.strictEqual(slice.schema,'dkds.workflow-slice.v1');
  assert.strictEqual(slice.selectionMode,'all-observable');
  assert.deepStrictEqual(slice.includedCells,[1,2,3,4]);
  assert.deepStrictEqual(slice.prunedCells,[0,5]);
  assert.strictEqual(slice.dependencyGraph.buildable,true,'Diagnostics outside the selected observable dependency slice must not block generation.');
  assert.strictEqual(slice.buildable,true);
  assert.strictEqual(plan.sourceStatementCount,5);
  assert.strictEqual(plan.statementCount,4,'Coverage must be evaluated on the selected dependency slice, not unrelated notebook cells.');
  assert.strictEqual(plan.lowerableStatementCount,4);
  assert.strictEqual(plan.coverage,1);
  assert.strictEqual(plan.buildable,true,JSON.stringify(plan.diagnostics));
  assert.strictEqual(plan.execution.executable,true,JSON.stringify(plan.execution.diagnostics));
  assert.strictEqual(workflow.blueprint.buildable,true,JSON.stringify(workflow.blueprint.diagnostics));
  const resultRoot=slice.rootCandidates.find(row=>row.symbol==='result');
  assert(resultRoot&&resultRoot.valueKind==='table');
  assert(resultRoot.reasons.includes('terminal-result')&&resultRoot.reasons.includes('host-effect:scientific-plot'));
  assert.deepStrictEqual(slice.selectedRootIds,['root:result']);
  assert(slice.dependencyGraph.edges.some(row=>row.symbol==='raw'&&row.valueKind==='table'));
  assert(slice.dependencyGraph.edges.some(row=>row.symbol==='clean'&&row.valueKind==='table'));
  assert(slice.dependencyGraph.edges.some(row=>row.symbol==='result'&&row.valueKind==='table'));
  assert.deepStrictEqual(workflow.blueprint.preview.workflowSlice.prunedCells,[0,5],'Blueprint preview must expose exactly which notebook cells were excluded.');

  const pkgPath=path.join(temp,'slice.dkplugin'),buildReport=path.join(temp,'slice-build.json');
  let run=spawnSync(py.cmd,[...py.prefix,importer,'build',sliced.source,'--function-id','workflow:table-transform','--package',pkgPath,'--report',buildReport],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(run.status,0,run.stderr||run.stdout);
  const pkg=JSON.parse(fs.readFileSync(pkgPath,'utf8'));
  require('../desktop/plugin-package').normalizePluginPackage(pkg,{allowBuiltinId:false});
  assert(!Object.keys(pkg.files).some(name=>/\.(?:py|ipynb|pyc)$/i.test(name)));

  const kinds=analyze(py,temp,'kind-propagation',[
    'import pandas as pd\nimport numpy as np\nraw = pd.read_csv("demo.csv")\n',
    'signal = raw["signal"]\n',
    'arr = signal.to_numpy()\n',
    'metric = np.mean(arr)\n',
    'def unused(value):\n    return value\n'
  ]).report.sourceModel.workflow;
  const kindSlice=kinds.tableTransformPlan.workflowSlice;
  const kindRoot=kindSlice.rootCandidates.find(row=>row.symbol==='metric');
  assert(kindRoot&&kindRoot.valueKind==='scalar','Terminal scalar kind must come from the existing execution analyzer.');
  assert.strictEqual(kindSlice.symbolKinds.raw,'table');
  assert.strictEqual(kindSlice.symbolKinds.signal,'series');
  assert.strictEqual(kindSlice.symbolKinds.arr,'array');
  assert.strictEqual(kindSlice.symbolKinds.metric,'scalar');
  assert(kindSlice.dependencyGraph.edges.some(row=>row.symbol==='signal'&&row.valueKind==='series'));
  assert(kindSlice.dependencyGraph.edges.some(row=>row.symbol==='arr'&&row.valueKind==='array'));
  assert.deepStrictEqual(kindSlice.prunedCells,[4]);
  assert.strictEqual(kinds.tableTransformPlan.execution.resultKinds.metric,'scalar');
  assert.strictEqual(kinds.blueprint.buildable,true,JSON.stringify(kinds.blueprint.diagnostics));

  const requiredBad=analyze(py,temp,'required-bad-dependency',[
    'result = broken.abs()\n',
    'result.plot()\n'
  ]).report.sourceModel.workflow;
  assert(requiredBad.tableTransformPlan.workflowSlice.includedCells.includes(0),'A bad cell that produces an observable root must stay inside the slice.');
  assert(requiredBad.tableTransformPlan.workflowSlice.dependencyGraph.diagnostics.some(row=>row.code==='WORKFLOW_SYMBOL_UNRESOLVED'&&row.symbol==='broken'));
  assert.strictEqual(requiredBad.tableTransformPlan.workflowSlice.buildable,false);
  assert.strictEqual(requiredBad.tableTransformPlan.execution.executable,false);
  assert.strictEqual(requiredBad.blueprint.buildable,false,'Slicing must never hide blockers on the selected result path.');

  const authoringUi=fs.readFileSync(path.join(root,'src','core','plugins','plugin-authoring-ui.js'),'utf8');
  assert.doesNotThrow(()=>new Function(authoringUi));
  assert(authoringUi.includes('Dependency Slice')&&authoringUi.includes('workflowSlice.rootCandidates')&&authoringUi.includes('裁剪 Cell'),'Authoring UI must expose selected roots and slice/prune counts without introducing a second authoring surface.');

  console.log('Phase F workflow slicing PASS: observable roots -> value-kind propagation -> backward DAG slice -> unrelated-cell pruning -> existing Core Task/package path.');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
