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
  throw new Error('Python 3 is required for multi-cell dependency graph gate.');
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
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-multicell-dag-'));
try{
  const ordered=analyze(py,temp,'out-of-order',[
    'clean = raw.abs()\n',
    'import pandas as pd\nraw = pd.read_csv("demo.csv")\n',
    'result = clean.dropna()\nresult.plot()\n'
  ]);
  const workflow=ordered.report.sourceModel.workflow;
  const graph=workflow.dependencyGraph;
  assert.strictEqual(graph.schema,'dkds.cell-dependency-graph.v1');
  assert.deepStrictEqual(graph.sourceOrder,[0,1,2]);
  assert.deepStrictEqual(graph.topologicalOrder,[1,0,2],'A unique forward producer must determine execution order rather than notebook display order.');
  assert.strictEqual(graph.reordered,true);
  assert.strictEqual(graph.acyclic,true);
  assert.strictEqual(graph.buildable,true);
  assert(graph.edges.some(row=>row.from==='cell:1'&&row.to==='cell:0'&&row.symbol==='raw'));
  assert(graph.edges.some(row=>row.from==='cell:0'&&row.to==='cell:2'&&row.symbol==='clean'));
  assert.deepStrictEqual(workflow.tableTransformPlan.cellOrder,[1,0,2],'Table Transform lowering must consume the graph topological order.');
  const ops=workflow.tableTransformPlan.operations;
  const sourceIndex=ops.findIndex(row=>row.kind==='source.table'&&row.output==='raw');
  const absIndex=ops.findIndex(row=>row.kind==='table.abs'&&row.output==='clean'&&row.input==='raw');
  const dropIndex=ops.findIndex(row=>row.kind==='table.dropna'&&row.output==='result'&&row.input==='clean');
  assert(sourceIndex>=0&&sourceIndex<absIndex&&absIndex<dropIndex,'Lowered operations must respect DAG producer order.');
  assert.strictEqual(workflow.blueprint.buildable,true);

  const pkgPath=path.join(temp,'out-of-order.dkplugin'),buildReport=path.join(temp,'out-of-order-build.json');
  let run=spawnSync(py.cmd,[...py.prefix,importer,'build',ordered.source,'--function-id','workflow:table-transform','--package',pkgPath,'--report',buildReport],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(run.status,0,run.stderr||run.stdout);
  const pkg=JSON.parse(fs.readFileSync(pkgPath,'utf8'));
  require('../desktop/plugin-package').normalizePluginPackage(pkg,{allowBuiltinId:false});
  assert(!Object.keys(pkg.files).some(name=>/\.(?:py|ipynb|pyc)$/i.test(name)),'Multi-cell DAG packaging must remain authoring-only Python.');

  const ambiguous=analyze(py,temp,'ambiguous',[
    'clean = raw.abs()\n',
    'import pandas as pd\nraw = pd.read_csv("a.csv")\n',
    'import pandas as pd\nraw = pd.read_csv("b.csv")\n'
  ]).report.sourceModel.workflow;
  assert.strictEqual(ambiguous.dependencyGraph.buildable,false);
  const ambiguousDiag=ambiguous.dependencyGraph.diagnostics.find(row=>row.code==='WORKFLOW_SYMBOL_PRODUCER_AMBIGUOUS'&&row.symbol==='raw');
  assert(ambiguousDiag&&JSON.stringify(ambiguousDiag.producerCellIndexes)==='[1,2]','Multiple producers must fail closed instead of guessing notebook execution state.');
  assert.strictEqual(ambiguous.blueprint.buildable,false);

  const redefined=analyze(py,temp,'redefined',[
    'import pandas as pd\nraw = pd.read_csv("demo.csv")\n',
    'raw = raw.dropna()\n',
    'result = raw.abs()\n'
  ]).report.sourceModel.workflow;
  assert.strictEqual(redefined.dependencyGraph.buildable,true,'Sequential cross-cell reassignment must bind to the latest prior producer.');
  assert(redefined.dependencyGraph.edges.some(row=>row.from==='cell:0'&&row.to==='cell:1'&&row.symbol==='raw'));
  assert(redefined.dependencyGraph.edges.some(row=>row.from==='cell:1'&&row.to==='cell:2'&&row.symbol==='raw'));
  assert.deepStrictEqual(redefined.tableTransformPlan.cellOrder,[0,1,2]);

  const cyclic=analyze(py,temp,'cycle',['a = b.abs()\n','b = a.abs()\n']).report.sourceModel.workflow;
  assert.strictEqual(cyclic.dependencyGraph.acyclic,false);
  assert(cyclic.dependencyGraph.diagnostics.some(row=>row.code==='WORKFLOW_DEPENDENCY_CYCLE'));
  assert.strictEqual(cyclic.tableTransformPlan.execution.executable,false);

  const unresolved=analyze(py,temp,'unresolved',['clean = raw.abs()\n']).report.sourceModel.workflow;
  assert(unresolved.dependencyGraph.diagnostics.some(row=>row.code==='WORKFLOW_SYMBOL_UNRESOLVED'&&row.symbol==='raw'));
  assert.strictEqual(unresolved.blueprint.buildable,false);

  const sameCell=analyze(py,temp,'same-cell',['import pandas as pd\nraw = pd.read_csv("demo.csv")\nclean = raw.abs()\n']).report.sourceModel.workflow;
  assert.strictEqual(sameCell.dependencyGraph.buildable,true,'Definitions earlier in the same cell must satisfy immediate reads without fake cross-cell edges.');
  assert.strictEqual(sameCell.dependencyGraph.edgeCount,0);

  console.log('Phase F multi-cell DAG PASS: immediate top-level reads -> unique producers -> stable topo order -> graph-driven Table Transform/package; ambiguous/cyclic/unresolved state fails closed.');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
