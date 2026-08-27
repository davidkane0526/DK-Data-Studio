'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const range=read('src/plugins/resonance-workbench/view-components.js');
assert(range.includes('<button id="resparRangeDetect">局部寻峰</button>'),'Range detect must use the neutral action family instead of raised primary hover paint.');
const resonanceCss=read('src/plugins/resonance-workbench/plugin.css');
assert(resonanceCss.includes('.respar-peak-legend span{display:inline-flex;align-items:center;gap:4px;white-space:nowrap;flex:0 0 auto}'),'Peak legend items must stay atomic and never wrap label numbers internally.');

const curve=read('src/core/ui/modules/scientific-curve/render.js');
assert(curve.includes("attr('class','dkds-scientific-width-band')"),'Core ScientificCurve must render the FWHM/measurement width band.');
assert(curve.includes("active?'is-focused':'is-dimmed'"),'Core ScientificCurve must expose focused/dimmed curve presentation state.');
const scientific=read('src/styles/presentation/scientific.css');
assert(scientific.includes('.dkds-group-plot-card :where(.dkds-plot-legend,.dkds-plot-legend-item,.dkds-plot-legend-swatch){box-shadow:none;}'),'GroupPlot legend chrome must remain shadow-free in every theme.');
assert(scientific.includes('.dkds-scientific-width-band{opacity:.065'),'FWHM width-band paint must be owned by scientific presentation.');
assert(scientific.includes('.dkds-scientific-curve.is-dimmed{opacity:.045'),'Dark scientific focus must strongly dim inactive curves.');
const structure=read('src/styles/structure/plugin-workspace.css');
assert(!/\.dkds-scientific-width-band\{[^}]*opacity:/.test(structure),'Structure CSS must not own width-band paint.');

const contract=read('src/styles/theme/contract.css');
const material=read('src/styles/theme/material-renderer.css');
assert(contract.includes('--dkui-selected-shadow:0 0 0 1px'),'Selected-state shadow must use a single centered rim plus halo, not a stacked 2px ring.');
assert(material.includes('box-shadow:var(--dkui-selected-shadow);'),'Theme material closure must preserve selected-mode shadow across profiles.');
const thin=read('src/core/theme/runtime.js');
for(const token of ["divider:'rgba(104,121,144,.14)'","controlBorder:'rgba(104,121,144,.22)'","glassEdge:'rgba(203,213,225,.30)'","divider:'rgba(100,116,139,.15)'","controlBorder:'rgba(100,116,139,.24)'"])assert(thin.includes(token),`Thin Glass low-line material hierarchy missing ${token}`);

const materialRuntime=read('src/core/theme/material-renderer.js');
assert(materialRuntime.includes("if(el?.matches?.('.dkds-portable-view'))return el.matches('.is-floating,.is-global-floating')?'floating':'surface'"),'Portable placement must take precedence over stale floating-panel semantic classes.');
console.log('v3.61.109 selection/measurement/theme regression passed.');
