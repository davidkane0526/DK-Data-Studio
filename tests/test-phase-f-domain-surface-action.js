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

function sdkAtLeast(actual,minimum){
  const a=String(actual).split('.').map(Number),b=String(minimum).split('.').map(Number);
  for(let i=0;i<3;i++){if((a[i]||0)>(b[i]||0))return true;if((a[i]||0)<(b[i]||0))return false;}
  return true;
}
function pythonCommand(){
  for(const [cmd,prefix] of (process.platform==='win32'?[['python',[]],['py',['-3']]]:[['python3',[]],['python',[]]])){
    const probe=spawnSync(cmd,prefix.concat(['--version']),{encoding:'utf8',env:pythonEnv});
    if(!probe.error&&probe.status===0)return {cmd,prefix};
  }
  throw new Error('Python 3 is required for the domain-bound Surface Action gate.');
}

assert(sdkAtLeast(sdk.sdkVersion,'1.51.68'),'Domain-bound Surface Action requires SDK 1.51.68+.');
assert.strictEqual(unitSpec.UNIT_TEMPLATE_SPEC_VERSION,'2.5.38');
assert.strictEqual(Object.keys(unitSpec.UNIT_CATALOG).length,41);

const spec={
  schema:'dkds.declarative-plugin.v1',
  plugin:{id:'com.example.domain-surface-action',name:'Domain Surface Action',version:'1.0.0',description:'Bounded Domain Adapter action gate'},
  page:{id:'domain-surface-action',label:'Domain Surface Action',title:'Domain Surface Action',actionIds:[]},
  workspace:{activity:'domain-surface-action',primaryRole:'scientific-primary'},
  data:{accepts:['science.transport.iv']},
  domainAdapter:{ref:'builtin.example/live',dependency:'builtin.example'},
  actions:[{id:'ordinary',label:'Ordinary',statusMessage:'ordinary invoked',variant:'quiet'}],
  content:[{kind:'note',text:'primary'}],
  surfaces:[{
    id:'inspector',label:'Inspector',role:'prime',presentationRole:'inspector',semanticKind:'inspector',
    placements:['right','bottom','float'],defaultPlacement:'right',chromeHeaderId:'head',
    children:[
      {kind:'header',id:'head',title:'Inspector'},
      {kind:'action',id:'ordinary-button',actionId:'ordinary'},
      {kind:'action',id:'delete-selected',label:'Delete selected',variant:'secondary',domainAction:'deleteSelected',staticArgs:{scope:'focused'},enabledPath:'selection.hasItem'}
    ]
  }]
};

const py=pythonCommand();
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-domain-surface-action-'));
try{
  const specPath=path.join(temp,'spec.json'),out=path.join(temp,'generated');
  fs.writeFileSync(specPath,JSON.stringify(spec,null,2));
  const build=spawnSync(py.cmd,py.prefix.concat([generator,'build',specPath,out]),{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(build.status,0,'generation failed:\n'+build.stdout+'\n'+build.stderr);
  const source=fs.readFileSync(path.join(out,'plugin.js'),'utf8');
  const manifest=JSON.parse(fs.readFileSync(path.join(out,'plugin.json'),'utf8'));

  assert(source.includes('units.action.create'),'Both action paths must lower to the existing public Action Unit.');
  assert(source.includes('id:"ordinary",label:"Ordinary"'),'Ordinary actionId mode must remain intact.');
  assert(source.includes('id:"delete-selected",label:"Delete selected",variant:"secondary",direct:true'),'Domain action mode must remain a canonical direct Action Unit.');
  assert(source.includes('liveDomain.invoke("deleteSelected",{"scope":"focused"})'),'Domain Surface Action must invoke only the declared adapter action with bounded scalar arguments.');
  assert(source.includes('["selection","hasItem"].reduce((value,key)=>value?.[key],liveDomain.snapshot()?.state||{})'),'enabledPath must read only the authoritative Domain Adapter snapshot.');
  assert(source.includes('button.disabled=!(Boolean(raw)&&!!liveDomain?.available?.())'),'Snapshot refresh must update the public Action handle disabled state.');
  assert(!/querySelector|Unit_for_|plugin\.css|new Set\(.*selected/i.test(source),'Domain Surface Action must not create private DOM, plugin-specific Units or local selection state.');
  assert(manifest.requiresCore.includes('services'),'Domain-bound actions must declare the Core services capability.');
  assert.deepStrictEqual(manifest.pluginDependencies,[{id:'builtin.example'}]);

  const validation=spawnSync(process.execPath,[validator,'validate',out],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(validation.status,0,'generated package validation failed:\n'+validation.stdout+'\n'+validation.stderr);

  const both=structuredClone(spec);
  both.surfaces[0].children[2].actionId='ordinary';
  fs.writeFileSync(specPath,JSON.stringify(both,null,2));
  let rejected=spawnSync(py.cmd,py.prefix.concat([generator,'check',specPath]),{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.notStrictEqual(rejected.status,0,'Surface Action with both actionId and domainAction must fail closed.');
  assert((rejected.stderr||'').includes('requires exactly one of actionId or domainAction'));

  const nested=structuredClone(spec);
  nested.surfaces[0].children[2].staticArgs={scope:{nested:true}};
  fs.writeFileSync(specPath,JSON.stringify(nested,null,2));
  rejected=spawnSync(py.cmd,py.prefix.concat([generator,'check',specPath]),{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.notStrictEqual(rejected.status,0,'Nested domain action staticArgs must fail closed.');
  assert((rejected.stderr||'').includes('must be a scalar'));

  const noAdapter=structuredClone(spec);delete noAdapter.domainAdapter;
  fs.writeFileSync(specPath,JSON.stringify(noAdapter,null,2));
  rejected=spawnSync(py.cmd,py.prefix.concat([generator,'check',specPath]),{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.notStrictEqual(rejected.status,0,'Domain Surface Action without a top-level adapter must fail closed.');
  assert((rejected.stderr||'').includes('requires top-level domainAdapter'));

  console.log('Phase F domain-bound Surface Action PASS: public Action Unit -> bounded live adapter intent + snapshot enablement.');
}finally{
  fs.rmSync(temp,{recursive:true,force:true});
}
