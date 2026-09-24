'use strict';

const assert=require('assert');
const fs=require('fs');
const os=require('os');
const path=require('path');
const {spawnSync}=require('child_process');

const root=path.resolve(__dirname,'..');
const generator=path.join(root,'sdk','python','dkds_plugin_gen.py');
const schema=JSON.parse(fs.readFileSync(path.join(root,'sdk','declarative-plugin.schema.json'),'utf8'));
const pythonEnv={...process.env,PYTHONDONTWRITEBYTECODE:'1'};

function pythonCommand(){
  const candidates=process.platform==='win32'?[['python',[]],['py',['-3']]]:[['python3',[]],['python',[]]];
  for(const [cmd,prefix] of candidates){
    const probe=spawnSync(cmd,prefix.concat(['--version']),{encoding:'utf8',env:pythonEnv});
    if(!probe.error&&probe.status===0)return {cmd,prefix};
  }
  throw new Error('Python 3 is required for the nested ParameterForm gate.');
}

const parameterFormSchema=schema.properties.parameters.properties.groups.items.properties.parameterForm;
assert(parameterFormSchema,'Declarative schema must expose nested parameterForm in parameter PRIME groups.');
assert.deepStrictEqual(parameterFormSchema.properties.layoutOwner.enum,['core','host']);

const spec={
  schema:'dkds.declarative-plugin.v1',
  plugin:{id:'com.example.ter-control-shape',name:'TER Control Shape',version:'1.0.0',description:'Nested public ParameterForm reconstruction gate'},
  page:{id:'ter-control-shape',label:'TER Control Shape',title:'TER Control Shape',actionIds:[]},
  workspace:{activity:'ter-control-shape',primaryRole:'scientific-primary'},
  data:{accepts:['science.transport.iv']},
  parameters:{
    id:'data-control',label:'参数',groups:[{
      id:'transform',title:'Vg–Vd 数据变换热图',variant:'plain',layout:'stack',
      parameterForm:{
        id:'transform-settings',compact:true,autoFit:true,layoutOwner:'core',
        fields:[
          {id:'type',type:'select',label:'处理量',required:true,default:'didv',options:[{value:'didv',label:'dI/dV（微分电导）'}]},
          {id:'direction',type:'select',label:'扫描方向',required:true,default:'1',options:[{value:'1',label:'正扫'},{value:'-1',label:'反扫'}]}
        ]
      }
    }]
  },
  content:[{kind:'note',text:'TER nested control composition gate'}]
};

const py=pythonCommand();
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-nested-parameter-form-'));
try{
  const specPath=path.join(temp,'spec.json');
  const out=path.join(temp,'generated');
  fs.writeFileSync(specPath,JSON.stringify(spec,null,2));
  const build=spawnSync(py.cmd,py.prefix.concat([generator,'build',specPath,out]),{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(build.status,0,'Nested ParameterForm generation failed:\n'+build.stdout+'\n'+build.stderr);
  const source=fs.readFileSync(path.join(out,'plugin.js'),'utf8');
  assert(source.includes('units.parameterForm.mount'),'Nested group must lower to the existing public ParameterForm Unit.');
  assert(source.includes("variant:'fixed-titleless'"),'Nested form must remain inside the canonical titleless parameter PRIME.');
  assert(source.includes("layoutOwner:\"core\""),'Nested form must preserve bounded Unit layout ownership.');
  assert(!/Unit_for_|TERUnit|plugin\.css|document\./.test(source),'Nested form generation must not create specialization/private styling paths.');

  const invalid={...spec,parameters:{...spec.parameters,groups:[{...spec.parameters.groups[0],parameterForm:{...spec.parameters.groups[0].parameterForm,layoutOwner:'plugin'}}]}};
  fs.writeFileSync(specPath,JSON.stringify(invalid,null,2));
  const rejected=spawnSync(py.cmd,py.prefix.concat([generator,'check',specPath]),{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.notStrictEqual(rejected.status,0,'Private layout ownership must fail closed.');
  assert((rejected.stderr||'').includes('layoutOwner must be core or host'));

  console.log('Phase F nested ParameterForm PASS: grouped PRIME -> public ParameterForm -> frozen Unit Templates.');
}finally{
  fs.rmSync(temp,{recursive:true,force:true});
}
