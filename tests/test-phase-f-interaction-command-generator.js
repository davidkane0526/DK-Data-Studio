'use strict';

const assert=require('assert');
const fs=require('fs');
const os=require('os');
const path=require('path');
const vm=require('vm');
const {spawnSync}=require('child_process');

const root=path.resolve(__dirname,'..');
const reference=path.join(root,'examples','declarative-python-interactive-workbench','build_plugin.py');
const validator=path.join(root,'sdk','tools','dkds-plugin.js');
const schema=JSON.parse(fs.readFileSync(path.join(root,'sdk','declarative-plugin.schema.json'),'utf8'));
const sdk=JSON.parse(fs.readFileSync(path.join(root,'sdk','contract.json'),'utf8'));
const unitSpec=require('../src/core/ui/modules/composition/unit-template-spec');
const pythonEnv={...process.env,PYTHONDONTWRITEBYTECODE:'1'};

function pythonCommand(){
  const candidates=process.platform==='win32'
    ? [['python',[]],['py',['-3']]]
    : [['python3',[]],['python',[]]];
  for(const [cmd,prefix] of candidates){
    const probe=spawnSync(cmd,prefix.concat(['--version']),{encoding:'utf8',env:pythonEnv});
    if(!probe.error&&probe.status===0)return {cmd,prefix};
  }
  throw new Error('Python 3 is required for the Phase F interaction/command gate.');
}
function node(){
  return {appendChild(){},replaceChildren(){},querySelector(){return null;},dataset:{},style:{}};
}

(async()=>{
  assert.strictEqual(unitSpec.UNIT_TEMPLATE_SPEC_VERSION,'2.5.38',
    'Generated interaction must consume the frozen Unit 2.5.38 contract.');
  assert(schema.properties.interaction,'Declarative schema must expose the Core Interaction declaration.');
  const variants=schema.properties.content.items.oneOf;
  const plot=variants.find(row=>row?.properties?.kind?.const==='plot');
  const group=variants.find(row=>row?.properties?.kind?.const==='plot-group');
  for(const key of ['selectionTarget','identity','axisSemantics','viewport','legend']){
    assert(plot?.properties?.[key],'Standalone plot schema missing interaction field '+key);
    assert(group?.properties?.plots?.items?.properties?.[key],'PlotGroup child schema missing interaction field '+key);
  }

  const py=pythonCommand();
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-interactive-generator-'));
  try{
    const generated=path.join(temp,'generated');
    const build=spawnSync(py.cmd,py.prefix.concat([reference,generated]),{cwd:root,encoding:'utf8',env:pythonEnv});
    assert.strictEqual(build.status,0,'Interactive workbench generation failed:\n'+build.stdout+'\n'+build.stderr);

    const files=fs.readdirSync(generated).sort();
    assert.deepStrictEqual(files,['README.md','generated-task-compare-curves.js','plugin.js','plugin.json']);
    const manifest=JSON.parse(fs.readFileSync(path.join(generated,'plugin.json'),'utf8'));
    const pluginSource=fs.readFileSync(path.join(generated,'plugin.js'),'utf8');
    const taskSource=fs.readFileSync(path.join(generated,'generated-task-compare-curves.js'),'utf8');

    for(const required of [
      'execution.tasks','execution.commands','data.sources','data.artifacts','data.model',
      'ui.selection','ui.interaction','ui.scientific-plot','ui.group-area','ui.plot-views','ui.unit-templates'
    ])assert(manifest.requiresCore.includes(required),'Missing generated interaction/command requirement: '+required);
    assert(manifest.capabilities.includes('ui.interaction'));
    assert.strictEqual(manifest.apiVersion,'1.19.0');

    for(const token of [
      "ctx.ui.interaction.create",
      "interaction.link(",
      "interaction:interaction",
      "selectionTarget:\"series\"",
      "viewportPolicy:{link:true",
      "legendPolicy:{link:true",
      "ctx.commands.register(\"generated.compare-curves\"",
      "ctx.commands.run(\"generated.compare-curves\",{})",
      "capture_generated_compare_curves",
      "ctx.tasks.submit(\"compare-curves\""
    ])assert(pluginSource.includes(token),'Generated interactive workbench missing canonical path: '+token);

    assert(!pluginSource.includes('dkds:selection-changed'),
      'Generated plugins must not publish the Selection bridge event directly.');
    assert(!/new\s+EventTarget|addEventListener\([^)]*(selection|viewport|legend)/i.test(pluginSource),
      'Generated cross-view interaction must not own a private event bus/listener path.');
    assert(!/ctx\.python|Pyodide|pythonProvider|runtimeProviders|new Worker\s*\(/i.test(pluginSource),
      'Generated interaction plugin must not add a Python/private-worker runtime.');
    assert(!pluginSource.includes('ctx.data.artifacts.get('),
      'Generated replayable commands must retain bounded Artifact reads.');

    const validation=spawnSync(process.execPath,[validator,'validate',generated],{cwd:root,encoding:'utf8',env:pythonEnv});
    assert.strictEqual(validation.status,0,'Generated interactive plugin failed SDK validation:\n'+validation.stdout+'\n'+validation.stderr);

    const taskSandbox={self:{},console};
    taskSandbox.globalThis=taskSandbox.self;
    vm.createContext(taskSandbox);
    vm.runInContext(taskSource,taskSandbox,{filename:'generated-task-compare-curves.js'});
    const taskDefinition=taskSandbox.self.DKDSTaskDefinition;
    assert.equal(typeof taskDefinition?.run,'function');

    let registered=null;
    const pluginSandbox={console,DKDSPlugins:{define(manifestValue,factory){registered={manifest:manifestValue,factory};}}};
    pluginSandbox.globalThis=pluginSandbox;
    vm.createContext(pluginSandbox);
    vm.runInContext(pluginSource,pluginSandbox,{filename:'plugin.js'});
    assert(registered&&typeof registered.factory==='function');

    let sourceOrder=['source:a','source:b'];
    const descriptors={
      'source:a':{artifactId:'source:a',kind:'data.table',semanticType:'science.transport.iv',excluded:false},
      'source:b':{artifactId:'source:b',kind:'data.table',semanticType:'science.transport.iv',excluded:false}
    };
    const sourceValues={
      'source:a':{'a:x':[0,1,2],'a:y':[1,2,3]},
      'source:b':{'b:x':[0,1,2],'b:y':[2,4,8]}
    };
    const metadata=id=>id==='source:a'
      ? [
          {id:'a:x',key:'x',role:'x',length:3,artifactRevision:7},
          {id:'a:y',key:'y',role:'y',length:3,artifactRevision:7}
        ]
      : [
          {id:'b:x',key:'x',role:'x',length:3,artifactRevision:11},
          {id:'b:y',key:'y',role:'y',length:3,artifactRevision:11}
        ];

    const statuses=[],reads=[],published=[],plotSpecs=new Map(),renderCounts=new Map();
    const interactionLinks=[],interactionDisposals=[];
    const commandRegistrations=new Map(),commandRunCalls=[];
    let lastCanonical=null,actionRows=null,tableRows=null;

    const interaction={
      selection:{},
      link(group,options){
        interactionLinks.push({group,options});
        return ()=>interactionDisposals.push(group);
      },
      dispose(){interactionDisposals.push('runtime');}
    };

    const commands={
      register(id,handler,meta){commandRegistrations.set(id,{handler,meta});return ()=>commandRegistrations.delete(id);},
      async run(id,payload={}){
        commandRunCalls.push({id,payload});
        const row=commandRegistrations.get(id);
        assert(row,'Unknown generated command '+id);
        const safe=row.meta.domainCommand.captureArgs(payload);
        lastCanonical=JSON.parse(JSON.stringify(safe));
        return row.handler(safe);
      }
    };

    const groupCleanups=[];
    const units={
      pageHeader:{create(_page,spec){actionRows=spec.actions;return {actions:node()};}},
      page:{create(){return {element:node()};}},
      workspace:{create(){return {compose(){},dispose(){}};}},
      layout:{create(){return node();}},
      panel:{create(){return {element:node(),body:node()};}},
      field:{create(_host,spec){return {control:{value:String(spec.value??'')}};}},
      check:{create(){return {input:{checked:false}};}},
      prime:{build(spec){return spec;}},
      note:{create(){return node();}},
      section:{create(){return {element:node(),body:node()};}},
      table:{mount(){return {setData(_columns,rows){tableRows=rows;return true;},dispose(){}};}},
      plotGroup:{
        create(){
          return {
            addPlot(row){
              const cleanup=row.render(node());
              groupCleanups.push(cleanup);
              return {id:row.id,dispose(){if(typeof cleanup==='function')cleanup();}};
            },
            dispose(){while(groupCleanups.length){const fn=groupCleanups.pop();if(typeof fn==='function')fn();}}
          };
        }
      },
      scientificPlot:{
        create(_host,spec){
          plotSpecs.set(spec.source,spec);
          return {
            requestRender(){renderCounts.set(spec.source,(renderCounts.get(spec.source)||0)+1);},
            dispose(){}
          };
        }
      }
    };

    const ctx={
      status:{set(value){statuses.push(String(value));}},
      ui:{
        unitTemplates:units,
        pages:{add(){return node();}},
        interaction:{create(id,spec){
          assert.strictEqual(id,'generated-interactive');
          assert.deepStrictEqual(JSON.parse(JSON.stringify(spec)),{selection:{multiple:true,defaultType:'data.series'}});
          return interaction;
        }}
      },
      commands,
      data:{
        sources:{list(){return sourceOrder.map(id=>descriptors[id]);}},
        artifacts:{
          columnMetadata(id){return metadata(id);},
          readColumnRange(id,column,options){
            reads.push({id,column,options:{...options}});
            const values=sourceValues[id]?.[column];
            return values?{values:values.slice(options.start,options.start+options.limit),length:options.limit,totalLength:values.length}:null;
          },
          publish(artifact){published.push(artifact);return {id:artifact.id,changed:true,artifact};}
        },
        model:{createTable(spec){return {kind:'data.table',rowCount:spec.columns[0]?.values?.length||0,...spec};}}
      },
      tasks:{
        submit(taskId,payload){
          assert.strictEqual(taskId,'compare-curves');
          return {promise:Promise.resolve().then(()=>taskDefinition.run(payload,{}))};
        }
      }
    };

    const activation=await registered.factory(ctx);
    assert.deepStrictEqual(interactionLinks,[
      {group:'generated-series-selection',options:{acceptTypes:['data.series']}}
    ]);
    assert(Array.isArray(actionRows)&&actionRows.length===1);

    const command=commandRegistrations.get('generated.compare-curves');
    assert(command,'Generated replayable command must be registered before activation completes.');
    const meta=command.meta.domainCommand;
    assert.strictEqual(meta.domain,'analysis.generated');
    assert.strictEqual(meta.version,'1.0.0');
    assert.strictEqual(meta.replayable,true);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(meta.algorithm({}))),{
      category:'generated.analysis',
      id:'compare-curves',
      version:'1.0.0',
      provider:'com.example.generated-interactive-workbench@1.0.0'
    });

    await actionRows[0].onInvoke();
    assert.deepStrictEqual(commandRunCalls,[{id:'generated.compare-curves',payload:{}}]);
    assert.deepStrictEqual(lastCanonical,{
      sources:{x_a:'source:a',y_a:'source:a',x_b:'source:b',y_b:'source:b'},
      parameters:{gain:1}
    });
    assert.deepStrictEqual(JSON.parse(JSON.stringify(meta.inputs(lastCanonical))),[
      {artifactId:'source:a',role:'input'},
      {artifactId:'source:b',role:'input'}
    ]);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(meta.parameters(lastCanonical))),{gain:1});

    assert.deepStrictEqual(reads.map(row=>[row.id,row.column]),[
      ['source:a','a:x'],['source:a','a:y'],['source:b','b:x'],['source:b','b:y']
    ]);
    assert.strictEqual(published.length,1);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(meta.outputs({artifactIds:[published[0].id]}))),[
      {artifactId:'generated-interactive-comparison',role:'result'}
    ]);

    const aSpec=plotSpecs.get('curve-a'),bSpec=plotSpecs.get('curve-b'),deltaSpec=plotSpecs.get('curve-delta');
    for(const spec of [aSpec,bSpec,deltaSpec]){
      assert.strictEqual(spec.interaction,interaction);
      assert.strictEqual(spec.selectionTarget,'series');
      assert.deepStrictEqual(JSON.parse(JSON.stringify(spec.viewportPolicy)),{
        link:true,linkGroup:'generated-vds-viewport',linkedAxes:['x']
      });
      assert.strictEqual(spec.axisSemantics.x.unit,'V');
      assert.strictEqual(spec.axisSemantics.x.quantity,'drain-source-voltage');
    }
    assert.deepStrictEqual(JSON.parse(JSON.stringify(aSpec.legendPolicy)),{
      link:true,linkGroup:'generated-series-legend',maxLinkedTargets:8
    });
    assert.deepStrictEqual(JSON.parse(JSON.stringify(bSpec.legendPolicy)),{
      link:true,linkGroup:'generated-series-legend',maxLinkedTargets:8
    });
    assert.strictEqual(deltaSpec.legendPolicy,undefined);

    const aCurve=JSON.parse(JSON.stringify(aSpec.getCurves()[0]));
    const bCurve=JSON.parse(JSON.stringify(bSpec.getCurves()[0]));
    assert.strictEqual(aCurve.artifactId,'source:a');
    assert.strictEqual(aCurve.seriesId,'a:y');
    assert.strictEqual(aCurve.artifactRevision,7);
    assert.strictEqual(aCurve.entityType,'data.series');
    assert.strictEqual(bCurve.artifactId,'source:b');
    assert.strictEqual(bCurve.seriesId,'b:y');
    assert.strictEqual(bCurve.artifactRevision,11);

    assert.deepStrictEqual(JSON.parse(JSON.stringify(tableRows)),[
      {x:0,a:1,b:2,delta:1},
      {x:1,a:2,b:4,delta:2},
      {x:2,a:3,b:8,delta:5}
    ]);
    assert.strictEqual(statuses.at(-1),'交互比较完成');

    // Replay-safe proof: reorder scoped sources, then execute the already captured
    // canonical arguments directly as Core replay does. The handler must resolve
    // exact Artifact IDs rather than reinterpret declarative source indexes.
    sourceOrder=['source:b','source:a'];
    reads.length=0;
    const replayResult=await command.handler(JSON.parse(JSON.stringify(lastCanonical)));
    assert.deepStrictEqual(reads.map(row=>[row.id,row.column]),[
      ['source:a','a:x'],['source:a','a:y'],['source:b','b:x'],['source:b','b:y']
    ]);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(replayResult.sourceIds)),['source:a','source:b']);
    assert.strictEqual(published.length,2);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(published[1].lineage.parents)),['source:a','source:b']);

    activation?.deactivate?.();
    assert(interactionDisposals.includes('generated-series-selection'),'Selection link cleanup must run on deactivation.');
    assert(interactionDisposals.includes('runtime'),'InteractionRuntime must be lifecycle-owned by the generated plugin.');

    const rejectCode=[
      'import sys',
      'sys.path.insert(0, '+JSON.stringify(path.join(root,'sdk','python'))+')',
      'from dkds_plugin_gen import PluginBuilder, SpecError',
      'spec={"schema":"dkds.declarative-plugin.v1","plugin":{"id":"bad.interaction","name":"bad","version":"1.0.0","description":"bad"},"page":{"id":"bad","label":"bad","title":"bad"},"workspace":{"activity":"bad","primaryRole":"scientific-primary"},"data":{"accepts":["science.transport.iv"]},"interaction":{"id":"bad"},"content":[{"kind":"plot","id":"p","title":"p","xTitle":"x","yTitle":"y","viewport":{"link":True,"linkGroup":"g","linkedAxes":["x"]}}]}',
      'try:',
      '    PluginBuilder(spec)',
      'except SpecError:',
      '    raise SystemExit(0)',
      'raise SystemExit(3)'
    ].join('\n');
    const rejected=spawnSync(py.cmd,py.prefix.concat(['-c',rejectCode]),{cwd:root,encoding:'utf8',env:pythonEnv});
    assert.strictEqual(rejected.status,0,'Linked viewport without scientific axis semantics must fail closed.');

    console.log('Phase F interaction/command generator PASS: Core Interaction + stable series identity + viewport/legend links + replay-safe validated command; no second interaction/runtime path.');
  }finally{
    fs.rmSync(temp,{recursive:true,force:true});
  }
})().catch(error=>{console.error(error);process.exit(1);});
