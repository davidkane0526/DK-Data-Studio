'use strict';
const path=require('path');
const root=path.resolve(__dirname,'..');
const {ownerMap,duplicates}=require('./helpers/style-ownership');
const assert=require('assert');
const {files,text,owners}=ownerMap(root,'src/styles/presentation');
const fs=require('fs');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const semantic=read('src/core/theme/semantic-registry.js');
const renderer=read('src/styles/theme/material-renderer.css');
const scientific=text['scientific.css'];
for(const token of ['.trend-card','.analysis-chart-card','.dkds-group-plot-card'])
  assert(semantic.includes(token),`Core semantic material registry must cover scientific surface ${token}.`);
assert(!semantic.includes('.trend-card-legend'),'Trend legend is content inside the Trend Card and must not become a nested Material surface.');
for(const token of ['.trend-card-header','.analysis-chart-title','.dkds-group-plot-head'])
  assert(semantic.includes(token),`Core semantic chrome registry must cover scientific header ${token}.`);
assert(renderer.includes('Header-owned command wrappers are transparent composition only.'),'Material Renderer must own header/action composition for scientific chrome.');
assert(!/body\.dkds-modern-ui \.(?:trend-card|analysis-chart-card|dkds-group-plot-card)\s*\{[^}]*background:/s.test(scientific),'Presentation scientific CSS must not recreate canonical card Material paint.');
assert(semantic.includes('.dkds-portable-view.is-floating')&&semantic.includes('.floating-panel:not(.lan-web-panel):not(.update-panel):not([data-generic-panel])'),'Core semantic registry must own temporary floating surfaces.');
assert(!/body\.dkds-modern-ui \.floating-panel\s*\{[^}]*border-color\s*:\s*transparent/s.test(text['shell.css']),'Shell Presentation must not erase the Material Renderer floating perimeter.');
assert.equal(duplicates(owners).length,0,'Presentation ownership must remain duplicate-free.');
console.log(`v3.62 scientific surface ownership PASS: ${files.length} presentation modules, duplicate selectors=0.`);
