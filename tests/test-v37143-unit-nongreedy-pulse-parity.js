'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const hash=rel=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,rel))).digest('hex');

const spec=require('../src/core/ui/modules/composition/unit-template-spec');
const {LAYOUT_RECIPES}=require('../src/core/ui/modules/composition/unit-template-layout-spec');
assert(Number(spec.UNIT_TEMPLATE_SPEC_VERSION.split('.').at(-1))>=17,'Unit Templates must retain the v2.5.17 non-greedy baseline or later.');
assert.strictEqual(Object.keys(spec.UNIT_CATALOG).length,41,'Unit catalog must remain the shared 41-type minimum common denominator.');

// Generic Unit defaults must be compact and non-greedy.
assert.strictEqual(LAYOUT_RECIPES['form-grid-2'].gridTemplateColumns,'repeat(2,minmax(128px,1fr))');
assert.deepStrictEqual(LAYOUT_RECIPES['form-grid-2'].responsive,[{maxWidth:310,gridTemplateColumns:'minmax(0,1fr)'}]);
assert.strictEqual(LAYOUT_RECIPES['action-grid-4'].gridTemplateColumns,'repeat(4,minmax(0,1fr))');
assert((LAYOUT_RECIPES['action-grid-4'].responsive||[]).some(row=>row.maxWidth<=380&&row.gridTemplateColumns==='repeat(2,minmax(0,1fr))'),'Four-action rows may reduce to two only under real width pressure.');
assert.strictEqual(LAYOUT_RECIPES['analysis-control-grid'].responsive.at(-1).maxWidth,620);
assert.strictEqual(LAYOUT_RECIPES['result-control-grid'].responsive.at(-1).maxWidth,620);

const layoutRuntime=read('src/core/ui/modules/composition/unit-template-layout.js');
assert(layoutRuntime.includes("if(!(Number(width)>0))return [];"),'Unknown width must not activate responsive geometry.');
assert(layoutRuntime.includes("if(!(Number(width)>0)){const base={...recipe};delete base.responsive;return base;}"),'Unknown width must preserve the base recipe.');

// Header hierarchy is a generic Unit capability, not a Pulse-private CSS feature.
const foundation=read('src/core/ui/modules/composition/unit-template-foundation.js');
for(const token of ['spec.eyebrow','titleEmphasis','metaPlacement','dkds-surface-eyebrow','dkdsUnitHeaderMetaPlacement'])assert(foundation.includes(token),`Header Unit missing ${token}`);
const dts=read('sdk/plugin-api.d.ts');
for(const token of ["eyebrow?:string","titleEmphasis?:'standard'|'prominent'|'compact'","metaPlacement?:'inline'|'title-inline'|'trailing'"])assert(dts.includes(token),`SDK type missing ${token}`);

const pulse=read('src/plugins/pulse-sampler-tool/unit-presentation.js');
for(const token of [
  "subtitle:'Pulse Generator · Vd / Vs / Vg · Steady-state Sampling'",
  "eyebrow:'PULSE DESIGNER'",
  "eyebrow:'MERGED WAVEFORM'",
  "eyebrow:'SAMPLING'",
  "eyebrow:'RESULT'",
  "variant:'fill-rows'",
  "variant:'form-grid-2'",
  "variant:'action-grid-4'",
  "gridTemplateRows:'auto minmax(0,1fr) minmax(0,.58fr)'",
  "units.layout.apply(analysis.body,{variant:'identity'",

  "stateVersion:'presentation-v3'"
])assert(pulse.includes(token),`Pulse Unit parity composition missing ${token}`);
assert(!pulse.includes('detailGeometry:{contentInsetPx:14}'),'Pulse parameter PRIME must use the uniform Core outer inset instead of a plugin-specific 14 px override.');

const manifest=JSON.parse(read('src/plugins/pulse-sampler-tool/plugin.json'));
assert(Number(manifest.version.split('.').at(-1))>=20,'Pulse production Unit must retain the v1.9.20 parity baseline or later.');
assert.deepStrictEqual(manifest.styles,[],'Pulse production presentation must remain CSS-free.');
assert(!fs.existsSync(path.join(root,'src/plugins/pulse-sampler-tool/plugin.css')));
assert(!fs.existsSync(path.join(root,'src/plugins/pulse-sampler-tool/mobile.css')));

// Presentation repair must not move or duplicate scientific/domain/task owners.
assert.strictEqual(hash('src/plugins/pulse-sampler-tool/live-domain.js'),'a982b457b702b79d957f029cf2a403f9b180c5bd443f4172faf71f630f074d56');
assert.strictEqual(hash('src/plugins/pulse-sampler-tool/domain-adapter.js'),'a7b7c038970dc10a3c530dd098167d03dc3796d1789792c7c1215bd4430e21ac');
assert.strictEqual(hash('src/plugins/pulse-sampler-tool/steady-state-task.js'),'1132645c3509c04ec7ab11183cb6eebef9d5b678734a5b27700dcad27f5084d5');

console.log('v3.71.43 non-greedy Unit baseline + Pulse presentation parity non-regression PASS');
