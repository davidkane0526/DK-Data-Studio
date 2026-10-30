'use strict';
// Runtime regression for the generated Action-level Stage DAG coordinator.
// Core Task and ArtifactStore are modeled at the public callback boundary.
const assert=require('assert');
const fs=require('fs'),os=require('os'),path=require('path'),vm=require('vm');
const {spawnSync}=require('child_process');
const root=path.resolve(__dirname,'..');
const importer=path.join(root,'sdk','python','dkds_source_import.py');
const pythonEnv={...process.env,PYTHONDONTWRITEBYTECODE:'1',PYTHONIOENCODING:'utf-8'};
function pythonCommand(){
  for(const [cmd,prefix] of (process.platform==='win32'?[['python',[]],['py',['-3']],['python3',[]]]:[['python3',[]],['python',[]]])){
    const row=spawnSync(cmd,[...prefix,'--version'],{encoding:'utf8',env:pythonEnv});
    if(!row.error&&row.status===0)return [cmd,prefix];
  }
  throw new Error('Python 3 is required');
}
function invoke(cmd,prefix,args){
  const r=spawnSync(cmd,[...prefix,importer,...args],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(r.status,0,r.stderr||r.stdout);
}
function notebook(cells){return {nbformat:4,nbformat_minor:5,metadata:{},cells:cells.map((source,i)=>({cell_type:'code',metadata:{},execution_count:i+1,outputs:[],source:source.split(/(?<=\n)/)}))};}
const delay=()=>new Promise(resolve=>setTimeout(resolve,5));
async function main(){
  const [cmd,prefix]=pythonCommand(),temp=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-prerequisites-'));
  try{
    const source=path.join(temp,'stages.ipynb');
    fs.writeFileSync(source,JSON.stringify(notebook([
      'import pandas as pd\nimport numpy as np\nraw = pd.read_csv("demo.csv")\n',
      'series = raw["signal"]\n',
      'arr = series.to_numpy()\n',
      'metric = np.mean(arr)\n',
      'scaled = arr * metric\n'
    ]),null,2),'utf8');
    const roots=['root:series','root:arr','root:metric','root:scaled'];
    const selectors=roots.flatMap(value=>['--root-id',value]);
    const analysisPath=path.join(temp,'analysis.json');
    invoke(cmd,prefix,['analyze',source,'--output',analysisPath,...selectors]);
    const analysis=JSON.parse(fs.readFileSync(analysisPath,'utf8'));
    const composition=analysis.sourceModel.workflow.composition;
    assert.strictEqual(composition.buildable,true,JSON.stringify(composition.diagnostics));
    const plan=composition.stageExecutionPlan;
    assert.strictEqual(plan.schema,'dkds.stage-execution-plan.v1');
    assert.strictEqual(plan.stages.length,4);
    assert.deepStrictEqual(plan.stages.map(x=>x.prerequisiteStageIds.length),[0,1,1,2]);
    const lookup=new Map(plan.stages.map(x=>[x.stageId,x]));
    for(const stage of plan.stages){
      assert.deepStrictEqual(stage.prerequisiteTaskIds,stage.prerequisiteStageIds.map(id=>lookup.get(id).taskId));
      assert(stage.expectedArtifacts.every(x=>x.artifactId&&x.kind&&x.semanticType));
    }
    const packagePath=path.join(temp,'generated.dkplugin'),reportPath=path.join(temp,'build.json');
    invoke(cmd,prefix,['build',source,'--function-id','workflow:multi-action','--package',packagePath,'--report',reportPath,...selectors]);
    const pkg=JSON.parse(fs.readFileSync(packagePath,'utf8'));
    require('../desktop/plugin-package').normalizePluginPackage(pkg,{allowBuiltinId:false});
    const js=pkg.files['plugin.js'];
    assert(js.includes('/* DKDS stage scheduler begin */'));
    assert(js.includes('if(!__dkdsWantsHostEffects||__dkdsWantsHostEffects())')===false,
      'This fixture has no host effects; other host-effect tests cover that branch.');
    for(const stage of plan.stages)assert(js.includes('()=>run_stage("'+stage.stageId+'",true)'));
    const begin=js.indexOf('/* DKDS stage scheduler begin */');
    const end=js.indexOf('/* DKDS stage scheduler end */');
    assert(begin>=0&&end>begin);
    const snippet=js.slice(begin,end+'/* DKDS stage scheduler end */'.length);
    function setup({failStage=null,omitArtifact=null}={}){
      const events=[],effects=[],metadata=new Map(),disposables=[];
      const ctx={data:{artifacts:{listMetadata:({id})=>metadata.has(id)?[metadata.get(id)]:[]}}};
      const scope={ctx,disposables,Map,Error,Promise};
      for(const stage of plan.stages){
        const key='run_task_'+stage.taskId.replace(/[^A-Za-z0-9_]/g,'_');
        scope[key]=async (_args,wantsEffects)=>{
          events.push(stage.stageId);
          await delay();
          if(failStage===stage.stageId)throw new Error('injected prerequisite failure');
          if(wantsEffects())effects.push(stage.stageId);
          for(const expected of stage.expectedArtifacts){
            if(omitArtifact===expected.artifactId)continue;
            metadata.set(expected.artifactId,{id:expected.artifactId,kind:expected.kind,semanticType:expected.semanticType});
          }
          return {artifactIds:stage.expectedArtifacts.filter(x=>x.artifactId!==omitArtifact).map(x=>x.artifactId)};
        };
      }
      const run=vm.runInNewContext('(()=>{'+snippet+';return run_stage})()',scope);
      return {run,events,effects,metadata,disposables};
    }
    const target=plan.stages[3].stageId;
    {
      const s=setup();
      await s.run(target);
      assert.deepStrictEqual(s.events,plan.stages.map(x=>x.stageId),'Transitive prerequisites must execute in topological order.');
      assert.deepStrictEqual(s.effects,[target],'Only the explicitly invoked Stage gets target effects.');
      await s.run(target);
      assert.strictEqual(s.events.length,8,'A new execution must not consume stale cross-run Artifacts.');
    }
    {
      const s=setup();
      await Promise.all([s.run(plan.stages[0].stageId),s.run(target)]);
      assert.strictEqual(s.events.filter(id=>id===plan.stages[0].stageId).length,1,'Concurrent root/downstream invocation must share Core Task.');
      assert.strictEqual(s.events.length,4,'Fan-in must execute each prerequisite exactly once per chain.');
      assert(s.effects.includes(plan.stages[0].stageId),'Explicit root click must preserve the root target effect.');
      assert(s.effects.includes(target),'Sink click must preserve its target effect.');
    }
    {
      const s=setup({failStage:plan.stages[1].stageId});
      await assert.rejects(s.run(target),/injected prerequisite failure/);
      assert.deepStrictEqual(s.events,plan.stages.slice(0,2).map(x=>x.stageId),'Downstream must not execute after prerequisite failure.');
    }
    {
      const missing=plan.stages[1].expectedArtifacts[0].artifactId,s=setup({omitArtifact:missing});
      await assert.rejects(s.run(target),/failed to publish required Artifact/);
      assert.deepStrictEqual(s.events,plan.stages.slice(0,2).map(x=>x.stageId),'Missing Artifact must fail closed, never consume old data.');
    }
    {
      const s=setup(),pending=s.run(target);
      s.disposables.forEach(x=>x.dispose());
      await assert.rejects(pending,/deactivated/);
      assert.strictEqual(s.events.length,1,'Deactivation must prevent scheduling further dependent Tasks.');
    }
    {
      const plain=fs.readFileSync(path.join(root,'sdk','python','dkds_plugin_gen.py'),'utf8');
      assert(plain.includes('else "return true;"'),'Non-DAG Task return semantics must remain unchanged.');
    }
    console.log('Phase F automatic Stage prerequisites PASS: transitive/fan-in, in-flight dedup, effects, stale avoidance, fail-closed, deactivation.');
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
