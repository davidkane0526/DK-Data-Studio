#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

const [major,minor,patch]=String(json('package.json').version||'0.0.0').split('.').map(Number);
assert(major>3||(major===3&&(minor>68||(minor===68&&patch>=7))),'Dense chart-control closure requires v3.68.7+.');

const schema=read('src/styles/structure/schema-and-plugin-ui.css');
const parameter=read('src/core/data/parameter-schema.js');
const components=read('src/core/ui/component-runtime.js');
const semantics=read('src/core/theme/semantic-registry.js');
const dc=read('src/plugins/data-center/feature-runtime.js');
const dcChart=read('src/plugins/data-center/chart-runtime.js');

// A compact auto-fit row is a short option strip, not a general form. Four
// chart controls must fit comfortably inside a roughly half-width desktop
// Surface and must not inherit 200+ px field tracks.
assert(/\.schema-parameter-panel\.auto-fit\.compact:not\(\.layout-host-owned\)\{[\s\S]*?grid-template-columns:var\(--dkds-parameter-auto-fit-compact-columns,repeat\(auto-fit,minmax\(96px,1fr\)\)\);[\s\S]*?gap:4px 6px/.test(schema),'Core-owned compact+autoFit must retain the dense 96 px minimum while later releases may stretch tracks to consume the available row.');
assert(/\.schema-parameter-panel\.auto-fit\.compact \.schema-param-field\{[\s\S]*?--dkds-field-control-min-height:26px;[\s\S]*?--dkds-field-control-padding-block:2px;[\s\S]*?--dkds-field-control-padding-inline:6px/.test(schema),'compact+autoFit must shrink the actual canonical field-control geometry.');
assert(schema.includes('.dkds-size-compact .schema-parameter-panel:not(.auto-fit):not(.layout-host-owned),')&&schema.includes('grid-template-columns:repeat(2,minmax(0,1fr))'),'Core-owned compact forms must retain two useful tracks instead of collapsing greedily by desktop size bucket.');
assert(schema.includes('@media(max-width:310px)')&&schema.includes('grid-template-columns:minmax(0,1fr)'),'Core-owned ordinary parameter forms may collapse to one column only at a genuinely tiny viewport.');
const dcUnits=read('src/plugins/data-center/unit-presentation.js');
assert(dc.includes("ctx.modules.require('chart-runtime')")&&dcChart.includes("compact:true,autoFit:true,layoutOwner:'host'")&&dcUnits.includes("className:'dc-chart-params',geometry:{display:'grid'"),'Data Center chart fields keep compact semantics while the enclosing generic Layout Unit is the sole four-track owner.');

// The Y-axis control is a popup proxy button for a multi-select. A button that
// is explicitly a field control must never be hydrated/inferred as a toolbar
// action, otherwise Component Appearance leaves it visually unstyled.
assert(parameter.includes("const trigger=$create('button','dkds-field-control dkds-multiselect-trigger')"),'ParameterSchema columns control must keep the canonical field-control proxy.');
assert(components.includes("scan('button:not(.dkds-field-control)'"),'Component hydration must exclude field-proxy buttons from toolbarAction identity.');
assert(components.includes("scan('input:not([type=\"checkbox\"]):not([type=\"radio\"]):not([type=\"range\"]),select,textarea,.dkds-field-control'"),'Component hydration must still assign field identity to field-control proxies.');
assert(semantics.includes("selector:'button:not(.dkds-field-control),.toolbar-btn"),'Semantic inference must exclude field controls from toolbarAction before hydration as well.');
assert(semantics.includes("selector:'input:not([type=\"checkbox\"]):not([type=\"radio\"]):not([type=\"range\"]),select,textarea,.dkds-field-control'"),'Semantic registry must retain dkds-field-control as canonical Field identity.');

console.log('v3.68.7 dense chart controls + multi-select field identity closure PASS');
