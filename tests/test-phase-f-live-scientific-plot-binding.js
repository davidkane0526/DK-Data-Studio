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
  const candidates=process.platform==='win32'?[['python',[]],['py',['-3']]]:[['python3',[]],['python',[]]];
  for(const [cmd,prefix] of candidates){
    const probe=spawnSync(cmd,prefix.concat(['--version']),{encoding:'utf8',env:pythonEnv});
    if(!probe.error&&probe.status===0)return {cmd,prefix};
  }
  throw new Error('Python 3 is required for live ScientificPlot binding gate.');
}

assert(sdkAtLeast(sdk.sdkVersion,'1.51.64'),'Live ScientificPlot curve-array projection requires SDK 1.51.64+.');
assert.strictEqual(unitSpec.UNIT_TEMPLATE_SPEC_VERSION,'2.5.38');
assert.strictEqual(Object.keys(unitSpec.UNIT_CATALOG).length,41);

const spec={
  schema:'dkds.declarative-plugin.v1',
  plugin:{id:'com.example.live-curve-array',name:'Live Curve Array',version:'1.0.0',description:'Domain Adapter curve-array ScientificPlot projection gate'},
  page:{id:'live-curve-array',label:'Live Curve Array',title:'Live Curve Array',actionIds:[]},
  workspace:{activity:'live-curve-array',primaryRole:'scientific-primary'},
  data:{accepts:['science.transport.iv']},
  domainAdapter:{ref:'builtin.example/live',dependency:'builtin.example'},
  content:[{
    kind:'plot',id:'main',title:'Main',xTitle:'Voltage',yTitle:'Current',source:'example:main',renderOwner:'unit',
    binding:{statePath:'visibleSweeps',pointsPath:'points',xKey:'v',yKey:'i',idKey:'id',labelKey:'name',colorValueKey:'vg',directionKey:'direction',selectAction:'selectCurve'}
  }]
};

const py=pythonCommand();
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-live-curve-array-'));
try{
  const specPath=path.join(temp,'spec.json'),out=path.join(temp,'generated');
  fs.writeFileSync(specPath,JSON.stringify(spec,null,2));
  const build=spawnSync(py.cmd,py.prefix.concat([generator,'build',specPath,out]),{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(build.status,0,'generation failed:\n'+build.stdout+'\n'+build.stderr);

  const source=fs.readFileSync(path.join(out,'plugin.js'),'utf8');
  const manifest=JSON.parse(fs.readFileSync(path.join(out,'plugin.json'),'utf8'));

  assert(source.includes('let g_main_curves=[]'),'Bound scientific plot must use a presentation-only curve-array projection.');
  assert(source.includes('getCurves:()=>g_main_curves'),'ScientificPlot must consume the projected curve array through the public Unit contract.');
  assert(source.includes('["visibleSweeps"].reduce((value,key)=>value?.[key],state)'),'Curve array must read only the declared authoritative snapshot path.');
  assert(source.includes('["points"].reduce((value,key)=>value?.[key],row)'),'Point arrays must read only the declared points path.');
  assert(source.includes('x:Number(point?.["v"]),y:Number(point?.["i"])'),'Point mapping must be bounded to declared x/y keys.');
  assert(source.includes('const curve={id,entityId:id,label:String(row?.["name"]??id),points,source:row}'),'Curve identity/label must be projected without domain recomputation.');
  assert(source.includes('if(Number.isFinite(colorValue))curve.colorValue=colorValue'),'Optional numeric color projection must remain bounded.');
  assert(source.includes('if(Number.isFinite(direction))curve.direction=direction'),'Optional direction projection must remain bounded.');
  assert(source.includes("g_main_surface.requestRender?.('domain-adapter')"),'Snapshot refresh must ask the existing ScientificPlot owner to render.');
  assert(source.includes('onCurveSelect:({curve})=>{const id=String(curve?.id||\'\');if(id&&liveDomain?.available?.())void liveDomain.invoke("selectCurve",{id})'),'Curve selection must route only the projected curve id to the declared Domain Adapter action.');
  assert(!/selectedCurve\s*=|selectedSweep\s*=/.test(source),'Generated live plot must not own a duplicate domain selection state.');
  assert(!/visibleSweepIds|resonance|querySelector|document\./.test(source),'Generic generated plot must not implement domain visibility logic or private DOM access.');
  assert(manifest.requiresCore.includes('services')&&manifest.requiresCore.includes('ui.scientific-plot'));
  assert.deepStrictEqual(manifest.pluginDependencies,[{id:'builtin.example'}]);

  const validation=spawnSync(process.execPath,[validator,'validate',out],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(validation.status,0,'generated live plot package failed SDK validation:\n'+validation.stdout+'\n'+validation.stderr);

  const invalidRuntime={...spec,content:[{...spec.content[0],renderOwner:'runtime'}]};
  fs.writeFileSync(specPath,JSON.stringify(invalidRuntime,null,2));
  let rejected=spawnSync(py.cmd,py.prefix.concat([generator,'check',specPath]),{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.notStrictEqual(rejected.status,0,'Bound curve-array plot must reject runtime render ownership.');
  assert((rejected.stderr||'').includes('binding requires renderOwner=unit'));

  const invalidStatic={...spec,content:[{...spec.content[0],points:[[0,1]]}]};
  fs.writeFileSync(specPath,JSON.stringify(invalidStatic,null,2));
  rejected=spawnSync(py.cmd,py.prefix.concat([generator,'check',specPath]),{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.notStrictEqual(rejected.status,0,'Bound curve-array plot must reject duplicate static points.');
  assert((rejected.stderr||'').includes('binding may not be combined with static points'));

  console.log('Phase F live ScientificPlot curve-array binding PASS: authoritative Domain Adapter array -> bounded field mapping -> public ScientificPlot Unit.');
}finally{
  fs.rmSync(temp,{recursive:true,force:true});
}
