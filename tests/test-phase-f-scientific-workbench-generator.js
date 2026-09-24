'use strict';

const assert=require('assert');
const fs=require('fs');
const os=require('os');
const path=require('path');
const vm=require('vm');
const {spawnSync}=require('child_process');

const root=path.resolve(__dirname,'..');
const reference=path.join(root,'examples','declarative-python-scientific-workbench','build_plugin.py');
const validator=path.join(root,'sdk','tools','dkds-plugin.js');
const schema=JSON.parse(fs.readFileSync(path.join(root,'sdk','declarative-plugin.schema.json'),'utf8'));
const pythonEnv={...process.env,PYTHONDONTWRITEBYTECODE:'1'};

function pythonCommand(){
  const candidates=process.platform==='win32'
    ? [['python',[]],['py',['-3']]]
    : [['python3',[]],['python',[]]];
  for(const [cmd,prefix] of candidates){
    const probe=spawnSync(cmd,prefix.concat(['--version']),{encoding:'utf8',env:pythonEnv});
    if(!probe.error&&probe.status===0)return {cmd,prefix};
  }
  throw new Error('Python 3 is required for the Phase F scientific workbench gate.');
}
function node(){
  return {appendChild(){},replaceChildren(){},querySelector(){return null;},dataset:{},style:{}};
}

(async()=>{
  assert(schema.properties.content.items.oneOf.some(row=>row?.properties?.kind?.const==='plot-group'),
    'Declarative schema v1 must expose PlotGroup content.');

  const py=pythonCommand();
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-scientific-generator-'));
  try{
    const generated=path.join(temp,'generated');
    const build=spawnSync(py.cmd,py.prefix.concat([reference,generated]),{cwd:root,encoding:'utf8',env:pythonEnv});
    assert.strictEqual(build.status,0,'Scientific workbench generation failed:\n'+build.stdout+'\n'+build.stderr);

    const files=fs.readdirSync(generated).sort();
    assert.deepStrictEqual(files,['README.md','generated-task-compare-curves.js','plugin.js','plugin.json']);
    assert(!files.some(name=>/\.py(?:c|o)?$/i.test(name)));

    const manifest=JSON.parse(fs.readFileSync(path.join(generated,'plugin.json'),'utf8'));
    const pluginSource=fs.readFileSync(path.join(generated,'plugin.js'),'utf8');
    const taskSource=fs.readFileSync(path.join(generated,'generated-task-compare-curves.js'),'utf8');

    for(const required of [
      'execution.tasks','data.sources','data.artifacts','data.model',
      'ui.table','ui.scientific-plot','ui.group-area','ui.plot-views','ui.unit-templates'
    ])assert(manifest.requiresCore.includes(required),'Missing generated scientific requirement: '+required);
    assert(manifest.capabilities.includes('ui.group-area'));
    assert.deepStrictEqual(manifest.data.produces,['science.generated.comparison','science.generated.delta']);

    for(const token of [
      'units.plotGroup.create',
      '_group.addPlot',
      'units.scientificPlot.create',
      'units.table.mount',
      'ctx.data.sources.list()',
      'ctx.data.artifacts.columnMetadata',
      'ctx.data.artifacts.readColumnRange',
      'ctx.tasks.submit("compare-curves"',
      'ctx.data.model.createTable',
      'ctx.data.artifacts.publish'
    ])assert(pluginSource.includes(token),'Generated scientific workbench missing canonical path: '+token);
    assert(!pluginSource.includes('ctx.data.artifacts.get('),'Multi-source generation must not materialize whole input Artifacts.');
    assert(!/ctx\.python|Pyodide|pythonProvider|runtimeProviders|new Worker\s*\(/i.test(pluginSource),
      'Generated scientific workbench must not add a Python/private-worker runtime.');

    const validation=spawnSync(process.execPath,[validator,'validate',generated],{cwd:root,encoding:'utf8',env:pythonEnv});
    assert.strictEqual(validation.status,0,'Generated scientific plugin failed SDK validation:\n'+validation.stdout+'\n'+validation.stderr);

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

    const sources=[
      {artifactId:'source:a',kind:'data.table',semanticType:'science.transport.iv',excluded:false},
      {artifactId:'source:b',kind:'data.table',semanticType:'science.transport.iv',excluded:false}
    ];
    const sourceValues={
      'source:a':{'a:x':[0,1,2],'a:y':[1,2,3]},
      'source:b':{'b:x':[0,1,2],'b:y':[2,4,8]}
    };
    const metadata=id=>id==='source:a'
      ? [{id:'a:x',role:'x',key:'x',length:3},{id:'a:y',role:'y',key:'y',length:3}]
      : [{id:'b:x',role:'x',key:'x',length:3},{id:'b:y',role:'y',key:'y',length:3}];

    const statuses=[],reads=[],published=[],plotGroupSpecs=[],plotSpecs=new Map(),plotRenderCount=new Map();
    let actionRows=null,tableRows=null;
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
        create(_host,spec){
          plotGroupSpecs.push({...spec});
          return {
            addPlot(row){
              const host=node();
              const cleanup=row.render(host);
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
            requestRender(){plotRenderCount.set(spec.source,(plotRenderCount.get(spec.source)||0)+1);},
            dispose(){}
          };
        }
      }
    };

    const ctx={
      status:{set(value){statuses.push(String(value));}},
      ui:{unitTemplates:units,pages:{add(){return node();}}},
      data:{
        sources:{list(){return sources.slice();}},
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
    assert.deepStrictEqual(plotGroupSpecs,[{columns:2,preferredColumns:2,maxColumns:3,minItemWidth:260,responsive:true,density:'regular'}]);
    assert(Array.isArray(actionRows)&&actionRows.length===1);
    await actionRows[0].onInvoke();

    assert.deepStrictEqual(reads.map(row=>[row.id,row.column,row.options.limit]),[
      ['source:a','a:x',3],['source:a','a:y',3],['source:b','b:x',3],['source:b','b:y',3]
    ]);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(tableRows)),[
      {x:0,a:1,b:2,delta:1},
      {x:1,a:2,b:4,delta:2},
      {x:2,a:3,b:8,delta:5}
    ]);

    const points=source=>JSON.parse(JSON.stringify(plotSpecs.get(source).getCurves()[0].points));
    assert.deepStrictEqual(points('curve-a'),[{x:0,y:1},{x:1,y:2},{x:2,y:3}]);
    assert.deepStrictEqual(points('curve-b'),[{x:0,y:2},{x:1,y:4},{x:2,y:8}]);
    assert.deepStrictEqual(points('curve-delta'),[{x:0,y:1},{x:1,y:2},{x:2,y:5}]);
    assert.deepStrictEqual([...plotRenderCount.values()],[1,1,1],'One Task result must refresh every generated PlotGroup plot.');

    assert.strictEqual(published.length,2,'One generated analysis task must be able to publish multiple canonical outputs.');
    assert.deepStrictEqual(published.map(row=>row.semanticType),['science.generated.comparison','science.generated.delta']);
    for(const artifact of published){
      assert.deepStrictEqual(JSON.parse(JSON.stringify(artifact.lineage.parents)),['source:a','source:b']);
      assert.deepStrictEqual(JSON.parse(JSON.stringify(artifact.lineage.parameters)),{gain:1});
      assert.strictEqual(artifact.lineage.operation,'compare-curves');
    }
    assert.deepStrictEqual(JSON.parse(JSON.stringify(published[1].columns.map(row=>({key:row.key,values:row.values})))),[
      {key:'x',values:[0,1,2]},
      {key:'delta',values:[1,2,5]}
    ]);
    assert.strictEqual(statuses.at(-1),'双源比较完成');

    activation?.deactivate?.();
    console.log('Phase F scientific workbench PASS: two scoped DataTables -> one JS Task -> Unit PlotGroup/Table -> two lineage Artifacts; frozen runtime only.');
  }finally{
    fs.rmSync(temp,{recursive:true,force:true});
  }
})().catch(error=>{console.error(error);process.exit(1);});
