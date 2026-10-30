'use strict';

const assert=require('assert');
const fs=require('fs');
const os=require('os');
const path=require('path');
const vm=require('vm');
const {spawnSync}=require('child_process');

const root=path.resolve(__dirname,'..');
const reference=path.join(root,'examples','declarative-python-artifact-reference','build_plugin.py');
const validator=path.join(root,'sdk','tools','dkds-plugin.js');
const pythonEnv={...process.env,PYTHONDONTWRITEBYTECODE:'1'};

function pythonCommand(){
  const candidates=process.platform==='win32'
    ? [['python',[]],['py',['-3']]]
    : [['python3',[]],['python',[]]];
  for(const [cmd,prefix] of candidates){
    const probe=spawnSync(cmd,prefix.concat(['--version']),{encoding:'utf8',env:pythonEnv});
    if(!probe.error&&probe.status===0)return {cmd,prefix};
  }
  throw new Error('Python 3 is required for the Phase F Artifact pipeline gate.');
}

function node(){
  return {appendChild(){},replaceChildren(){},dataset:{},style:{}};
}

(async()=>{
  const py=pythonCommand();
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-artifact-generator-'));
  try{
    const generated=path.join(temp,'generated');
    const build=spawnSync(py.cmd,py.prefix.concat([reference,generated]),{cwd:root,encoding:'utf8',env:pythonEnv});
    assert.strictEqual(build.status,0,'Artifact reference generation failed:\n'+build.stdout+'\n'+build.stderr);

    const files=fs.readdirSync(generated).sort();
    assert.deepStrictEqual(files,['README.md','generated-task-scale-table.js','plugin.js','plugin.json']);
    assert(!files.some(name=>/\.py(?:c|o)?$/i.test(name)),'Generated runtime package must contain no Python source/bytecode.');

    const manifest=JSON.parse(fs.readFileSync(path.join(generated,'plugin.json'),'utf8'));
    const pluginSource=fs.readFileSync(path.join(generated,'plugin.js'),'utf8');
    const taskSource=fs.readFileSync(path.join(generated,'generated-task-scale-table.js'),'utf8');

    for(const required of ['execution.tasks','data.sources','data.artifacts','data.model','ui.table','ui.scientific-plot','ui.unit-templates']){
      assert(manifest.requiresCore.includes(required),'Generated Artifact pipeline missing Core requirement: '+required);
    }
    assert(manifest.capabilities.includes('data.scoped-sources'));
    assert(manifest.capabilities.includes('ui.table'));
    assert.deepStrictEqual(manifest.data.produces,['science.generated.scaled-table']);
    assert.deepStrictEqual(manifest.tasks,[{id:'scale-table',entry:'generated-task-scale-table.js'}]);

    for(const token of [
      'ctx.data.sources.list()',
      'ctx.data.artifacts.columnMetadata',
      'ctx.data.artifacts.readColumnRange',
      'ctx.tasks.submit("scale-table"',
      'units.table.mount',
      'units.scientificPlot.create',
      'ctx.data.model.createTable',
      'ctx.data.artifacts.publish'
    ])assert(pluginSource.includes(token),'Generated Artifact pipeline missing canonical runtime path: '+token);
    assert(!pluginSource.includes('ctx.data.artifacts.get('),'Generated Artifact input path must not materialize the complete DataTable.');
    assert(!/ctx\.python|Pyodide|pythonProvider|runtimeProviders/i.test(pluginSource),'Generated runtime must remain JavaScript-only.');

    const validation=spawnSync(process.execPath,[validator,'validate',generated],{cwd:root,encoding:'utf8',env:pythonEnv});
    assert.strictEqual(validation.status,0,'Generated Artifact plugin failed ordinary SDK validation:\n'+validation.stdout+'\n'+validation.stderr);

    const taskSandbox={self:{},console};
    taskSandbox.globalThis=taskSandbox.self;
    vm.createContext(taskSandbox);
    vm.runInContext(taskSource,taskSandbox,{filename:'generated-task-scale-table.js'});
    const taskDefinition=taskSandbox.self.DKDSTaskDefinition;
    assert.equal(typeof taskDefinition?.run,'function');

    let registered=null;
    const pluginSandbox={
      console,
      DKDSPlugins:{
        define(manifestValue,factory){registered={manifest:manifestValue,factory};}
      }
    };
    pluginSandbox.globalThis=pluginSandbox;
    vm.createContext(pluginSandbox);
    vm.runInContext(pluginSource,pluginSandbox,{filename:'plugin.js'});
    assert(registered&&typeof registered.factory==='function');

    const statuses=[],readCalls=[],published=[];
    let actionRows=null,tableData=null,plotSpec=null;
    let declaredLength=3;
    const sourceRows=[{artifactId:'source:1',kind:'data.table',semanticType:'science.transport.iv',excluded:false}];
    const columnRows=()=>[
      {id:'col:x',key:'x',name:'Voltage',role:'x',unit:'V',length:declaredLength},
      {id:'col:y',key:'y',name:'Current',role:'y',unit:'A',length:declaredLength}
    ];
    const values={
      'col:x':[0,1,2],
      'col:y':[1,2,3]
    };

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
      table:{mount(){return {setData(columns,rows){tableData={columns,rows};return true;},dispose(){}};}},
      scientificPlot:{create(_host,spec){plotSpec=spec;return {requestRender(){},dispose(){}};}}
    };

    const ctx={
      status:{set(value){statuses.push(String(value));}},
      ui:{
        unitTemplates:units,
        pages:{add(){return node();}}
      },
      data:{
        sources:{list(){return sourceRows.slice();}},
        artifacts:{
          columnMetadata(id){assert.strictEqual(id,'source:1');return columnRows();},
          readColumnRange(id,column,options){
            readCalls.push({id,column,options:{...options}});
            const row=columnRows().find(item=>item.id===column);
            if(!row)return null;
            return {values:(values[column]||[]).slice(0,options.limit),length:options.limit,totalLength:row.length};
          },
          publish(artifact){published.push(artifact);return {id:artifact.id,changed:true,artifact};}
        },
        model:{
          createTable(spec){return {kind:'data.table',rowCount:spec.columns[0]?.values?.length||0,...spec};}
        }
      },
      tasks:{
        submit(taskId,payload){
          assert.strictEqual(taskId,'scale-table');
          return {promise:Promise.resolve().then(()=>taskDefinition.run(payload,{}))};
        }
      }
    };

    const activation=await registered.factory(ctx);
    assert(Array.isArray(actionRows)&&actionRows.length===1,'Generated action must be mounted through the Unit page header.');
    await actionRows[0].onInvoke();

    assert.deepStrictEqual(readCalls,[
      {id:'source:1',column:'col:x',options:{start:0,limit:3}},
      {id:'source:1',column:'col:y',options:{start:0,limit:3}}
    ],'Generated pipeline must use explicit bounded column reads.');
    assert.deepStrictEqual(JSON.parse(JSON.stringify(tableData.rows)),[
      {x:0,scaled:2},{x:1,scaled:4},{x:2,scaled:6}
    ]);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(plotSpec.getCurves()[0].points)),[
      {x:0,y:2},{x:1,y:4},{x:2,y:6}
    ]);
    assert.strictEqual(published.length,1);
    assert.strictEqual(published[0].kind,'data.table');
    assert.strictEqual(published[0].semanticType,'science.generated.scaled-table');
    assert.deepStrictEqual(JSON.parse(JSON.stringify(published[0].columns.map(column=>({key:column.key,role:column.role,values:column.values})))),[
      {key:'x',role:'x',values:[0,1,2]},
      {key:'scaled',role:'y',values:[2,4,6]}
    ]);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(published[0].lineage.parents)),['source:1']);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(published[0].lineage.parameters)),{gain:2},'Lineage parameters must not duplicate source column payloads.');
    assert.strictEqual(statuses.at(-1),'数据处理完成');

    const readsBefore=readCalls.length,publishedBefore=published.length;
    declaredLength=65537;
    await assert.rejects(
      ()=>actionRows[0].onInvoke(),
      /exceeds declared maxRows 65536/,
      'Oversized generated Artifact input must fail closed before a worker payload is built.'
    );
    assert.strictEqual(readCalls.length,readsBefore,'Oversized input must be rejected before readColumnRange.');
    assert.strictEqual(published.length,publishedBefore,'Oversized input must not publish a partial result.');

    activation?.deactivate?.();
    console.log('Phase F Artifact pipeline PASS: scoped DataTable -> bounded column reads -> JS Task -> Unit Table/Plot + lineage Artifact; no Python runtime.');
  }finally{
    fs.rmSync(temp,{recursive:true,force:true});
  }
})().catch(error=>{console.error(error);process.exit(1);});
