'use strict';

const assert=require('assert');
const fs=require('fs');
const os=require('os');
const path=require('path');
const {spawnSync}=require('child_process');

const root=path.resolve(__dirname,'..');
const generator=path.join(root,'sdk','python','dkds_plugin_gen.py');
const validator=path.join(root,'sdk','tools','dkds-plugin.js');
const sdk=require('../sdk/contract.json');
const unitSpec=require('../src/core/ui/modules/composition/unit-template-spec');
const pythonEnv={...process.env,PYTHONDONTWRITEBYTECODE:'1'};

function pythonCommand(){
  const candidates=process.platform==='win32'?[['python',[]],['py',['-3']]]:[['python3',[]],['python',[]]];
  for(const [cmd,prefix] of candidates){
    const probe=spawnSync(cmd,prefix.concat(['--version']),{encoding:'utf8',env:pythonEnv});
    if(!probe.error&&probe.status===0)return {cmd,prefix};
  }
  throw new Error('Python 3 is required for writable parameter binding gate.');
}

assert.strictEqual(sdk.sdkVersion,'1.51.62');
assert.strictEqual(unitSpec.UNIT_TEMPLATE_SPEC_VERSION,'2.5.38');
assert.strictEqual(Object.keys(unitSpec.UNIT_CATALOG).length,41);

const spec={
  schema:'dkds.declarative-plugin.v1',
  plugin:{id:'com.example.writable-domain-params',name:'Writable Domain Params',version:'1.0.0',description:'Writable parameter PRIME Domain Adapter binding gate'},
  page:{id:'writable-domain-params',label:'Writable Domain Params',title:'Writable Domain Params',actionIds:[]},
  workspace:{activity:'writable-domain-params',primaryRole:'scientific-primary'},
  data:{accepts:['science.transport.iv']},
  domainAdapter:{ref:'builtin.example/live',dependency:'builtin.example'},
  parameters:{
    id:'data-control',label:'参数',fields:[
      {id:'enabled',type:'checkbox',label:'Enabled',value:false,binding:{statePath:'settings.enabled',domainAction:'setSetting',argumentKey:'value',staticArgs:{key:'enabled'}}},
      {id:'threshold',type:'number',label:'Threshold',value:1,step:0.1,binding:{statePath:'settings.threshold',domainAction:'setSetting',staticArgs:{key:'threshold'}}},
      {id:'mode',type:'select',label:'Mode',value:'a',options:[{value:'a',label:'A'},{value:'b',label:'B'}],binding:{statePath:'settings.mode',domainAction:'setSetting',staticArgs:{key:'mode'}}}
    ]
  },
  content:[{kind:'note',text:'primary'}]
};

const py=pythonCommand();
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-writable-domain-params-'));
try{
  const specPath=path.join(temp,'spec.json'),out=path.join(temp,'generated');
  fs.writeFileSync(specPath,JSON.stringify(spec,null,2));
  const build=spawnSync(py.cmd,py.prefix.concat([generator,'build',specPath,out]),{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(build.status,0,'generation failed:\n'+build.stdout+'\n'+build.stderr);

  const source=fs.readFileSync(path.join(out,'plugin.js'),'utf8');
  const manifest=JSON.parse(fs.readFileSync(path.join(out,'plugin.json'),'utf8'));

  assert(source.includes('const liveDomain=ctx.services.domain.connect("builtin.example/live")'),'Generated parameter PRIME must consume the declared production Domain Adapter.');
  assert(source.includes('liveBindings.push(state=>{const raw=["settings","enabled"].reduce'),'Checkbox must read authoritative snapshot state.');
  assert(source.includes('g_enabled.input.checked=Boolean(raw)'),'Checkbox must update through the public Check handle.');
  assert(source.includes('liveDomain.invoke("setSetting",{...{"key":"enabled"},["value"]:value})'),'Checkbox change must invoke the declared domain action with bounded static arguments.');
  assert(source.includes("const value=!!event?.target?.checked"),'Checkbox binding must preserve boolean semantics.');
  assert(source.includes("const value=(()=>{const raw=String(event?.target?.value??'');if(raw==='')return null;const value=Number(raw);return Number.isFinite(value)?value:null;})()"),'Number binding must convert through bounded numeric semantics.');
  assert(source.includes('g_mode.control.value=String(raw??"a")'),'Select must refresh through the public Field handle.');
  assert(!source.includes('disabled:true')&&!source.includes('readOnly:true'),'Writable parameter bindings must remain interactive.');
  assert(manifest.requiresCore.includes('services'));
  assert.deepStrictEqual(manifest.pluginDependencies,[{id:'builtin.example'}]);
  assert(!/querySelector|Unit_for_|plugin\.css/.test(source),'Writable parameter bindings must not use private selectors/CSS/plugin-specific Units.');

  const validation=spawnSync(process.execPath,[validator,'validate',out],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(validation.status,0,'generated package validation failed:\n'+validation.stdout+'\n'+validation.stderr);

  const noAdapter={...spec};delete noAdapter.domainAdapter;
  fs.writeFileSync(specPath,JSON.stringify(noAdapter,null,2));
  let rejected=spawnSync(py.cmd,py.prefix.concat([generator,'check',specPath]),{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.notStrictEqual(rejected.status,0,'Writable binding without top-level Domain Adapter must fail closed.');
  assert((rejected.stderr||'').includes('binding requires top-level domainAdapter'));

  const nested={...spec,parameters:{...spec.parameters,fields:spec.parameters.fields.map((field,index)=>index?field:{...field,binding:{...field.binding,staticArgs:{key:{nested:true}}}})}};
  fs.writeFileSync(specPath,JSON.stringify(nested,null,2));
  rejected=spawnSync(py.cmd,py.prefix.concat([generator,'check',specPath]),{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.notStrictEqual(rejected.status,0,'Non-scalar staticArgs must fail closed.');
  assert((rejected.stderr||'').includes('must be a scalar'));

  console.log('Phase F writable parameter Domain Adapter binding PASS: snapshot -> public parameter Unit -> bounded live owner action.');
}finally{
  fs.rmSync(temp,{recursive:true,force:true});
}
