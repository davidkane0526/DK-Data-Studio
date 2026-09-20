'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const hash=rel=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,rel))).digest('hex');

const pkg=json('package.json');
assert(Number(pkg.version.split('.').at(-1))>=48,'v3.71.48 surface-containment guarantees must remain present on later 3.71.x patches.');

// Pulse: one Sampling Material owner. The command block is geometry-only and every
// nested responsive Unit measures the width actually allocated by the Sampling panel.
const pulse=read('src/plugins/pulse-sampler-tool/unit-presentation.js');
const pulseShadow=read('examples/sdk151-unit-pulse-sampler-shadow/plugin.js');
for(const source of [pulse,pulseShadow]){
  assert(source.includes("units.layout.apply(analysis.body,{variant:'identity',geometry:{display:'grid',gridTemplateRows:'auto auto auto auto'"),'Sampling Panel must content-size its complete child stack without a shrinkable flex owner.');
  assert(source.includes("const commandSurface=units.layout.create(analysis.body,{variant:'identity',geometry:{display:'grid',gridTemplateRows:'auto auto'"),'Sampling command block must be a geometry-only intrinsic-row Layout Unit.');
  assert(!source.includes('const commandSurface=units.panel.create'),'Sampling command block must not create a nested Material shadow/surface.');
  assert(source.includes("const extractionGrid=units.layout.create(commandSurface,{variant:'analysis-control-grid'"),'Extraction controls must use the public responsive Unit recipe.');
  assert(source.includes("const resultControls=units.layout.create(commandSurface,{variant:'result-control-grid'"),'Result actions must use the public responsive Unit recipe.');
  assert(source.includes("variant:'result-grid-asymmetric',geometry:{width:'100%',maxWidth:'100%',minWidth:'0'}"),'Result plot/table must remain contained by the owning Sampling Panel.');
  assert(!source.includes("variant:'analysis-control-grid',responsiveTarget:workspaceHost"),'Extraction controls must not measure the full workspace width.');
  assert(!source.includes("wide:true,responsiveTarget:workspaceHost"),'Wide source Field must not bypass its local responsive grid width.');
  assert(!source.includes("variant:'result-control-grid',responsiveTarget:workspaceHost"),'Result actions must not measure the full workspace width.');
  assert(!source.includes("variant:'result-grid-asymmetric',responsiveTarget:workspaceHost"),'Result plot/table must not measure the full workspace width.');
}
const pulseManifest=json('src/plugins/pulse-sampler-tool/plugin.json');
assert(Number(pulseManifest.version.split('.').at(-1))>=25,'Pulse Unit containment fixes must remain on the accepted 1.9.25+ line.');
assert.deepStrictEqual(pulseManifest.styles,[],'Pulse Unit presentation must remain free of plugin-private CSS.');

// Data Center: the Unit primary surface restores the accepted 12 px content inset,
// the source preview table binds into the existing panel instead of mounting a second
// Material surface, and the two wide home panels share one stretched row.
const dataCenter=read('src/plugins/data-center/unit-presentation.js');
const dataCenterShadow=read('examples/sdk151-unit-data-center-shadow/plugin.js');
const dataCenterCss=read('src/plugins/data-center/plugin.css');
assert(dataCenter.includes("geometry:{padding:'12px',boxSizing:'border-box',width:'100%',maxWidth:'100%'}"),'Data Center production Unit primary surface must retain the source-faithful outer inset without duplicating CSS-owned min-width geometry.');
assert(dataCenterShadow.includes("padding:'12px',boxSizing:'border-box',width:'100%',maxWidth:'100%',minWidth:'0'"),'Data Center shadow must exercise the same outer inset in its CSS-free composition.');
for(const source of [dataCenter,dataCenterShadow]){
  assert(source.includes('units.table.bind('),'Data Center preview must bind table behavior into its existing source Panel.');
  assert(!source.includes('units.table.mount('),'Data Center preview must not mount a second shadowed Table Surface inside the source Panel.');
}
assert(dataCenterCss.includes('align-items:stretch}'),'Wide Data Center tool/chart row must stretch paired panels to a common bottom edge.');
assert(dataCenterCss.includes('.dc-chart-pane[data-placement="home"]{grid-area:chart;align-self:stretch;'),'Home chart panel must participate in the stretched shared grid row.');
assert(/^1\.15\.(?:3[5-9]|[4-9]\d|\d{3,})$/.test(json('src/plugins/data-center/plugin.json').version),'Data Center surface-containment closure must remain available from 1.15.35 onward.');

// TER: Core dock slots intentionally remain edge-to-edge; the plugin's Unit primary
// composition owns its content inset. This preserves Core domain-blind ownership while
// restoring visible right-side breathing room.
const ter=read('src/plugins/ter-analysis/unit-presentation.js');
const terShadow=read('examples/sdk151-unit-ter-shadow/plugin.js');
assert(ter.includes("units.layout.apply(primaryMain,{variant:'identity',geometry:{padding:'12px',boxSizing:'border-box',width:'100%',maxWidth:'100%',minWidth:'0'}})"),'TER primary Unit composition must own the 12 px content inset.');
assert(terShadow.includes("geometry:{padding:'12px',boxSizing:'border-box',width:'100%',maxWidth:'100%',minWidth:'0'}"),'TER shadow must exercise the same public Unit inset.');
const terVersion=json('src/plugins/ter-analysis/plugin.json').version.split('.').map(Number);
assert(terVersion[0]===3&&terVersion[1]===14&&terVersion[2]>=3,'TER containment fixes must remain on the accepted 3.14.3+ line.');

// Presentation-only closure: Pulse production domain/numeric owners remain byte-identical.
assert.strictEqual(hash('src/plugins/pulse-sampler-tool/live-domain.js'),'a982b457b702b79d957f029cf2a403f9b180c5bd443f4172faf71f630f074d56');
assert.strictEqual(hash('src/plugins/pulse-sampler-tool/domain-adapter.js'),'a7b7c038970dc10a3c530dd098167d03dc3796d1789792c7c1215bd4430e21ac');
assert.strictEqual(hash('src/plugins/pulse-sampler-tool/steady-state-task.js'),'1132645c3509c04ec7ab11183cb6eebef9d5b678734a5b27700dcad27f5084d5');

const spec=require('../src/core/ui/modules/composition/unit-template-spec');
assert.strictEqual(Object.keys(spec.UNIT_CATALOG).length,41,'These fixes must not invent plugin-specific Units.');
console.log('v3.71.48 surface containment / spacing closure PASS');
