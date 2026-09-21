'use strict';
const assert=require('assert');
const crypto=require('crypto');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const sha=rel=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,rel))).digest('hex');
const spec=require('../src/core/ui/modules/composition/unit-template-spec');

assert(Number(json('package.json').version.split('.').at(-1))>=56,'App version must retain the v3.71.56+ baseline.');
assert.strictEqual(spec.UNIT_TEMPLATE_SPEC_VERSION,'2.5.38');
assert(Number(json('sdk/contract.json').sdkVersion.split('.').at(-1))>=43,'Vth fill-chain contract requires SDK 1.51.43+');
assert(spec.UNIT_CONTRACTS.panel.invariants.some(row=>row.includes('continuous fill chain')),'Panel sizing=fill must publish continuous shell/body fill propagation.');
assert(spec.UNIT_CONTRACTS.splitPane.invariants.some(row=>row.includes('fill their allocated track')),'Created SplitPane regions must publish fill-host semantics.');

const structure=read('src/styles/structure/sdk-semantic-surfaces.css');
assert(/data-dkds-unit-panel-sizing="fill"\]\{[\s\S]*?display:flex;[\s\S]*?flex-direction:column;/.test(structure),'Panel sizing=fill shell must be a column fill-container.');
assert(/data-dkds-unit-panel-sizing="fill"\]>\[data-dkds-unit-panel-body="true"\]\{[\s\S]*?flex:1 1 auto;[\s\S]*?min-height:0;/.test(structure),'Panel sizing=fill body must consume the remaining shell height.');

const behavior=read('src/core/ui/modules/composition/unit-template-behavior.js');
for(const token of ["first.dataset.dkdsUnitSplitRegion='first'","second.dataset.dkdsUnitSplitRegion='second'","'display':'grid'","'grid-template-columns':'minmax(0,1fr)'","'grid-template-rows':'minmax(0,1fr)'","'min-width':'0'","'min-height':'0'"])
  assert(behavior.includes(token),`Created SplitPane region fill contract missing: ${token}`);

const unit=read('src/plugins/transfer-vth-lab/unit-presentation.js');
for(const token of [
  "const dataPanel=units.panel.create(controlsHost,{variant:'headed',title:'数据',sizing:'content'})",
  "units.layout.apply(dataPanel.body,{variant:'stack',geometry:{padding:'10px',gap:'8px',minWidth:'0'}})",
  "units.note.create(dataPanel.body,{variant:'meta'",
  "const extraction=units.panel.create(controlsHost,{variant:'plain',header:false,sizing:'content'})",
  "units.layout.apply(extraction.body,{variant:'stack',geometry:{padding:'10px',gap:'8px',minWidth:'0'}})",
  "units.header.create(extraction.body,{kind:'content',variant:'content',title:'阈值提取',actions:false})",
  "const plotPanel=units.panel.detached({variant:'plot-card',header:false,sizing:'fill'})",
  "units.splitPane.create(main,{id:'vth-results-height-v3'"
])assert(unit.includes(token),`Production Vth source-faithful Unit composition missing: ${token}`);
assert(!unit.includes("units.panel.create(controlsHost,{variant:'headed',title:'阈值提取'"),'Vth extraction title must not regress to a second painted panel title strip.');
assert(!/\.style\.|ctx\.ui\.styles\.|dom\.style\(|dom\.token\(/.test(unit),'Vth layout repair must remain within public Unit geometry, not private style writes.');

const shadow=read('examples/sdk151-unit-vth-shadow/plugin.js');
for(const token of ["title:'数据',sizing:'content'","variant:'meta',text:'数据导入由 Core 统一提供","variant:'plain',header:false,sizing:'content'","kind:'content',variant:'content',title:'阈值提取'","padding:'10px',gap:'8px'"])
  assert(shadow.includes(token),`SDK Vth shadow must mirror the corrected public Unit composition: ${token}`);

const manifest=json('src/plugins/transfer-vth-lab/plugin.json');
assert(Number(manifest.version.split('.').at(-1))>=3,'Vth must retain the accepted 3.3.3+ baseline.');
assert.deepStrictEqual(manifest.styles,[],'Vth source-faithful correction must not restore private plugin CSS.');
assert(!fs.existsSync(path.join(root,'src/plugins/transfer-vth-lab/plugin.css')),'Retired Vth stylesheet must be physically removed rather than retained as dead source.');
for(const [rel,expected] of Object.entries({
  'src/plugins/transfer-vth-lab/analysis-runtime.js':'236fd11a5490ab7745585033935a428059d654c9874cd21803a04141f2713b3d',
  'src/plugins/transfer-vth-lab/vth-task.js':'cc2230b56d9f0fad8f040d70dd50bc27b29585e4ec47c9cde9b1e65672246cb1',
  'src/plugins/transfer-vth-lab/live-domain.js':'1ffa1fda16b3c4b710b325689bdb507e2b5b7155f34823d0d3949374fc4acf68',
  'src/plugins/transfer-vth-lab/domain-adapter.js':'bf8cb24e1180af7723fd67b31392b8c1aad8fc366813e624881c4ddcbf956cb7'
}))assert.strictEqual(sha(rel),expected,`Presentation-only correction changed protected Vth owner: ${rel}`);

console.log('v3.71.55 Vth source-faithful parameter anatomy + Unit fill-chain closure PASS');
