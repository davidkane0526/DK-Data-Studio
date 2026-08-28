'use strict';
const path=require('path');
const root=path.resolve(__dirname,'..');
const {ownerMap,duplicates}=require('./helpers/style-ownership');
const assert=require('assert');
const {files,text,owners}=ownerMap(root,'src/styles/presentation');
const scientificTargets=[
  'body.dkds-modern-ui .trend-card','body.dkds-modern-ui .analysis-chart-card','body.dkds-modern-ui .trend-card-header','body.dkds-modern-ui .analysis-chart-title',
  'body.dkds-modern-ui .trend-card-legend','body.dkds-modern-ui .trend-legend-chip','body.dkds-modern-ui .dkds-group-plot-card','body.dkds-modern-ui .dkds-group-plot-head'
];
for(const target of scientificTargets){
  const names=owners.get(target)||new Set();
  assert(names.size===1&&names.has('scientific.css'),`scientific.css must exclusively own ${target}; got ${[...names].join(', ')||'none'}.`);
}
for(const token of ['background:var(--surface-primary)','background:var(--surface-secondary)','border-color:var(--border-subtle)','box-shadow:var(--surface-shadow)'])assert(text['scientific.css'].includes(token),`Scientific surface contract is missing ${token}.`);
for(const target of ['body.dkds-modern-ui .floating-panel','body.dkds-modern-ui .floating-header']){
  const names=owners.get(target)||new Set();
  assert(names.size===1&&names.has('shell.css'),`shell.css must exclusively own ${target}.`);
}
assert(/body\.dkds-modern-ui \.floating-panel\s*\{[^}]*outline\s*:\s*0\s*;[^}]*border-color\s*:\s*transparent\s*;?[^}]*\}/s.test(text['shell.css']),'Floating-panel perimeter must remain visually quiet in the final scoped Shell rule.');
assert(text['shell.css'].includes('background:var(--surface-secondary)'),'Floating-header paint must use semantic theme surfaces.');
assert.equal(duplicates(owners).length,0,'Presentation ownership must remain duplicate-free.');
console.log(`v3.62 scientific surface ownership PASS: ${files.length} presentation modules, duplicate selectors=0.`);
