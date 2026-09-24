'use strict';

const assert=require('assert');
const fs=require('fs');
const os=require('os');
const path=require('path');
const {spawnSync}=require('child_process');

const root=path.resolve(__dirname,'..');
const reference=path.join(root,'examples','declarative-ter-reconstruction','build_plugin.py');
const validator=path.join(root,'sdk','tools','dkds-plugin.js');
const unitSpec=require('../src/core/ui/modules/composition/unit-template-spec');
const pythonEnv={...process.env,PYTHONDONTWRITEBYTECODE:'1'};

function pythonCommand(){
  const candidates=process.platform==='win32'?[['python',[]],['py',['-3']]]:[['python3',[]],['python',[]]];
  for(const [cmd,prefix] of candidates){
    const probe=spawnSync(cmd,prefix.concat(['--version']),{encoding:'utf8',env:pythonEnv});
    if(!probe.error&&probe.status===0)return {cmd,prefix};
  }
  throw new Error('Python 3 is required for the TER reconstruction gate.');
}

assert.strictEqual(unitSpec.UNIT_TEMPLATE_SPEC_VERSION,'2.5.38','TER reconstruction must not advance the frozen Unit catalog.');

const py=pythonCommand();
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-ter-reconstruction-'));
try{
  const out=path.join(temp,'generated');
  const build=spawnSync(py.cmd,py.prefix.concat([reference,out]),{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(build.status,0,'TER reconstruction generation failed:\n'+build.stdout+'\n'+build.stderr);

  const source=fs.readFileSync(path.join(out,'plugin.js'),'utf8');
  const manifest=JSON.parse(fs.readFileSync(path.join(out,'plugin.json'),'utf8'));

  assert(source.includes("variant:'fixed-titleless'")&&source.includes("presentationPurpose:'parameters'"),'TER parameters must remain the canonical titleless parameter PRIME.');
  assert(source.includes('units.parameterForm.mount'),'TER transform settings must use the existing public ParameterForm Unit.');
  assert(source.includes("columns:3,preferredColumns:3,maxColumns:7,minItemWidth:260,responsive:true,density:\"comfortable\""),'TER PlotGroup geometry must remain declarative Unit detail.');
  assert.strictEqual((source.match(/_view=g_ter_plots_group\.addPlot/g)||[]).length,7,'TER reconstruction must declare seven PlotGroup children.');
  assert(source.includes('renderOwner:\"runtime\"'),'TER plots must preserve the single-owner runtime renderer bridge.');
  assert(source.includes('detailGeometry:{\"contentAspectRatio\":1.0,\"contentMinHeightPx\":80,\"contentMaxHeightPx\":860}'),'TER heatmaps must preserve square bounded detail geometry.');
  assert(source.includes('detailGeometry:{\"contentMinHeightPx\":320}'),'TER R–V plot must preserve its accepted minimum height.');
  assert(source.includes('TER_Max–Vg 数据')&&source.includes('TER_Max–Vd 数据'),'TER reconstruction must keep both production result-table regions.');
  assert(manifest.requiresCore.includes('ui.group-area')&&manifest.requiresCore.includes('ui.plot-views')&&manifest.requiresCore.includes('ui.table')&&manifest.requiresCore.includes('parameters'));
  assert(!manifest.styles,'TER declarative reconstruction must not ship private CSS.');
  assert(!/Unit_for_|TERUnit|plugin\.css|document\./.test(source),'TER reconstruction must not introduce a plugin-specialized presentation path.');

  const validation=spawnSync(process.execPath,[validator,'validate',out],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(validation.status,0,'Generated TER reconstruction failed ordinary SDK validation:\n'+validation.stdout+'\n'+validation.stderr);

  console.log('Phase F TER declarative reconstruction PASS: titleless PRIME + nested ParameterForm + seven runtime-owned PlotGroup children + bounded accepted geometry + result tables.');
}finally{
  fs.rmSync(temp,{recursive:true,force:true});
}
