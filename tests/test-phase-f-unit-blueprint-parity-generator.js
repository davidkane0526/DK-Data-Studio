'use strict';

const assert=require('assert');
const fs=require('fs');
const os=require('os');
const path=require('path');
const vm=require('vm');
const {spawnSync}=require('child_process');

const root=path.resolve(__dirname,'..');
const reference=path.join(root,'examples','declarative-python-unit-blueprint-parity','build_plugin.py');
const validator=path.join(root,'sdk','tools','dkds-plugin.js');
const schema=JSON.parse(fs.readFileSync(path.join(root,'sdk','declarative-plugin.schema.json'),'utf8'));
const blueprints=JSON.parse(fs.readFileSync(path.join(root,'sdk','native-plugin-unit-blueprints.json'),'utf8'));
const sdk=JSON.parse(fs.readFileSync(path.join(root,'sdk','contract.json'),'utf8'));
const unitSpec=require('../src/core/ui/modules/composition/unit-template-spec');
const pythonEnv={...process.env,PYTHONDONTWRITEBYTECODE:'1'};

function atLeast(actual,minimum){
  const a=String(actual).split('.').map(Number),b=String(minimum).split('.').map(Number);
  for(let i=0;i<3;i++){if((a[i]||0)>(b[i]||0))return true;if((a[i]||0)<(b[i]||0))return false;}
  return true;
}
function pythonCommand(){
  const candidates=process.platform==='win32'?[['python',[]],['py',['-3']]]:[['python3',[]],['python',[]]];
  for(const [cmd,prefix] of candidates){
    const probe=spawnSync(cmd,prefix.concat(['--version']),{encoding:'utf8',env:pythonEnv});
    if(!probe.error&&probe.status===0)return {cmd,prefix};
  }
  throw new Error('Python 3 is required for the generated Unit blueprint parity gate.');
}
function node(){
  return {children:[],dataset:{},style:{},appendChild(child){this.children.push(child);},replaceChildren(...rows){this.children=rows;},querySelector(){return null;}};
}

(async()=>{
  assert(atLeast(sdk.sdkVersion,'1.51.51'),'Production-shaped generation requires the SDK 1.51.51 authoring contract.');
  assert.strictEqual(unitSpec.UNIT_TEMPLATE_SPEC_VERSION,'2.5.38');
  assert.strictEqual(blueprints.version,'2.5.38');

  const kinds=schema.properties.content.items.oneOf.map(row=>row?.properties?.kind?.const).filter(Boolean);
  assert(kinds.includes('metrics'),'Declarative schema must expose Metric composition.');
  assert(kinds.includes('result-split'),'Declarative schema must expose SplitPane result composition.');
  assert.deepStrictEqual(schema.properties.workspace.properties.mainLayout.enum,['stack-comfortable','fill-rows']);
  assert(schema.properties.parameters.properties.groups,'Declarative schema must expose grouped control surfaces.');
  assert(schema.properties.page.properties.actionIds,'Page action projection must be declarative.');

  const referenceBlueprint=blueprints.blueprints['transfer-vth-lab'];
  assert(referenceBlueprint,'Accepted production Vth blueprint must remain published as independent reconstruction evidence.');
  for(const unit of ['page','pageHeader','workspace','layout','panel','header','toolbar','action','field','check','chip','note','metric','table','prime','scientificPlot','splitPane'])
    assert(referenceBlueprint.units.includes(unit),'Reference production blueprint lost required generic Unit: '+unit);

  const py=pythonCommand();
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-unit-blueprint-parity-'));
  try{
    const generated=path.join(temp,'generated');
    const build=spawnSync(py.cmd,py.prefix.concat([reference,generated]),{cwd:root,encoding:'utf8',env:pythonEnv});
    assert.strictEqual(build.status,0,'Production-shaped reference generation failed:\n'+build.stdout+'\n'+build.stderr);

    const files=fs.readdirSync(generated).sort();
    assert.deepStrictEqual(files,['README.md','generated-task-analyze-threshold.js','plugin.js','plugin.json']);
    const manifest=JSON.parse(fs.readFileSync(path.join(generated,'plugin.json'),'utf8'));
    const pluginSource=fs.readFileSync(path.join(generated,'plugin.js'),'utf8');
    const taskSource=fs.readFileSync(path.join(generated,'generated-task-analyze-threshold.js'),'utf8');

    for(const token of [
      "units.layout.create(null,{variant:\"fill-rows\"})",
      'units.metric.create',
      "units.panel.create(controlsHost,{variant:'headed'",
      "units.panel.create(controlsHost,{variant:'plain',header:false",
      'units.header.create',
      'units.toolbar.create',
      'units.chip.create',
      'units.field.create',
      'units.check.create',
      'units.note.create',
      'units.panel.detached',
      "units.layout.apply",
      'units.header.create',
      'units.scientificPlot.create',
      'units.table.mount',
      'units.splitPane.create',
      "variant:'fixed-titleless'",
      "presentationPurpose:'parameters'"
    ])assert(pluginSource.includes(token),'Generated production-shaped workbench missing public Unit path: '+token);

    assert(!/transfer-vth-lab|Unit_for_|ctx\.ui\.styles|document\.|new Worker\s*\(/.test(pluginSource),
      'Production-shaped generator must remain domain-blind and must not copy a production-private runtime/style path.');
    assert(manifest.requiresCore.includes('ui.scientific-plot'));
    assert(manifest.requiresCore.includes('ui.table'));
    assert(manifest.requiresCore.includes('execution.tasks'));
    assert(manifest.requiresCore.includes('data.sources'));
    assert(manifest.requiresCore.includes('data.artifacts'));
    assert.strictEqual(manifest.workspace?.role,'top');
    assert.strictEqual(manifest.workspace?.activity,'generated-unit-blueprint-parity');
    assert.strictEqual(manifest.window?.activity,'generated-unit-blueprint-parity');
    assert(manifest.window?.dependencies?.includes('scientific-renderer'));

    const validation=spawnSync(process.execPath,[validator,'validate',generated],{cwd:root,encoding:'utf8',env:pythonEnv});
    assert.strictEqual(validation.status,0,'Generated production-shaped plugin failed ordinary SDK validation:\n'+validation.stdout+'\n'+validation.stderr);

    const taskSandbox={self:{},console};
    taskSandbox.globalThis=taskSandbox.self;
    vm.createContext(taskSandbox);
    vm.runInContext(taskSource,taskSandbox,{filename:'generated-task-analyze-threshold.js'});
    const taskDefinition=taskSandbox.self.DKDSTaskDefinition;
    assert.equal(typeof taskDefinition?.run,'function');

    let registered=null;
    const pluginSandbox={console,DKDSPlugins:{define(manifestValue,factory){registered={manifest:manifestValue,factory};}}};
    pluginSandbox.globalThis=pluginSandbox;
    vm.createContext(pluginSandbox);
    vm.runInContext(pluginSource,pluginSandbox,{filename:'plugin.js'});
    assert(registered&&typeof registered.factory==='function');

    let pageHeaderSpec=null,tableRows=null,plotSpec=null,splitSpec=null;
    let activitySpec=null,topWorkspaceSpec=null,closedPage=null;
    const toolbarSpecs=[];
    const panelSpecs=[];
    const metricValues=new Map();
    const units={
      pageHeader:{create(_host,spec){pageHeaderSpec=spec;return {actions:node()};}},
      page:{create(){return {element:node()};}},
      workspace:{create(){return {compose(){},dispose(){}};}},
      layout:{
        create(){return node();},
        apply(host){return host;}
      },
      panel:{
        create(_host,spec){panelSpecs.push(spec);return {element:node(),body:node(),header:{actions:node()}};},
        detached(){return {element:node(),body:node(),header:{actions:node()}};}
      },
      header:{create(){return {element:node(),actions:node()};}},
      toolbar:{create(_host,spec){toolbarSpecs.push(spec);return {element:node()};}},
      chip:{create(){return {element:node()};}},
      field:{create(_host,spec){return {control:{value:String(spec.value??'')}};}},
      check:{create(_host,spec){return {input:{checked:Boolean(spec.checked)}};}},
      prime:{build(spec){return spec;}},
      note:{create(){return node();}},
      section:{create(){return {element:node(),body:node()};}},
      metric:{
        create(_host,spec){
          const value={textContent:String(spec.value??'')};
          metricValues.set(spec.label,value);
          return {element:node(),label:node(),value};
        }
      },
      table:{mount(){return {setData(_columns,rows){tableRows=rows;return true;},dispose(){}};}},
      scientificPlot:{
        create(_host,spec){plotSpec=spec;return {requestRender(){},dispose(){}};}
      },
      splitPane:{
        create(_host,spec){splitSpec=spec;return {dispose(){}};}
      }
    };
    const sourceValues={'source:vth':{'col:x':[0,1,2],'col:y':[1,3,5]}};
    const ctx={
      status:{set(){}},
      ui:{
        unitTemplates:units,
        pages:{add(){return node();}},
        activities:{add(spec){activitySpec=spec;return spec;}},
        topWorkspace:{register(spec){topWorkspaceSpec=spec;return spec;}}
      },
      workspace:{
        openPage(){return true;},
        closePage(id){closedPage=id;return true;}
      },
      data:{
        sources:{list(){return [{artifactId:'source:vth',kind:'data.table',semanticType:'science.transport.iv',excluded:false}];}},
        artifacts:{
          columnMetadata(){return [
            {id:'col:x',role:'x',key:'x',length:3},
            {id:'col:y',role:'y',key:'y',length:3}
          ];},
          readColumnRange(id,column,options){
            const values=sourceValues[id][column];
            return {values:values.slice(options.start,options.start+options.limit),length:options.limit,totalLength:values.length};
          }
        }
      },
      tasks:{
        submit(taskId,payload){
          assert.strictEqual(taskId,'analyze-threshold');
          return {promise:Promise.resolve().then(()=>taskDefinition.run(payload,{}))};
        }
      }
    };

    const activation=await registered.factory(ctx);
    assert(splitSpec,'Generated workbench must instantiate the canonical SplitPane.');
    assert.strictEqual(splitSpec.axis,'y');
    assert.strictEqual(splitSpec.resizeTarget,'second');
    assert.strictEqual(splitSpec.defaultSize,180);
    assert.strictEqual(splitSpec.min,140);
    assert.strictEqual(splitSpec.reserve,300);
    assert.strictEqual(splitSpec.reflowBelow,920);
    assert(activitySpec,'Hosted generated workbench must register one Activity.');
    assert(topWorkspaceSpec,'Hosted generated workbench must register one TopWorkspace projection.');
    assert.strictEqual(activitySpec.id,'generated-unit-blueprint-parity');
    assert.strictEqual(topWorkspaceSpec.activity,'generated-unit-blueprint-parity');
    assert(pageHeaderSpec,'Generated workbench must create the canonical PageHeader.');
    assert.strictEqual(pageHeaderSpec.close,true);
    pageHeaderSpec.onClose();
    assert.strictEqual(closedPage,'dkdsGeneratedPage_generated-unit-blueprint-parity');
    assert.deepStrictEqual(pageHeaderSpec.actions.map(row=>row.id),['refresh','fit','settings']);
    assert(panelSpecs.some(spec=>spec.variant==='headed'&&spec.title==='数据'),'Data control must contain a headed Data panel.');
    assert(panelSpecs.some(spec=>spec.variant==='plain'&&spec.header===false),'Data control must contain a plain extraction panel.');
    assert.strictEqual(toolbarSpecs.length,2,'Grouped control surfaces must create the declared Data and Extraction toolbars.');
    assert.deepStrictEqual(toolbarSpecs[0].actions.map(row=>row.id),['refresh','demo']);
    assert.deepStrictEqual(toolbarSpecs[1].actions.map(row=>row.id),['analyze']);

    await toolbarSpecs[1].actions[0].onInvoke();

    assert.deepStrictEqual(JSON.parse(JSON.stringify(tableRows)),[
      {x:0,y:1},{x:1,y:3},{x:2,y:5}
    ]);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(plotSpec.getCurves()[0].points)),[
      {x:0,y:1},{x:1,y:3},{x:2,y:5}
    ]);
    assert.strictEqual(metricValues.get('Vth').textContent,'-0.5');
    assert.strictEqual(metricValues.get('扫描段').textContent,'auto');
    assert.strictEqual(metricValues.get('R²').textContent,'1');
    assert.strictEqual(metricValues.get('拟合点数').textContent,'3');

    activation?.deactivate?.();
    console.log('Phase F Unit blueprint parity PASS: grouped Data/Extraction controls + titleless PRIME + metric-grid + ScientificPlot + canonical SplitPane/Table; no production-plugin specialization.');
  }finally{
    fs.rmSync(temp,{recursive:true,force:true});
  }
})().catch(error=>{console.error(error);process.exit(1);});
