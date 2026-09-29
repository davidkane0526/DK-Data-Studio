'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path'),{spawnSync}=require('child_process');
const root=path.resolve(__dirname,'..'),importer=path.join(root,'sdk','python','dkds_source_import.py'),pythonEnv={...process.env,PYTHONDONTWRITEBYTECODE:'1',PYTHONIOENCODING:'utf-8'};
function pythonCommand(){for(const [cmd,prefix] of (process.platform==='win32'?[['python',[]],['py',['-3']],['python3',[]]]:[['python3',[]],['python',[]]])){const probe=spawnSync(cmd,[...prefix,'--version'],{encoding:'utf8',env:pythonEnv});if(!probe.error&&probe.status===0)return {cmd,prefix};}throw new Error('Python 3 is required.');}
function notebook(cells){return {nbformat:4,nbformat_minor:5,metadata:{},cells:cells.map((source,index)=>({cell_type:'code',metadata:{},execution_count:index+1,outputs:[],source:source.split(/(?<=\n)/)}))};}
function run(py,args){const row=spawnSync(py.cmd,[...py.prefix,...args],{cwd:root,encoding:'utf8',env:pythonEnv});assert.strictEqual(row.status,0,row.stderr||row.stdout);return row;}
const py=pythonCommand(),temp=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-typed-artifact-boundary-'));
try{
  const source=path.join(temp,'typed-chain.ipynb');
  fs.writeFileSync(source,JSON.stringify(notebook([
    'import pandas as pd\nimport numpy as np\nraw = pd.read_csv("demo.csv")\n',
    'series = raw["signal"]\n',
    'arr = series.to_numpy()\n',
    'metric = np.mean(arr)\n',
    'scaled = arr * metric\n'
  ]),null,2),'utf8');

  const autoPath=path.join(temp,'auto.json');run(py,[importer,'analyze',source,'--output',autoPath]);
  const auto=JSON.parse(fs.readFileSync(autoPath,'utf8')).sourceModel.workflow.tableTransformPlan.workflowSlice;
  assert.deepStrictEqual(auto.rootCandidates.map(row=>[row.id,row.valueKind]),[['root:scaled','array']]);
  assert.deepStrictEqual(auto.stageBoundaryCandidates.map(row=>[row.id,row.valueKind]),[['root:arr','array'],['root:metric','scalar'],['root:series','series']]);
  assert(auto.stageBoundaryCandidates.every(row=>row.boundaryOnly===true&&row.reasons.includes('cell-boundary')));
  assert.deepStrictEqual(auto.selectedRootIds,['root:scaled'],'all-observable must not silently turn intermediate Stage boundaries into Actions.');

  const explicitPath=path.join(temp,'explicit.json'),roots=['root:series','root:arr','root:metric','root:scaled'];
  run(py,[importer,'analyze',source,'--output',explicitPath,...roots.flatMap(id=>['--root-id',id])]);
  const report=JSON.parse(fs.readFileSync(explicitPath,'utf8')),workflow=report.sourceModel.workflow,composition=workflow.composition;
  assert.strictEqual(composition.buildable,true,JSON.stringify(composition.diagnostics));
  assert.deepStrictEqual(composition.stages.map(row=>row.rootId),['root:series','root:arr','root:metric','root:scaled']);
  assert.deepStrictEqual(composition.stageDependencies.map(row=>[row.symbol,row.valueKind,row.fromRootId,row.toRootId]),[
    ['series','series','root:series','root:arr'],
    ['arr','array','root:arr','root:metric'],
    ['arr','array','root:arr','root:scaled'],
    ['metric','scalar','root:metric','root:scaled']
  ]);
  const byRoot=Object.fromEntries(composition.stages.map(row=>[row.rootId,row]));
  assert.deepStrictEqual(byRoot['root:series'].includedCells,[0,1]);
  assert.deepStrictEqual(byRoot['root:arr'].includedCells,[2]);
  assert.deepStrictEqual(byRoot['root:metric'].includedCells,[3]);
  assert.deepStrictEqual(byRoot['root:scaled'].includedCells,[4]);
  assert.deepStrictEqual(byRoot['root:arr'].delegatedCells,[0,1]);
  assert.deepStrictEqual(byRoot['root:metric'].delegatedCells,[0,1,2]);
  assert.deepStrictEqual(byRoot['root:scaled'].delegatedCells,[0,1,2,3]);
  assert.strictEqual(byRoot['root:series'].publishedArtifact.artifactKind,'data.series');
  assert.strictEqual(byRoot['root:arr'].publishedArtifact.artifactKind,'result.analysis');
  assert.strictEqual(byRoot['root:metric'].publishedArtifact.artifactKind,'result.analysis');
  assert.strictEqual(byRoot['root:arr'].task.inputBindings.series.kind,'artifact-value');
  assert.strictEqual(byRoot['root:arr'].task.inputBindings.series.valueKind,'series');
  assert.strictEqual(byRoot['root:arr'].task.inputBindings.series.source.kind,'data.series');
  assert.strictEqual(byRoot['root:metric'].task.inputBindings.arr.valueKind,'array');
  assert.strictEqual(byRoot['root:metric'].task.inputBindings.arr.source.kind,'result.analysis');
  assert.deepStrictEqual(Object.fromEntries(Object.entries(byRoot['root:scaled'].task.inputBindings).map(([key,value])=>[key,value.valueKind])),{arr:'array',metric:'scalar'});
  assert.deepStrictEqual(composition.preview.sourceInputs,['raw'],'Only imported sources belong to the Source Picker surface.');
  assert.strictEqual(composition.spec.parameters.fields.length,1);
  assert.strictEqual(composition.spec.parameters.fields[0].id,'source-raw');
  assert(composition.spec.data.produces.some(value=>value.includes('.series.')));
  assert(composition.spec.data.produces.some(value=>value.includes('.array.')));
  assert(composition.spec.data.produces.some(value=>value.includes('.scalar.')));

  const pkgPath=path.join(temp,'typed-chain.dkplugin'),buildPath=path.join(temp,'build.json');
  run(py,[importer,'build',source,'--function-id','workflow:multi-action','--package',pkgPath,'--report',buildPath,...roots.flatMap(id=>['--root-id',id])]);
  const built=JSON.parse(fs.readFileSync(buildPath,'utf8')),pkg=JSON.parse(fs.readFileSync(pkgPath,'utf8'));
  require('../desktop/plugin-package').normalizePluginPackage(pkg,{allowBuiltinId:false});
  assert.strictEqual(built.source.stageCount,4);assert.strictEqual(pkg.manifest.tasks.length,4);
  assert(pkg.manifest.requiresCore.includes('data.artifacts')&&pkg.manifest.requiresCore.includes('data.model')&&pkg.manifest.requiresCore.includes('data.sources'));
  const pluginJs=pkg.files['plugin.js'];
  for(const needle of ['ctx.data.artifacts.get(','ctx.data.model.createSeries(','ctx.data.model.createAnalysisResult(','dkds.generated-array.v1','dkds.generated-scalar.v1'])assert(pluginJs.includes(needle),`Generated plugin missing ${needle}`);
  assert(pluginJs.includes("lineage:{parents:__dkdsSourceIds,role:'analysis'"));
  const expectedParams={
    'root:series':['raw'],
    'root:arr':['series'],
    'root:metric':['arr'],
    'root:scaled':['arr','metric']
  };
  for(const stage of composition.stages){
    const task=pkg.manifest.tasks.find(row=>row.id===stage.taskId);assert(task);
    const taskJs=pkg.files[task.entry];
    const hits=['raw','series','arr','metric'].filter(name=>taskJs.includes(`input?.["${name}"]`));
    assert.deepStrictEqual(hits,expectedParams[stage.rootId],`${stage.rootId} must receive only its post-boundary inputs.`);
  }
  assert(!Object.keys(pkg.files).some(name=>/\.(?:py|ipynb|pyc)$/i.test(name)));

  const builderSource=fs.readFileSync(path.join(root,'sdk','python','dkds_plugin_gen.py'),'utf8');
  assert(builderSource.includes('artifact-value requires source.scope=artifacts'));
  assert(builderSource.includes('valueKind must be series, array or scalar'));
  const taskSource=fs.readFileSync(path.join(root,'sdk','python','dkds_table_transform_task.py'),'utf8');
  assert(taskSource.includes('"source.table","source.value"')&&taskSource.includes('sourceKinds'));
  const types=fs.readFileSync(path.join(root,'sdk','plugin-api.d.ts'),'utf8');
  assert(types.includes('createAnalysisResult(spec:'),'Plugin API types must expose the already-public Core analysis-result factory used by generated typed Artifacts.');
  const ui=fs.readFileSync(path.join(root,'src','core','plugins','plugin-authoring-ui.js'),'utf8');
  assert(ui.includes('stageBoundaryCandidates')&&ui.includes('Stage Boundary'),'Plugin Manager must expose optional typed Stage boundaries without changing all-observable defaults.');
  console.log('Phase F typed Artifact boundaries PASS: optional cross-cell Series/Array/Scalar roots -> source.value -> canonical typed Artifacts -> exact downstream Core Task bindings.');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
