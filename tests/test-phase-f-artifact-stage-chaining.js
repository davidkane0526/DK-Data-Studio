'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path'),{spawnSync}=require('child_process');
const root=path.resolve(__dirname,'..'),importer=path.join(root,'sdk','python','dkds_source_import.py'),pythonEnv={...process.env,PYTHONDONTWRITEBYTECODE:'1',PYTHONIOENCODING:'utf-8'};
function pythonCommand(){for(const [cmd,prefix] of (process.platform==='win32'?[['python',[]],['py',['-3']],['python3',[]]]:[['python3',[]],['python',[]]])){const probe=spawnSync(cmd,[...prefix,'--version'],{encoding:'utf8',env:pythonEnv});if(!probe.error&&probe.status===0)return {cmd,prefix};}throw new Error('Python 3 is required.');}
function notebook(cells){return {nbformat:4,nbformat_minor:5,metadata:{},cells:cells.map((source,index)=>({cell_type:'code',metadata:{},execution_count:index+1,outputs:[],source:source.split(/(?<=\n)/)}))};}
const py=pythonCommand(),temp=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-artifact-stage-chain-'));
try{
  const source=path.join(temp,'chain.ipynb');
  fs.writeFileSync(source,JSON.stringify(notebook([
    'import pandas as pd\nraw = pd.read_csv("demo.csv")\n',
    'clean = raw.dropna()\n',
    'clean.plot(title="Clean")\n',
    'final = clean.abs()\n',
    'final.plot(title="Final")\n'
  ]),null,2),'utf8');
  const analysisPath=path.join(temp,'analysis.json');
  let run=spawnSync(py.cmd,[...py.prefix,importer,'analyze',source,'--output',analysisPath],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(run.status,0,run.stderr||run.stdout);
  const workflow=JSON.parse(fs.readFileSync(analysisPath,'utf8')).sourceModel.workflow,composition=workflow.composition;
  assert.strictEqual(composition.buildable,true,JSON.stringify(composition.diagnostics));
  assert.deepStrictEqual(composition.preview.selectedRootIds,['root:clean','root:final']);
  assert.strictEqual(composition.stageDependencies.length,1);
  assert.deepStrictEqual(composition.stageDependencies[0],{
    fromStageId:'stage-1-clean',toStageId:'stage-2-final',fromRootId:'root:clean',toRootId:'root:final',symbol:'clean',valueKind:'table',mode:'artifact'
  });
  const first=composition.stages[0],second=composition.stages[1];
  assert.deepStrictEqual(first.includedCells,[0,1,2]);
  assert.deepStrictEqual(second.includedCells,[3,4],'Downstream stage must execute only cells after the selected Artifact boundary.');
  assert.deepStrictEqual(second.delegatedCells,[0,1],'Upstream source/transform cells must be delegated to the producer stage instead of recomputed.');
  assert.strictEqual(second.artifactDependencies.length,1);
  const boundary=second.artifactDependencies[0];
  assert.strictEqual(boundary.symbol,'clean');
  assert.strictEqual(boundary.artifactId,first.publishedArtifact.artifactId);
  assert.strictEqual(boundary.semanticType,first.publishedArtifact.semanticType);
  assert.strictEqual(second.task.inputBindings.clean.source.scope,'artifacts');
  assert.strictEqual(second.task.inputBindings.clean.source.artifactId,first.publishedArtifact.artifactId);
  assert.strictEqual(second.task.inputBindings.clean.sourceField,undefined,'Artifact-backed stage input must not create a fake imported-source picker.');
  assert.deepStrictEqual(composition.preview.sourceInputs,['raw'],'Only true external imported sources belong in the composition Source Picker contract.');
  assert.strictEqual(composition.spec.parameters.fields.length,1);
  assert.strictEqual(composition.spec.parameters.fields[0].id,'source-raw');
  assert(composition.spec.data.produces.includes(first.publishedArtifact.semanticType));
  assert(composition.spec.data.produces.includes(second.publishedArtifact.semanticType));

  const pkgPath=path.join(temp,'chain.dkplugin'),buildPath=path.join(temp,'build.json');
  run=spawnSync(py.cmd,[...py.prefix,importer,'build',source,'--function-id','workflow:multi-action','--package',pkgPath,'--report',buildPath],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(run.status,0,run.stderr||run.stdout);
  const pkg=JSON.parse(fs.readFileSync(pkgPath,'utf8'));
  require('../desktop/plugin-package').normalizePluginPackage(pkg,{allowBuiltinId:false});
  assert.strictEqual(pkg.manifest.tasks.length,2);
  const firstTask=pkg.manifest.tasks.find(row=>row.id===first.taskId),secondTask=pkg.manifest.tasks.find(row=>row.id===second.taskId);
  assert(firstTask&&secondTask);
  const firstTaskJs=pkg.files[firstTask.entry],secondTaskJs=pkg.files[secondTask.entry],pluginJs=pkg.files['plugin.js'];
  assert(firstTaskJs.includes('input?.["raw"]'));
  assert(!secondTaskJs.includes('input?.["raw"]'),'Downstream chained Task must not silently rehydrate/recompute the original source.');
  assert(secondTaskJs.includes('input?.["clean"]'));
  assert(pluginJs.includes('ctx.data.artifacts.listMetadata({id:__dkdsRequestedArtifact_clean,includeTransient:true})'),'Exact chained inputs must resolve through canonical ArtifactStore metadata, not data.sources.');
  assert(pluginJs.includes(first.publishedArtifact.artifactId)&&pluginJs.includes(second.publishedArtifact.artifactId));
  assert(pluginJs.includes("lineage:{parents:__dkdsSourceIds,role:'analysis'"),'Published downstream Artifact must preserve the exact consumed Artifact id in canonical lineage parents.');
  assert(pluginJs.includes('ctx.data.sources.list()'),'The upstream imported source remains on the normal scoped Source Picker contract.');
  assert(!Object.keys(pkg.files).some(name=>/\.(?:py|ipynb|pyc)$/i.test(name)));

  const faninSource=path.join(temp,'fanin.ipynb');
  fs.writeFileSync(faninSource,JSON.stringify(notebook([
    'import pandas as pd\nraw = pd.read_csv("demo.csv")\n',
    'a = raw.dropna()\n',
    'a.plot(title="A")\n',
    'b = raw.abs()\n',
    'b.plot(title="B")\n',
    'c = pd.concat([a,b], ignore_index=True)\n',
    'c.plot(title="C")\n'
  ]),null,2),'utf8');
  const faninPath=path.join(temp,'fanin.json');
  run=spawnSync(py.cmd,[...py.prefix,importer,'analyze',faninSource,'--output',faninPath],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(run.status,0,run.stderr||run.stdout);
  const fanin=JSON.parse(fs.readFileSync(faninPath,'utf8')).sourceModel.workflow.composition;
  assert.strictEqual(fanin.buildable,true,JSON.stringify(fanin.diagnostics));
  assert.deepStrictEqual(fanin.stages.map(row=>row.rootId),['root:a','root:b','root:c']);
  assert.deepStrictEqual(fanin.stageDependencies.map(row=>[row.fromRootId,row.toRootId,row.symbol]),[['root:a','root:c','a'],['root:b','root:c','b']]);
  const cStage=fanin.stages.find(row=>row.rootId==='root:c');
  assert.deepStrictEqual(cStage.includedCells,[5,6]);
  assert.deepStrictEqual(cStage.artifactDependencies.map(row=>row.symbol),['a','b']);
  assert.deepStrictEqual(Object.keys(cStage.task.inputBindings).sort(),['a','b']);
  assert(Object.values(cStage.task.inputBindings).every(binding=>binding.source.scope==='artifacts'));

  const transitiveSource=path.join(temp,'transitive.ipynb');
  fs.writeFileSync(transitiveSource,JSON.stringify(notebook([
    'import pandas as pd\nraw = pd.read_csv("demo.csv")\n',
    'clean = raw.dropna()\n',
    'clean.plot(title="Clean")\n',
    'final = clean.abs()\n',
    'final.plot(title="Final")\n',
    'metric = final["signal"].mean()\n'
  ]),null,2),'utf8');
  const transitivePath=path.join(temp,'transitive.json');
  run=spawnSync(py.cmd,[...py.prefix,importer,'analyze',transitiveSource,'--output',transitivePath],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(run.status,0,run.stderr||run.stdout);
  const transitive=JSON.parse(fs.readFileSync(transitivePath,'utf8')).sourceModel.workflow.composition;
  assert.strictEqual(transitive.buildable,true,JSON.stringify(transitive.diagnostics));
  assert.deepStrictEqual(transitive.stageDependencies.map(row=>[row.fromRootId,row.toRootId,row.symbol]),[['root:clean','root:final','clean'],['root:final','root:metric','final']],'Nearest selected table root must become the Artifact boundary; ancestors must not be duplicated as direct dependencies.');
  const metricStage=transitive.stages.find(row=>row.rootId==='root:metric');
  assert.deepStrictEqual(metricStage.artifactDependencies.map(row=>row.symbol),['final']);
  assert.deepStrictEqual(metricStage.includedCells,[5]);

  const builderSource=fs.readFileSync(path.join(root,'sdk','python','dkds_plugin_gen.py'),'utf8');
  assert(builderSource.includes('source.scope must be sources or artifacts')&&builderSource.includes('source.artifactId is required for artifacts scope'));
  assert(builderSource.includes('ctx.data.artifacts.listMetadata')&&builderSource.includes('Required canonical Artifact is unavailable'));
  assert(builderSource.includes('has_scoped_source_input'),'Exact Artifact inputs must not force the imported-source capability when no source-scope binding exists.');
  const ui=fs.readFileSync(path.join(root,'src','core','plugins','plugin-authoring-ui.js'),'utf8');
  assert(ui.includes('Artifact 链：')&&ui.includes("row.mode==='artifact'"),'Existing authoring preview must expose detected Artifact-backed stage edges.');
  console.log('Phase F Artifact-backed stage chaining PASS: table-root dependency -> exact canonical Artifact -> upstream cell delegation -> downstream isolated Core Task -> Artifact lineage.');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
