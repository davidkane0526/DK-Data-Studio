'use strict';

const assert=require('assert');
const fs=require('fs');
const os=require('os');
const path=require('path');
const {spawnSync}=require('child_process');

const root=path.resolve(__dirname,'..');
const generator=path.join(root,'sdk','python','dkds_plugin_gen.py');
const validator=path.join(root,'sdk','tools','dkds-plugin.js');
const schema=JSON.parse(fs.readFileSync(path.join(root,'sdk','declarative-plugin.schema.json'),'utf8'));
const pythonEnv={...process.env,PYTHONDONTWRITEBYTECODE:'1'};

function pythonCommand(){
  const candidates=process.platform==='win32'?[['python',[]],['py',['-3']]]:[['python3',[]],['python',[]]];
  for(const [cmd,prefix] of candidates){
    const probe=spawnSync(cmd,prefix.concat(['--version']),{encoding:'utf8',env:pythonEnv});
    if(!probe.error&&probe.status===0)return {cmd,prefix};
  }
  throw new Error('Python 3 is required for the declarative surface composition gate.');
}

assert(schema.properties.surfaces,'Schema must expose generic PRIME/SUB surfaces.');
assert(schema.$defs.surfaceNode,'Schema must expose the bounded recursive public surface vocabulary.');

const spec={
  schema:'dkds.declarative-plugin.v1',
  plugin:{id:'com.example.surface-composition',name:'Surface Composition',version:'1.0.0',description:'Generic PRIME/SUB composition gate'},
  page:{id:'surface-composition',label:'Surface Composition',title:'Surface Composition',actionIds:['clear']},
  workspace:{activity:'surface-composition',primaryRole:'scientific-primary'},
  data:{accepts:['science.transport.iv']},
  actions:[{id:'clear',label:'清除',statusMessage:'已清除',variant:'quiet'}],
  parameters:{id:'data-control',label:'参数',fields:[{id:'gain',type:'number',label:'增益',value:1}]},
  content:[{kind:'note',text:'PRIMARY remains the ordinary generated content path.'}],
  surfaces:[
    {
      id:'curve-inspector',label:'曲线检查器',role:'prime',presentationRole:'inspector',semanticKind:'inspector',
      priority:80,collapsible:true,defaultPlacement:'right',placements:['right','bottom','float'],layout:'stack-comfortable',
      actions:[{id:'columns',kind:'choice-menu',labelPrefix:'Cols: ',title:'Columns',commandId:'surface.columns',argumentKey:'value',defaultValue:'auto',items:[{value:'auto',label:'Auto'},{value:'2',label:'2'}]}],
      children:[
        {kind:'header',id:'inspector-header',title:'曲线检查器',actionIds:['clear']},
        {kind:'panel',id:'selection',variant:'plain',header:false,layout:'stack',children:[
          {kind:'summary',id:'selection-summary',variant:'row',items:[{text:'未选择曲线'}]},
          {kind:'legend',id:'selection-legend',variant:'strip',items:[{label:'当前曲线',variant:'selected'}]}
        ]}
      ]
    },
    {
      id:'physics',label:'物理量',role:'sub',presentationRole:'scientific-secondary',semanticKind:'analysis',
      order:120,keepLeft:false,persistent:true,layout:'fill-rows',
      children:[
        {kind:'panel',id:'physics-controls',variant:'headed',title:'物理量参数',header:true,layout:'form-grid-2',children:[
          {kind:'field',id:'window',type:'number',label:'窗口',value:9},
          {kind:'toolbar',id:'physics-actions',variant:'ordinary',actionIds:['clear']}
        ]},
        {kind:'table',id:'physics-table',columns:[{key:'name',label:'名称'},{key:'value',label:'值'}],rows:[]}
      ]
    }
  ]
};

const py=pythonCommand();
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-surface-composition-'));
try{
  const specPath=path.join(temp,'spec.json');
  const out=path.join(temp,'generated');
  fs.writeFileSync(specPath,JSON.stringify(spec,null,2));
  const build=spawnSync(py.cmd,py.prefix.concat([generator,'build',specPath,out]),{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(build.status,0,'Generic surface generation failed:\n'+build.stdout+'\n'+build.stderr);
  const source=fs.readFileSync(path.join(out,'plugin.js'),'utf8');
  const manifest=JSON.parse(fs.readFileSync(path.join(out,'plugin.json'),'utf8'));

  assert(source.includes("units.prime.build({id:\"curve-inspector\""),'Generic PRIME must lower to the existing public PRIME builder.');
  assert(source.includes("subs.push({id:\"physics\""),'Generic SUB must lower to the existing Workbench SUB contract.');
  assert(source.includes("},primes,subs});"),'Workbench compose must consume generated PRIME and SUB arrays.');
  for(const token of ['units.header.create','units.summary.create','units.legend.create','units.panel.create','units.field.create','units.toolbar.create','units.table.mount']){
    assert(source.includes(token),'Generated surfaces missing public Unit call: '+token);
  }
  assert(manifest.requiresCore.includes('ui.table'),'Nested surface tables must declare the existing table capability.');
  assert(source.includes('ctx.commands.history({commandId:"surface.columns",status:\'completed\',limit:1})'),'Command-backed choice-menu must remain supported alongside Domain Adapter binding.');
  assert(!/Unit_for_|ResonanceUnit|TERUnit|plugin\.css|document\./.test(source),'Generic surface generation must not create plugin-specific/private presentation paths.');

  const validation=spawnSync(process.execPath,[validator,'validate',out],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(validation.status,0,'Generated surface plugin failed ordinary SDK validation:\n'+validation.stdout+'\n'+validation.stderr);

  const invalid={...spec,surfaces:[{...spec.surfaces[0],presentationPurpose:'parameters'}]};
  fs.writeFileSync(specPath,JSON.stringify(invalid,null,2));
  const rejected=spawnSync(py.cmd,py.prefix.concat([generator,'check',specPath]),{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.notStrictEqual(rejected.status,0,'Generic Surface IR must not bypass the canonical parameters PRIME.');
  assert((rejected.stderr||'').includes('use the canonical parameters block'));

  console.log('Phase F generic Surface composition PASS: declarative PRIME/SUB -> bounded public Unit children -> Workbench compose.');
}finally{
  fs.rmSync(temp,{recursive:true,force:true});
}
