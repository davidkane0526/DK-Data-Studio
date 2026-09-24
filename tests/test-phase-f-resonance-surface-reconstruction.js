'use strict';

const assert=require('assert');
const fs=require('fs');
const os=require('os');
const path=require('path');
const {spawnSync}=require('child_process');

const root=path.resolve(__dirname,'..');
const reference=path.join(root,'examples','declarative-resonance-surfaces','build_plugin.py');
const validator=path.join(root,'sdk','tools','dkds-plugin.js');
const unitSpec=require('../src/core/ui/modules/composition/unit-template-spec');
const sdk=require('../sdk/contract.json');
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
  throw new Error('Python 3 is required for the Resonance surface reconstruction gate.');
}

assert(sdkAtLeast(sdk.sdkVersion,'1.51.58'),'Resonance surface reconstruction requires SDK 1.51.58+.');
assert.strictEqual(unitSpec.UNIT_TEMPLATE_SPEC_VERSION,'2.5.38');
assert.strictEqual(Object.keys(unitSpec.UNIT_CATALOG).length,41);

const py=pythonCommand();
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-resonance-surfaces-'));
try{
  const out=path.join(temp,'generated');
  const build=spawnSync(py.cmd,py.prefix.concat([reference,out]),{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(build.status,0,'Resonance surface generation failed:\n'+build.stdout+'\n'+build.stderr);

  const source=fs.readFileSync(path.join(out,'plugin.js'),'utf8');
  const manifest=JSON.parse(fs.readFileSync(path.join(out,'plugin.json'),'utf8'));

  assert(source.includes('id:"curve-inspector"')&&source.includes('id:"group-analysis"'),'Resonance reconstruction must expose both non-parameter PRIME surfaces.');
  for(const id of ['physics','spacing','gate-analysis']){
    assert(source.includes('subs.push({id:"'+id+'"'),'Missing Resonance SUB '+id);
  }
  assert(source.includes('detailGeometry:{"minContentInlinePx":320,"minContentBlockPx":220}'),'Inspector PRIME must preserve accepted minimum content geometry.');
  assert(source.includes('handle:g_curve_inspector_inspector_header.element,controlsHost:g_curve_inspector_inspector_header.actions'),'Movable inspector PRIME must adopt the same public Header Unit as its single chrome owner.');
  assert(source.includes('handle:g_group_analysis_group_header.element,controlsHost:g_group_analysis_group_header.actions'),'Movable group PRIME must adopt the same public Header Unit as its single chrome owner.');
  assert(source.includes('units.status.create'),'Inspector composition must stay in the public Status Unit.');
  assert(source.includes('units.floatingChrome.create'),'Group controls must stay in the public FloatingChrome Unit.');
  assert(source.includes('id:"group-columns",menu:true'),'Group-columns must lower to the existing Core ActionGroup menu contract.');
  assert(source.includes('liveDomain.snapshot()?.state')&&source.includes('liveDomain.invoke("setGroupColumns"'),'Domain-bound menu must project and mutate the single production owner through the generic Domain Adapter.');
  assert(source.includes('g_curve_inspector_inspector_status.textContent=')&&source.includes('g_group_analysis_group_series_count.value.textContent=')&&source.includes('g_spacing_spacing_table?.setData?.'),'Resonance specimen must project the live owner into public Status/Metric/Table handles.');
  assert(source.includes('actionHost:g_group_analysis_group_header.actions'),'The dynamic menu must reuse the same canonical public Header action host.');
  assert(!/let\s+[^;]*group[_-]?columns[^;]*=/.test(source),'Generated group-columns menu must not create a second mutable state owner.');
  assert(source.includes('units.scientificPlot.create')&&source.includes("renderOwner:'runtime'"),'Derived scientific plots must preserve the runtime render-owner bridge.');
  assert(source.includes('ctx.commands.get("resonance.renderPhysics")')&&source.includes('ctx.commands.get("resonance.resize")'),'Lifecycle behavior must be represented only as bounded command references.');
  assert(manifest.requiresCore.includes('execution.commands'));
  assert(manifest.requiresCore.includes('services'),'Domain-bound reconstruction must declare the generic services capability.');
  assert.deepStrictEqual(manifest.pluginDependencies,[{id:'builtin.resonance-workbench'}],'Domain adapter access must remain dependency-scoped.');
  assert(manifest.requiresCore.includes('ui.scientific-plot'));
  assert(manifest.requiresCore.includes('ui.table'));
  assert(!/Unit_for_|ResonanceUnit|plugin\.css|document\./.test(source),'Resonance reconstruction must not introduce plugin-specialized Units/private DOM/CSS.');

  const validation=spawnSync(process.execPath,[validator,'validate',out],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(validation.status,0,'Generated Resonance surface package failed ordinary SDK validation:\n'+validation.stdout+'\n'+validation.stderr);

  console.log('Phase F Resonance Surface reconstruction PASS: two generic PRIME + three SUB + nested public Unit tree + bounded command lifecycle refs.');
}finally{
  fs.rmSync(temp,{recursive:true,force:true});
}
