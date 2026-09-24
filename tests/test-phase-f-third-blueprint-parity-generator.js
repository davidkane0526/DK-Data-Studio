'use strict';

const assert=require('assert');
const fs=require('fs');
const os=require('os');
const path=require('path');
const {spawnSync}=require('child_process');

const root=path.resolve(__dirname,'..');
const reference=path.join(root,'examples','declarative-python-pulse-analysis-parity','build_plugin.py');
const validator=path.join(root,'sdk','tools','dkds-plugin.js');
const schema=JSON.parse(fs.readFileSync(path.join(root,'sdk','declarative-plugin.schema.json'),'utf8'));
const blueprints=JSON.parse(fs.readFileSync(path.join(root,'sdk','native-plugin-unit-blueprints.json'),'utf8'));
const sdk=JSON.parse(fs.readFileSync(path.join(root,'sdk','contract.json'),'utf8'));
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
  throw new Error('Python 3 is required for the third blueprint parity gate.');
}

const kinds=schema.properties.content.items.oneOf.map(row=>row?.properties?.kind?.const).filter(Boolean);
for(const kind of ['summary','empty-state','list','plot-view'])
  assert(kinds.includes(kind),'Declarative schema missing generic content kind: '+kind);

assert(sdkAtLeast(sdk.sdkVersion,'1.51.54'),'Third production blueprint parity requires SDK 1.51.54+.');
assert.strictEqual(unitSpec.UNIT_TEMPLATE_SPEC_VERSION,'2.5.38');
const pulse=blueprints.blueprints['pulse-analysis'];
assert(pulse,'Pulse Analysis production blueprint must remain published as external parity evidence.');
for(const unit of ['summary','emptyState','list','plotView','scientificPlot','table','prime'])
  assert(pulse.units.includes(unit),'Pulse Analysis blueprint lost expected generic Unit: '+unit);

const py=pythonCommand();
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-third-blueprint-'));
try{
  const generated=path.join(temp,'generated');
  const build=spawnSync(py.cmd,py.prefix.concat([reference,generated]),{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(build.status,0,'Third blueprint reference generation failed:\n'+build.stdout+'\n'+build.stderr);

  const files=fs.readdirSync(generated).sort();
  assert.deepStrictEqual(files,['README.md','plugin.js','plugin.json']);
  const manifest=JSON.parse(fs.readFileSync(path.join(generated,'plugin.json'),'utf8'));
  const source=fs.readFileSync(path.join(generated,'plugin.js'),'utf8');

  for(const token of [
    'units.summary.create',
    'units.list.create',
    'units.emptyState.create',
    'units.plotView.adopt',
    'units.scientificPlot.create',
    'units.table.mount',
    "variant:'fixed-titleless'",
    "presentationPurpose:'parameters'",
    'ctx.ui.topWorkspace.register'
  ])assert(source.includes(token),'Generated third blueprint parity missing public Unit/lifecycle path: '+token);

  for(const required of ['ui.plot-views','ui.portable','ui.scientific-plot','ui.table','ui.unit-templates'])
    assert(manifest.requiresCore.includes(required),'Generated manifest missing public dependency: '+required);

  assert(!/builtin\.pulse-analysis|pulseAnalysisPage|pulseSegmentationMode|pulseReadPlot|pulseRawPlot|plugin\.css/.test(source),
    'Generated third blueprint parity must not copy Pulse Analysis private/domain identifiers or CSS.');

  const validation=spawnSync(process.execPath,[validator,'validate',generated],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(validation.status,0,'Generated third blueprint plugin failed ordinary SDK validation:\n'+validation.stdout+'\n'+validation.stderr);

  console.log('Phase F third production blueprint parity PASS: hosted scientific workspace -> Summary/List/EmptyState/PlotView/ScientificPlot/Table; no Pulse specialization.');
}finally{
  fs.rmSync(temp,{recursive:true,force:true});
}
