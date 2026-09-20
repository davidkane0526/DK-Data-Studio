'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const hash=rel=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,rel))).digest('hex');

assert(Number(json('package.json').version.split('.').at(-1))>=49,'This regression requires the 3.71.49 baseline or later.');
const geometryValues=require('../src/core/ui/modules/composition/unit-template-geometry-values').ACCEPTED_LAYOUT_GEOMETRY_VALUES;
assert(geometryValues['grid-template-rows'].includes('auto auto auto auto'),'The accepted Unit geometry vocabulary must retain the source-faithful four intrinsic Sampling rows.');
for(const rel of ['src/plugins/pulse-sampler-tool/unit-presentation.js','examples/sdk151-unit-pulse-sampler-shadow/plugin.js']){
  const source=read(rel);
  assert(source.includes("units.layout.apply(analysis.body,{variant:'identity',geometry:{display:'grid',gridTemplateRows:'auto auto auto auto'"),'Sampling owner must use intrinsic auto grid rows so command content cannot flex-shrink under the RESULT header.');
  assert(source.includes("const commandSurface=units.layout.create(analysis.body,{variant:'identity',geometry:{display:'grid',gridTemplateRows:'auto auto'"),'Sampling command block must give extraction and result controls intrinsic auto rows.');
  assert(!source.includes("units.layout.apply(analysis.body,{variant:'stack'"),'Sampling Panel must not regress to a shrinkable flex-column owner.');
  assert(!source.includes("const commandSurface=units.layout.create(analysis.body,{variant:'stack-compact'"),'Sampling command block must not regress to min-height:0 flex geometry that can collapse below its children.');
  assert(source.includes("const resultHeader=units.header.create(analysis.body"),'RESULT heading must remain a sibling after the complete command block.');
}
const manifest=json('src/plugins/pulse-sampler-tool/plugin.json');
assert(Number(manifest.version.split('.').at(-1))>=26,'Pulse Sampler must retain the 1.9.26 intrinsic-row baseline or later.');
assert.deepStrictEqual(manifest.styles,[],'Pulse containment fix must remain CSS-free and Unit-owned.');
for(const [rel,expected] of Object.entries({
  'src/plugins/pulse-sampler-tool/live-domain.js':'a982b457b702b79d957f029cf2a403f9b180c5bd443f4172faf71f630f074d56',
  'src/plugins/pulse-sampler-tool/domain-adapter.js':'a7b7c038970dc10a3c530dd098167d03dc3796d1789792c7c1215bd4430e21ac',
  'src/plugins/pulse-sampler-tool/steady-state-task.js':'1132645c3509c04ec7ab11183cb6eebef9d5b678734a5b27700dcad27f5084d5'
}))assert.strictEqual(hash(rel),expected,`presentation-only containment repair changed protected Pulse owner: ${rel}`);
console.log('v3.71.49 Pulse Sampling intrinsic-row containment PASS');
