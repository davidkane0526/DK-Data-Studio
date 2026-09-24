'use strict';

const assert=require('assert');
const fs=require('fs');
const os=require('os');
const path=require('path');
const vm=require('vm');
const {spawnSync}=require('child_process');

const root=path.resolve(__dirname,'..');
const reference=path.join(root,'examples','declarative-python-tool-blueprint-parity','build_plugin.py');
const validator=path.join(root,'sdk','tools','dkds-plugin.js');
const schema=JSON.parse(fs.readFileSync(path.join(root,'sdk','declarative-plugin.schema.json'),'utf8'));
const blueprints=JSON.parse(fs.readFileSync(path.join(root,'sdk','native-plugin-unit-blueprints.json'),'utf8'));
const sdk=JSON.parse(fs.readFileSync(path.join(root,'sdk','contract.json'),'utf8'));
const pulseProduction=fs.readFileSync(path.join(root,'src','plugins','pulse-sampler-tool','unit-presentation.js'),'utf8');
const unitSpec=require('../src/core/ui/modules/composition/unit-template-spec');
const pythonEnv={...process.env,PYTHONDONTWRITEBYTECODE:'1'};

function pythonCommand(){
  const candidates=process.platform==='win32'?[['python',[]],['py',['-3']]]:[['python3',[]],['python',[]]];
  for(const [cmd,prefix] of candidates){
    const probe=spawnSync(cmd,prefix.concat(['--version']),{encoding:'utf8',env:pythonEnv});
    if(!probe.error&&probe.status===0)return {cmd,prefix};
  }
  throw new Error('Python 3 is required for generated tool blueprint parity.');
}
function node(){
  return {
    children:[],dataset:{},style:{},
    appendChild(child){this.children.push(child);return child;},
    replaceChildren(...rows){this.children=rows;},
    querySelector(){return null;}
  };
}

(async()=>{
  assert.strictEqual(sdk.sdkVersion,'1.51.54','Second production tool blueprint parity remains valid under the SDK 1.51.54 authoring contract.');
  assert.strictEqual(unitSpec.UNIT_TEMPLATE_SPEC_VERSION,'2.5.38','Second blueprint parity must consume the frozen Unit 2.5.38 contract.');
  assert.strictEqual(unitSpec.UNIT_TEMPLATE_SPEC_VERSION,'2.5.38');
  const pulse=blueprints.blueprints['pulse-sampler-tool'];
  assert(pulse,'Pulse Sampler production blueprint must remain available as independent evidence.');
  for(const unit of ['page','pageHeader','workspace','layout','panel','header','toolbar','action','tabs','field','table','scientificPlot','prime'])
    assert(pulse.units.includes(unit),'Pulse blueprint lost generic Unit evidence: '+unit);
  for(const variant of ['form-grid-2','segment-bar'])
    assert(pulse.regions.some(row=>row.variant===variant),'Pulse blueprint lost generic layout evidence: '+variant);
  assert(pulseProduction.includes("variant:'action-grid-4'"),'Pulse production Unit presentation lost accepted action-grid-4 evidence.');

  const group=schema.properties.parameters.properties.groups.items;
  assert(group.properties.tabs,'Declarative parameter groups must expose Tabs.');
  assert(group.properties.actionGrid,'Declarative parameter groups must expose Action Grid.');
  assert(group.properties.toolbar,'Declarative parameter groups must expose Toolbar.');
  assert(group.properties.table,'Declarative parameter groups must expose Table.');
  for(const key of ['leftWidth','leftMin','leftReserve','primaryEndInset'])
    assert(schema.properties.workspace.properties[key],'Declarative workspace missing public geometry knob: '+key);

  const py=pythonCommand();
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-tool-blueprint-parity-'));
  try{
    const generated=path.join(temp,'generated');
    const build=spawnSync(py.cmd,py.prefix.concat([reference,generated]),{cwd:root,encoding:'utf8',env:pythonEnv});
    assert.strictEqual(build.status,0,'Generated tool parity build failed:\n'+build.stdout+'\n'+build.stderr);

    const files=fs.readdirSync(generated).sort();
    assert.deepStrictEqual(files,['README.md','plugin.js','plugin.json']);
    const manifest=JSON.parse(fs.readFileSync(path.join(generated,'plugin.json'),'utf8'));
    const source=fs.readFileSync(path.join(generated,'plugin.js'),'utf8');

    assert.strictEqual(manifest.pluginType,'tool');
    assert.strictEqual(manifest.workspace?.role,'top');
    assert.strictEqual(manifest.workspace?.activity,'generated-tool-blueprint-parity');
    assert(manifest.window?.dependencies?.includes('scientific-renderer'));
    assert(!manifest.requiresCore.includes('execution.tasks'),'Structure-only tool parity must not invent a Task backend.');

    for(const token of [
      "leftWidth:540",
      "leftMin:520",
      "leftReserve:520",
      "primaryEndInset:{mode:'content'}",
      "units.tabs.create",
      "variant:\"compact\"",
      "variant:\"form-grid-2\"",
      "variant:\"action-grid-4\"",
      "units.action.create",
      "units.toolbar.create",
      "variant:\"segment-bar\"",
      "units.table.mount(\"segment-table\"",
      "priority:96",
      "embedded:true",
      "autoOpen:false",
      "presentationPurpose:'parameters'"
    ])assert(source.includes(token),'Generated tool parity source missing public composition token: '+token);

    assert(!/pulse-sampler|com\.dkds\.tools\.pulse|Unit_for_|ctx\.ui\.styles|document\.|new Worker\s*\(/i.test(source),
      'Generated tool parity must remain plugin/domain blind.');

    const validation=spawnSync(process.execPath,[validator,'validate',generated],{cwd:root,encoding:'utf8',env:pythonEnv});
    assert.strictEqual(validation.status,0,'Generated tool parity plugin failed ordinary SDK validation:\n'+validation.stdout+'\n'+validation.stderr);

    let registered=null;
    const sandbox={console,DKDSPlugins:{define(manifestValue,factory){registered={manifest:manifestValue,factory};}}};
    sandbox.globalThis=sandbox;
    vm.createContext(sandbox);
    vm.runInContext(source,sandbox,{filename:'plugin.js'});
    assert(registered&&typeof registered.factory==='function');

    let workspaceSpec=null,pageHeaderSpec=null,primeSpec=null,activitySpec=null,topWorkspaceSpec=null;
    const tabsSpecs=[],layoutVariants=[],toolbarSpecs=[],actionSpecs=[],tableIds=[],plotSpecs=[];
    let closedPage=null;
    const units={
      page:{create(){return {element:node()};}},
      pageHeader:{create(_host,spec){pageHeaderSpec=spec;return {actions:node()};}},
      workspace:{create(_host,spec){workspaceSpec=spec;return {compose(){},dispose(){}};}},
      layout:{
        create(_host,spec={}){if(spec.variant)layoutVariants.push(spec.variant);return node();},
        apply(host,spec={}){if(spec.variant)layoutVariants.push(spec.variant);return host;}
      },
      panel:{
        create(_host,spec={}){return {element:node(),body:node(),header:{actions:node()},spec};},
        detached(){return {element:node(),body:node(),header:{actions:node()}};}
      },
      header:{create(){return {element:node(),actions:node()};}},
      tabs:{create(_host,spec){tabsSpecs.push(spec);return {element:node(),tabs:node()};}},
      toolbar:{create(_host,spec){toolbarSpecs.push(spec);return {element:node()};}},
      action:{create(_host,spec){actionSpecs.push(spec);return {element:node(),button:node(),id:spec.id};}},
      field:{create(_host,spec){return {element:node(),control:{value:String(spec.value??'')}};}},
      check:{create(_host,spec){return {element:node(),input:{checked:Boolean(spec.checked)},label:node()};}},
      chip:{create(){return {element:node()};}},
      note:{create(){return {element:node()};}},
      prime:{build(spec){primeSpec=spec;return spec;}},
      section:{create(){return {element:node(),body:node()};}},
      table:{mount(id){tableIds.push(id);return {setData(){},dispose(){}};}},
      scientificPlot:{create(_host,spec){plotSpecs.push(spec);return {requestRender(){},dispose(){}};}}
    };
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
      }
    };

    const activation=await registered.factory(ctx);
    assert(workspaceSpec,'Generated tool must create the canonical Workspace.');
    assert.strictEqual(workspaceSpec.activity,'generated-tool-blueprint-parity');
    assert.strictEqual(workspaceSpec.leftWidth,540);
    assert.strictEqual(workspaceSpec.leftMin,520);
    assert.strictEqual(workspaceSpec.leftReserve,520);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(workspaceSpec.primaryEndInset)),{mode:'content'});
    assert.strictEqual(workspaceSpec.layoutStateVersion,'generated-tool-parity-v1');

    assert(pageHeaderSpec,'Generated tool must create a PageHeader.');
    assert.deepStrictEqual(JSON.parse(JSON.stringify(pageHeaderSpec.actions)),[],'Explicit empty page actions must remain empty.');
    assert.strictEqual(pageHeaderSpec.close,true);
    pageHeaderSpec.onClose();
    assert.strictEqual(closedPage,'dkdsGeneratedPage_generated-tool-blueprint-parity');

    assert(activitySpec&&topWorkspaceSpec,'Generated tool must use the existing hosted lifecycle.');
    assert.strictEqual(activitySpec.id,'generated-tool-blueprint-parity');
    assert.strictEqual(topWorkspaceSpec.activity,'generated-tool-blueprint-parity');

    assert.strictEqual(tabsSpecs.length,1);
    assert.strictEqual(tabsSpecs[0].variant,'compact');
    assert.deepStrictEqual(JSON.parse(JSON.stringify(tabsSpecs[0].items.map(row=>row.id))),['Vd','Vs','Vg']);
    assert.strictEqual(tabsSpecs[0].items[0].selected,true);

    assert(layoutVariants.includes('form-grid-2'));
    assert(layoutVariants.includes('action-grid-4'));
    assert(layoutVariants.includes('segment-bar'));
    assert.strictEqual(actionSpecs.length,4,'Four designer actions must be real Unit Action instances.');
    assert.deepStrictEqual(actionSpecs.map(row=>row.id),['generate','add-segment','clear-channel','export-wave']);

    assert.strictEqual(toolbarSpecs.length,1);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(toolbarSpecs[0].actions.map(row=>row.id))),['remove-segment']);
    assert(tableIds.includes('segment-table'),'Parameter designer must own its declared segment Table.');
    assert(tableIds.includes('wave-table'),'Main tool must own its declared result Table.');
    assert.strictEqual(plotSpecs.length,1,'Main tool must expose the declared ScientificPlot.');

    assert(primeSpec,'Generated tool must build the titleless parameter PRIME.');
    assert.strictEqual(primeSpec.priority,96);
    assert.strictEqual(primeSpec.embedded,true);
    assert.strictEqual(primeSpec.autoOpen,false);
    assert.strictEqual(primeSpec.presentationRole,'data-control');
    assert.strictEqual(primeSpec.presentationPurpose,'parameters');

    activation?.deactivate?.();
    console.log('Phase F tool blueprint parity PASS: Tool host + accepted Workspace geometry + compact Tabs + form/action grids + segment Toolbar/Table; no Pulse specialization.');
  }finally{
    fs.rmSync(temp,{recursive:true,force:true});
  }
})().catch(error=>{console.error(error);process.exit(1);});
