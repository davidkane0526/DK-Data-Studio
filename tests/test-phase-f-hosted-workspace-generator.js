'use strict';

const assert=require('assert');
const fs=require('fs');
const os=require('os');
const path=require('path');
const vm=require('vm');
const {spawnSync}=require('child_process');

const root=path.resolve(__dirname,'..');
const reference=path.join(root,'examples','declarative-python-hosted-workspace','build_plugins.py');
const generator=path.join(root,'sdk','python','dkds_plugin_gen.py');
const validator=path.join(root,'sdk','tools','dkds-plugin.js');
const schema=JSON.parse(fs.readFileSync(path.join(root,'sdk','declarative-plugin.schema.json'),'utf8'));
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
  throw new Error('Python 3 is required for the Phase F hosted-workspace gate.');
}
function node(){return {appendChild(){},replaceChildren(){},querySelector(){return null;},dataset:{},style:{}};}

async function exercise(dir,expected){
  const manifest=JSON.parse(fs.readFileSync(path.join(dir,'plugin.json'),'utf8'));
  const source=fs.readFileSync(path.join(dir,'plugin.js'),'utf8');

  assert.strictEqual(manifest.apiVersion,'1.19.0');
  assert.strictEqual(manifest.pluginType,expected.pluginType);
  assert.strictEqual(manifest.workspace.role,'top');
  assert.strictEqual(manifest.workspace.activity,expected.activity);
  assert.strictEqual(manifest.window.activity,expected.activity);
  assert.strictEqual(manifest.window.persistence,expected.persistence);
  assert.strictEqual(manifest.window.artifactHydration,expected.hydration);
  assert.deepStrictEqual(manifest.window.dependencies,['scientific-renderer']);
  for(const required of ['workspace','ui.workspace','ui.activities','ui.top-workspace','ui.pages','ui.unit-templates','ui.scientific-plot'])
    assert(manifest.requiresCore.includes(required),'Hosted generated manifest missing '+required);
  assert(manifest.capabilities.includes('ui.top-workspace'));
  assert(!manifest.styles,'Hosted generator must not create private CSS.');

  for(const token of ['ctx.ui.activities.add','openMode:\'window\'','ctx.workspace.openPage','ctx.ui.topWorkspace.register'])
    assert(source.includes(token),'Hosted generated runtime missing public lifecycle path: '+token);
  assert(!/window\.open|BrowserWindow|ipcRenderer|ipcMain|Presenter|Unit_for_|plugin\.css/.test(source),
    'Hosted generator must not create a private window/Presenter/Unit path.');

  const validation=spawnSync(process.execPath,[validator,'validate',dir],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(validation.status,0,'Hosted generated plugin failed ordinary SDK validation:\n'+validation.stdout+'\n'+validation.stderr);

  let registered=null,activity=null,pageSpec=null,top=null,composed=null,opened=null;
  const units={
    pageHeader:{create(){return {actions:node()};}},
    page:{create(){return {element:node()};}},
    layout:{create(){return node();}},
    workspace:{create(){return {compose(spec){composed=spec;},dispose(){}};}},
    panel:{create(){return {body:node()};}},
    field:{create(_host,spec){return {control:{value:String(spec.value??'')}};}},
    check:{create(){return {input:{checked:false}};}},
    prime:{build(spec){return spec;}},
    scientificPlot:{create(){return {requestRender(){},dispose(){}};}}
  };
  const sandbox={
    console,
    DKDSPlugins:{define(manifestValue,factory){registered={manifest:manifestValue,factory};}}
  };
  sandbox.globalThis=sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source,sandbox,{filename:path.join(dir,'plugin.js')});
  assert(registered);

  const instance=await registered.factory({
    status:{set(){}},
    workspace:{openPage(id){opened=id;return true;}},
    ui:{
      unitTemplates:units,
      pages:{add(spec){pageSpec=JSON.parse(JSON.stringify(spec));return node();}},
      activities:{add(spec){activity=spec;return spec;}},
      topWorkspace:{register(spec){top=JSON.parse(JSON.stringify(spec));return spec;}}
    }
  });

  assert(activity,'Hosted plugin must register an Activity.');
  assert.strictEqual(activity.id,expected.activity);
  assert.strictEqual(activity.openMode,'window');
  assert.strictEqual(activity.artifactHydration,expected.hydration);
  activity.onActivate();
  assert.strictEqual(opened,'dkdsGeneratedPage_generated-hosted-page');

  assert.strictEqual(pageSpec.pageId,'dkdsGeneratedPage_generated-hosted-page');
  assert.strictEqual(pageSpec.activity,expected.activity);
  assert.strictEqual(pageSpec.toolbar,false);

  assert(top,'Hosted plugin must register a TopWorkspace.');
  assert.strictEqual(top.id,expected.activity);
  assert.strictEqual(top.activity,expected.activity);
  assert.strictEqual(top.layout.mode,'native');
  assert.strictEqual(top.layout.root.selector,'#dkdsGeneratedPage_generated-hosted-page .dkds-plugin-workspace');
  assert.strictEqual(top.layout.primary.id,'main');
  assert.strictEqual(top.layout.primary.presentationRole,expected.primaryRole);
  assert.deepStrictEqual(top.layout.prime,[{
    id:'parameters',label:'参数',semanticKind:'panel',presentationPurpose:'parameters',
    presentationRole:'data-control',priority:90,collapsible:true
  }]);
  assert(Array.isArray(composed?.primes)&&composed.primes.length===1);
  assert.strictEqual(composed.primary.presentationRole,expected.primaryRole);

  instance?.deactivate?.();
}

(async()=>{
  assert.strictEqual(unitSpec.UNIT_TEMPLATE_SPEC_VERSION,'2.5.38',
    'Hosted generation must consume the frozen Unit 2.5.38 contract.');
  assert(schema.properties.host,'Declarative schema must expose a bounded host lifecycle declaration.');

  const py=pythonCommand();
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-hosted-generator-'));
  try{
    const generated=path.join(temp,'generated');
    const build=spawnSync(py.cmd,py.prefix.concat([reference,generated]),{cwd:root,encoding:'utf8',env:pythonEnv});
    assert.strictEqual(build.status,0,'Hosted reference generation failed:\n'+build.stdout+'\n'+build.stderr);

    await exercise(path.join(generated,'top'),{
      pluginType:'workbench',activity:'generated-top',persistence:'project',hydration:'live',primaryRole:'scientific-primary'
    });
    await exercise(path.join(generated,'tool'),{
      pluginType:'tool',activity:'generated-tool',persistence:'memory',hydration:'project',primaryRole:'utility-primary'
    });

    const bad=path.join(temp,'bad.json');
    fs.writeFileSync(bad,JSON.stringify({
      schema:'dkds.declarative-plugin.v1',
      plugin:{id:'com.example.bad-host',name:'Bad Host',version:'1.0.0',description:'invalid standalone window'},
      page:{id:'bad-host-page',label:'Bad',title:'Bad'},
      workspace:{activity:'bad-host',primaryRole:'utility-primary'},
      host:{kind:'standalone',window:{width:800}},
      data:{accepts:['data.table']},
      content:[{kind:'note',text:'bad'}]
    },null,2));
    const rejected=spawnSync(py.cmd,py.prefix.concat([generator,'check',bad]),{cwd:root,encoding:'utf8',env:pythonEnv});
    assert.notStrictEqual(rejected.status,0,'Standalone host must fail closed on dedicated-window fields.');
    assert((rejected.stderr||'').includes('standalone host supports only kind'));

    console.log('Phase F hosted workspace generator PASS: standalone remains default; generated TOP/Tool reuse Activity + Page + TopWorkspace + dedicated-window contracts; frozen Units only.');
  }finally{
    fs.rmSync(temp,{recursive:true,force:true});
  }
})().catch(error=>{console.error(error);process.exit(1);});
